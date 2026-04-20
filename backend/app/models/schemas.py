from pydantic import BaseModel
from enum import Enum
from datetime import datetime


# ── Account Types ──────────────────────────────────────────────
class AccountType(str, Enum):
    DIRECT_EA = "direct_ea"
    INDIRECT_EA = "indirect_ea"
    WEB_DIRECT = "web_direct"
    CSP = "csp"
    UNKNOWN = "unknown"


# ── Migration Difficulty ───────────────────────────────────────
class MigrationDifficulty(str, Enum):
    EASY = "easy"              # Direct transfer possible
    MODERATE = "moderate"      # Some reconfiguration needed
    HARD = "hard"              # Requires redeploy / recreation
    NOT_SUPPORTED = "not_supported"  # Cannot migrate to CSP
    NEEDS_REVIEW = "needs_review"    # Manual review required


# ── Auth ───────────────────────────────────────────────────────
class UserInfo(BaseModel):
    name: str
    email: str
    tenant_id: str
    object_id: str


class TokenResponse(BaseModel):
    access_token: str
    user: UserInfo


# ── Subscription ───────────────────────────────────────────────
class SubscriptionInfo(BaseModel):
    subscription_id: str
    display_name: str
    state: str
    tenant_id: str
    offer_type: str | None = None
    account_type: AccountType = AccountType.UNKNOWN


# ── Resource ───────────────────────────────────────────────────
class ResourceInfo(BaseModel):
    id: str
    name: str
    type: str
    location: str
    resource_group: str
    subscription_id: str
    tags: dict[str, str] | None = None
    sku: str | None = None
    kind: str | None = None


# ── Assessment Result ──────────────────────────────────────────
class ResourceAssessment(BaseModel):
    resource: ResourceInfo
    difficulty: MigrationDifficulty
    reason: str
    recommendations: list[str]
    risks: list[str]
    estimated_downtime: str | None = None


class SubscriptionAssessment(BaseModel):
    subscription: SubscriptionInfo
    account_type: AccountType
    total_resources: int
    easy_count: int
    moderate_count: int
    hard_count: int
    not_supported_count: int
    needs_review_count: int
    resource_assessments: list[ResourceAssessment]


class AssessmentReport(BaseModel):
    report_id: str
    generated_at: datetime
    tenant_id: str
    user_email: str
    subscriptions: list[SubscriptionAssessment]
    summary: "ReportSummary"


class ReportSummary(BaseModel):
    total_subscriptions: int
    total_resources: int
    easy_count: int
    moderate_count: int
    hard_count: int
    not_supported_count: int
    needs_review_count: int
    overall_readiness_score: float  # 0-100
    key_findings: list[str]
    recommendations: list[str]
