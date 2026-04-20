from azure.mgmt.resource import ResourceManagementClient
from azure.mgmt.subscription import SubscriptionClient
from azure.mgmt.billing import BillingManagementClient
from azure.core.credentials import AccessToken

from app.models.schemas import (
    SubscriptionInfo,
    ResourceInfo,
    AccountType,
)


class _TokenCredential:
    """Wrap a raw access token string as an Azure credential."""

    def __init__(self, token: str):
        self._token = token

    def get_token(self, *scopes, **kwargs) -> AccessToken:
        # Token expires in 1h; we don't track expiry here
        return AccessToken(self._token, 0)


async def list_subscriptions(access_token: str) -> list[SubscriptionInfo]:
    """List all subscriptions the user has access to."""
    credential = _TokenCredential(access_token)
    client = SubscriptionClient(credential)

    subscriptions = []
    for sub in client.subscriptions.list():
        info = SubscriptionInfo(
            subscription_id=sub.subscription_id,
            display_name=sub.display_name or "",
            state=sub.state or "Unknown",
            tenant_id=sub.tenant_id or "",
        )
        subscriptions.append(info)

    return subscriptions


async def detect_account_type(
    access_token: str, subscription_id: str
) -> AccountType:
    """
    Detect subscription billing account type.
    Uses the Billing API to determine EA / Web Direct / CSP.
    """
    credential = _TokenCredential(access_token)

    try:
        billing_client = BillingManagementClient(credential)

        # Try to list billing accounts
        for account in billing_client.billing_accounts.list():
            agreement_type = getattr(account, "agreement_type", None)
            if agreement_type == "EnterpriseAgreement":
                # Check if it's direct or indirect
                # Direct EA: the org is the direct customer
                # Indirect EA: through a partner
                properties = getattr(account, "properties", None)
                if properties:
                    has_partner = getattr(
                        properties, "sold_to", None
                    ) or getattr(properties, "has_read_access", None)
                else:
                    has_partner = False

                # Heuristic: if enrollment has partner info, it's indirect
                enrollment_details = getattr(account, "enrollment_details", None)
                if enrollment_details:
                    indirect_relationship = getattr(
                        enrollment_details, "indirect_relationship_info", None
                    )
                    if indirect_relationship:
                        return AccountType.INDIRECT_EA
                return AccountType.DIRECT_EA

            elif agreement_type == "MicrosoftCustomerAgreement":
                return AccountType.WEB_DIRECT

            elif agreement_type == "MicrosoftPartnerAgreement":
                return AccountType.CSP

        # Fallback: check subscription offer ID via REST
        return await _detect_by_offer_id(access_token, subscription_id)

    except Exception:
        return await _detect_by_offer_id(access_token, subscription_id)


async def _detect_by_offer_id(
    access_token: str, subscription_id: str
) -> AccountType:
    """Fallback: detect account type using the subscription's offer ID."""
    import httpx

    url = (
        f"https://management.azure.com/subscriptions/{subscription_id}"
        f"?api-version=2022-12-01"
    )
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            url, headers={"Authorization": f"Bearer {access_token}"}
        )
        if resp.status_code != 200:
            return AccountType.UNKNOWN

        data = resp.json()
        sub_policies = data.get("subscriptionPolicies", {})
        spending_limit = sub_policies.get("spendingLimit")
        quota_id = sub_policies.get("quotaId", "")

        # EA patterns
        if "EnterpriseAgreement" in quota_id or quota_id.startswith("EA_"):
            return AccountType.DIRECT_EA

        # Pay-as-you-go / Web Direct
        if "PayAsYouGo" in quota_id or quota_id.startswith("PayAsYouGo"):
            return AccountType.WEB_DIRECT

        # CSP
        if "CSP" in quota_id:
            return AccountType.CSP

        return AccountType.UNKNOWN


async def list_resources(
    access_token: str, subscription_id: str
) -> list[ResourceInfo]:
    """List all resources in a subscription."""
    credential = _TokenCredential(access_token)
    client = ResourceManagementClient(credential, subscription_id)

    resources = []
    for res in client.resources.list():
        info = ResourceInfo(
            id=res.id or "",
            name=res.name or "",
            type=res.type or "",
            location=res.location or "",
            resource_group=_extract_rg(res.id or ""),
            subscription_id=subscription_id,
            tags=res.tags,
            sku=getattr(res.sku, "name", None) if res.sku else None,
            kind=res.kind,
        )
        resources.append(info)

    return resources


def _extract_rg(resource_id: str) -> str:
    """Extract resource group name from a resource ID."""
    parts = resource_id.split("/")
    for i, part in enumerate(parts):
        if part.lower() == "resourcegroups" and i + 1 < len(parts):
            return parts[i + 1]
    return ""
