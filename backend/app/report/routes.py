from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, Response

from app.auth.azure_auth import get_access_token, get_user_info
from app.azure_resources.resource_scanner import (
    list_subscriptions,
    list_resources,
    detect_account_type,
)
from app.assessment.engine import assess_subscription, generate_report
from app.report.generator import render_html_report, render_pdf_report
from app.models.schemas import AccountType

router = APIRouter()


async def _build_report(request: Request, body: dict | None = None):
    """Shared helper: run assessment and build report object."""
    token = get_access_token(request)
    user = get_user_info(request)

    body = body or {}
    filter_subs = body.get("subscription_ids")
    overrides = body.get("account_type_overrides", {})

    all_subs = await list_subscriptions(token)
    if filter_subs:
        all_subs = [s for s in all_subs if s.subscription_id in filter_subs]

    sub_assessments = []
    for sub in all_subs:
        override = overrides.get(sub.subscription_id)
        account_type = AccountType(override) if override else await detect_account_type(token, sub.subscription_id)
        sub.account_type = account_type
        resources = await list_resources(token, sub.subscription_id)
        assessment = assess_subscription(sub, resources, account_type)
        sub_assessments.append(assessment)

    return generate_report(
        sub_assessments,
        tenant_id=user.get("tenant_id", ""),
        user_email=user.get("email", ""),
    )


@router.post("/html")
async def get_html_report(request: Request, body: dict | None = None):
    """Generate and return the assessment report as HTML."""
    report = await _build_report(request, body)
    html = render_html_report(report)
    return HTMLResponse(content=html)


@router.post("/pdf")
async def get_pdf_report(request: Request, body: dict | None = None):
    """Generate and return the assessment report as PDF."""
    report = await _build_report(request, body)
    pdf_bytes = render_pdf_report(report)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=csp-assessment-{report.report_id[:8]}.pdf"
        },
    )


@router.post("/json")
async def get_json_report(request: Request, body: dict | None = None):
    """Generate and return the assessment report as JSON."""
    report = await _build_report(request, body)
    return report.model_dump()
