"""
Assessment Engine — evaluates Azure resources for CSP migration readiness.
"""

import uuid
from datetime import datetime, timezone

from app.models.schemas import (
    AccountType,
    MigrationDifficulty,
    ResourceInfo,
    ResourceAssessment,
    SubscriptionInfo,
    SubscriptionAssessment,
    AssessmentReport,
    ReportSummary,
)
from app.assessment.rules import RESOURCE_RULES, ACCOUNT_TYPE_NOTES


def assess_resource(resource: ResourceInfo, account_type: AccountType) -> ResourceAssessment:
    """Assess a single resource for CSP migration."""
    resource_type = resource.type.lower()

    rule = RESOURCE_RULES.get(resource_type)

    if rule:
        difficulty = rule["difficulty"]
        reason = rule["reason"]
        recommendations = list(rule["recommendations"])
        risks = list(rule["risks"])
        downtime = rule.get("downtime")
    else:
        # Unknown resource type — flag for review
        difficulty = MigrationDifficulty.NEEDS_REVIEW
        reason = f"No predefined migration rule for '{resource.type}'. Manual review required."
        recommendations = [
            "Check Azure documentation for CSP support status",
            "Test resource behavior after subscription transfer in a staging environment",
        ]
        risks = [
            "Resource behavior after CSP transfer is unknown",
        ]
        downtime = "Unknown"

    # Apply account-type-specific adjustments
    recommendations = _apply_account_type_adjustments(
        recommendations, account_type, resource
    )

    # Check for marketplace / third-party indicators
    if resource.kind and "marketplace" in resource.kind.lower():
        difficulty = MigrationDifficulty.NOT_SUPPORTED
        reason = "Marketplace resource — may not be available under CSP."
        recommendations.append("Contact vendor about CSP marketplace availability")

    return ResourceAssessment(
        resource=resource,
        difficulty=difficulty,
        reason=reason,
        recommendations=recommendations,
        risks=risks,
        estimated_downtime=downtime,
    )


def assess_subscription(
    subscription: SubscriptionInfo,
    resources: list[ResourceInfo],
    account_type: AccountType,
) -> SubscriptionAssessment:
    """Assess all resources in a subscription."""
    assessments = [assess_resource(r, account_type) for r in resources]

    counts = {d: 0 for d in MigrationDifficulty}
    for a in assessments:
        counts[a.difficulty] += 1

    return SubscriptionAssessment(
        subscription=subscription,
        account_type=account_type,
        total_resources=len(resources),
        easy_count=counts[MigrationDifficulty.EASY],
        moderate_count=counts[MigrationDifficulty.MODERATE],
        hard_count=counts[MigrationDifficulty.HARD],
        not_supported_count=counts[MigrationDifficulty.NOT_SUPPORTED],
        needs_review_count=counts[MigrationDifficulty.NEEDS_REVIEW],
        resource_assessments=assessments,
    )


def generate_report(
    subscription_assessments: list[SubscriptionAssessment],
    tenant_id: str,
    user_email: str,
) -> AssessmentReport:
    """Generate the full assessment report."""
    total_resources = sum(sa.total_resources for sa in subscription_assessments)
    easy = sum(sa.easy_count for sa in subscription_assessments)
    moderate = sum(sa.moderate_count for sa in subscription_assessments)
    hard = sum(sa.hard_count for sa in subscription_assessments)
    not_supported = sum(sa.not_supported_count for sa in subscription_assessments)
    needs_review = sum(sa.needs_review_count for sa in subscription_assessments)

    # Calculate readiness score (0-100)
    if total_resources > 0:
        weighted = (
            easy * 100
            + moderate * 70
            + hard * 30
            + not_supported * 0
            + needs_review * 50
        )
        readiness_score = round(weighted / total_resources, 1)
    else:
        readiness_score = 100.0

    key_findings = _generate_key_findings(subscription_assessments)
    recommendations = _generate_recommendations(subscription_assessments)

    summary = ReportSummary(
        total_subscriptions=len(subscription_assessments),
        total_resources=total_resources,
        easy_count=easy,
        moderate_count=moderate,
        hard_count=hard,
        not_supported_count=not_supported,
        needs_review_count=needs_review,
        overall_readiness_score=readiness_score,
        key_findings=key_findings,
        recommendations=recommendations,
    )

    return AssessmentReport(
        report_id=str(uuid.uuid4()),
        generated_at=datetime.now(timezone.utc),
        tenant_id=tenant_id,
        user_email=user_email,
        subscriptions=subscription_assessments,
        summary=summary,
    )


def _apply_account_type_adjustments(
    recommendations: list[str],
    account_type: AccountType,
    resource: ResourceInfo,
) -> list[str]:
    """Add account-type-specific recommendations."""
    notes = ACCOUNT_TYPE_NOTES.get(account_type, {})
    special = notes.get("special_considerations", [])

    # Add RI warning for VMs under EA
    if (
        account_type in (AccountType.DIRECT_EA, AccountType.INDIRECT_EA)
        and "virtualmachines" in resource.type.lower()
    ):
        recommendations.append(
            "Check if this VM is covered by a Reserved Instance — RIs must be consumed before transfer"
        )

    return recommendations


def _generate_key_findings(
    assessments: list[SubscriptionAssessment],
) -> list[str]:
    """Generate key findings for the executive summary."""
    findings = []
    total = sum(a.total_resources for a in assessments)

    if total == 0:
        return ["No resources found in the assessed subscriptions."]

    easy_pct = sum(a.easy_count for a in assessments) / total * 100
    findings.append(
        f"{easy_pct:.0f}% of resources ({sum(a.easy_count for a in assessments)}/{total}) "
        f"can be transferred directly with no downtime."
    )

    hard_total = sum(a.hard_count for a in assessments)
    if hard_total > 0:
        findings.append(
            f"{hard_total} resource(s) require redeployment or recreation in the CSP subscription."
        )

    not_supported_total = sum(a.not_supported_count for a in assessments)
    if not_supported_total > 0:
        findings.append(
            f"{not_supported_total} resource(s) are not supported under CSP and need alternative solutions."
        )

    needs_review_total = sum(a.needs_review_count for a in assessments)
    if needs_review_total > 0:
        findings.append(
            f"{needs_review_total} resource(s) require manual review by a solutions architect."
        )

    # Check for ExpressRoute
    for a in assessments:
        for ra in a.resource_assessments:
            if "expressroute" in ra.resource.type.lower():
                findings.append(
                    "ExpressRoute circuit detected — requires dedicated migration planning with provider."
                )
                break

    # Account type insights
    for a in assessments:
        notes = ACCOUNT_TYPE_NOTES.get(a.account_type, {})
        if notes.get("special_considerations"):
            findings.append(
                f"Subscription '{a.subscription.display_name}' is {a.account_type.value}: "
                f"{notes['estimated_complexity']} transfer complexity."
            )

    return findings


def _generate_recommendations(
    assessments: list[SubscriptionAssessment],
) -> list[str]:
    """Generate overall migration recommendations."""
    recs = [
        "Create a detailed migration timeline with stakeholder sign-off",
        "Set up a parallel CSP subscription for testing before full transfer",
        "Document all RBAC role assignments before transfer — they will need re-creation",
        "Plan Reserved Instance strategy: consume, cancel, or repurchase under CSP",
    ]

    has_expressroute = any(
        "expressroute" in ra.resource.type.lower()
        for a in assessments
        for ra in a.resource_assessments
    )
    if has_expressroute:
        recs.append(
            "Schedule ExpressRoute migration during maintenance window with connectivity provider"
        )

    has_marketplace = any(
        ra.difficulty == MigrationDifficulty.NOT_SUPPORTED
        for a in assessments
        for ra in a.resource_assessments
    )
    if has_marketplace:
        recs.append(
            "Identify CSP marketplace alternatives for unsupported SaaS resources"
        )

    for a in assessments:
        if a.account_type == AccountType.INDIRECT_EA:
            recs.append(
                "Coordinate with current EA partner for enrollment release timeline"
            )
            break

    recs.append(
        "Perform a trial subscription transfer in a non-production environment first"
    )

    return recs
