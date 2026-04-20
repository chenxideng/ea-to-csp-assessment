from fastapi import APIRouter, Request
from app.auth.azure_auth import get_access_token
from app.azure_resources.resource_scanner import (
    list_subscriptions,
    list_resources,
    detect_account_type,
)
from app.models.schemas import AccountType

router = APIRouter()


@router.get("/subscriptions")
async def get_subscriptions(request: Request):
    """List all Azure subscriptions."""
    token = get_access_token(request)
    subs = await list_subscriptions(token)
    return {"subscriptions": [s.model_dump() for s in subs]}


@router.get("/subscriptions/{subscription_id}/resources")
async def get_resources(subscription_id: str, request: Request):
    """List all resources in a subscription."""
    token = get_access_token(request)
    resources = await list_resources(token, subscription_id)
    return {
        "subscription_id": subscription_id,
        "total": len(resources),
        "resources": [r.model_dump() for r in resources],
    }


@router.get("/subscriptions/{subscription_id}/account-type")
async def get_account_type(subscription_id: str, request: Request):
    """Detect the billing account type for a subscription."""
    token = get_access_token(request)
    account_type = await detect_account_type(token, subscription_id)
    return {
        "subscription_id": subscription_id,
        "account_type": account_type.value,
        "description": _account_type_description(account_type),
    }


def _account_type_description(account_type: AccountType) -> str:
    descriptions = {
        AccountType.DIRECT_EA: "Direct Enterprise Agreement - Microsoft is the direct billing partner",
        AccountType.INDIRECT_EA: "Indirect Enterprise Agreement - Billing through a partner/reseller",
        AccountType.WEB_DIRECT: "Web Direct (Pay-As-You-Go / MCA) - Purchased directly via Azure portal",
        AccountType.CSP: "Cloud Solution Provider - Already under CSP billing",
        AccountType.UNKNOWN: "Unable to determine account type",
    }
    return descriptions.get(account_type, "Unknown")
