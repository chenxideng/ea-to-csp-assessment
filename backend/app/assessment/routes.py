from fastapi import APIRouter, Request
from app.auth.azure_auth import get_access_token, get_user_info
from app.azure_resources.resource_scanner import (
    list_subscriptions,
    list_resources,
    detect_account_type,
)
from app.assessment.engine import assess_subscription, generate_report
from app.models.schemas import AccountType

router = APIRouter()


@router.post("/run")
async def run_assessment(request: Request, body: dict | None = None):
    """
    Run CSP migration assessment.

    Body (optional):
      {
        "subscription_ids": ["sub-id-1", "sub-id-2"],
        "account_type_overrides": {"sub-id-1": "indirect_ea"}
      }
    """
    token = get_access_token(request)
    user = get_user_info(request)

    body = body or {}
    filter_subs = body.get("subscription_ids")
    account_type_overrides = body.get("account_type_overrides", {})

    # 1. List subscriptions
    all_subs = await list_subscriptions(token)
    if filter_subs:
        all_subs = [s for s in all_subs if s.subscription_id in filter_subs]

    # 2. For each subscription: detect type, list resources, assess
    sub_assessments = []
    for sub in all_subs:
        # Detect or override account type
        override = account_type_overrides.get(sub.subscription_id)
        if override:
            account_type = AccountType(override)
        else:
            account_type = await detect_account_type(token, sub.subscription_id)

        sub.account_type = account_type

        # List resources
        resources = await list_resources(token, sub.subscription_id)

        # Assess
        assessment = assess_subscription(sub, resources, account_type)
        sub_assessments.append(assessment)

    # 3. Generate report
    report = generate_report(
        sub_assessments,
        tenant_id=user.get("tenant_id", ""),
        user_email=user.get("email", ""),
    )

    return report.model_dump()


@router.post("/assess-single/{subscription_id}")
async def assess_single_subscription(
    subscription_id: str,
    request: Request,
    body: dict | None = None,
):
    """Assess a single subscription."""
    token = get_access_token(request)
    body = body or {}

    # Detect account type
    override = body.get("account_type")
    if override:
        account_type = AccountType(override)
    else:
        account_type = await detect_account_type(token, subscription_id)

    # Get subscription info
    all_subs = await list_subscriptions(token)
    sub = next(
        (s for s in all_subs if s.subscription_id == subscription_id),
        None,
    )
    if not sub:
        return {"error": f"Subscription {subscription_id} not found"}

    sub.account_type = account_type

    # List and assess
    resources = await list_resources(token, subscription_id)
    assessment = assess_subscription(sub, resources, account_type)

    return assessment.model_dump()
