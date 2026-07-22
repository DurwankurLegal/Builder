from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Any
from datetime import datetime

# ========================================================
# AUTH & USER SCHEMAS
# ========================================================

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Any
    force_password_change: bool = False

class TokenPayload(BaseModel):
    sub: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str
    tenant_code: Optional[str] = "tenant-1"

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: Optional[str] = "Sales Executive"

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    is_active: bool

    class Config:
        from_attributes = True


# ========================================================
# USER ACCOUNT MANAGEMENT SCHEMAS
# ========================================================

class AdminUserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8)
    role: str = "Sales Executive"
    is_active: bool = True
    force_password_change: bool = True

class AdminUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class PasswordResetRequest(BaseModel):
    new_password: str = Field(min_length=8)
    force_password_change: bool = True

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)

class ForcePasswordChangeRequest(BaseModel):
    force_password_change: bool = True

class AdminUserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    is_active: bool
    is_locked: bool = False
    force_password_change: bool = False
    failed_login_attempts: int = 0
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

class TenantUserGroup(BaseModel):
    tenant_id: str
    tenant_name: str
    users: List[AdminUserResponse]


# ========================================================
# LEAD SCHEMAS
# ========================================================

class LeadCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    project: str
    budget: str
    source: str
    executive: str

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    project: Optional[str] = None
    budget: Optional[str] = None
    source: Optional[str] = None
    executive: Optional[str] = None
    status: Optional[str] = None
    remarks: Optional[List[Any]] = None
    history: Optional[List[Any]] = None

class LeadResponse(BaseModel):
    id: str
    date: str
    name: str
    email: EmailStr
    phone: str
    project: str
    budget: str
    source: str
    executive: str
    status: str
    remarks: List[Any]
    history: List[Any]

    class Config:
        from_attributes = True


# ========================================================
# PIPELINE LEAD SCHEMAS (Raw / Called / Qualified modules)
# ========================================================

class PipelineLeadCreate(BaseModel):
    name: str
    phone: str
    email: EmailStr
    source: str
    project: str
    budget: Optional[str] = None
    # Target module for direct manual entry (raw | called | qualified)
    stage: Optional[str] = "raw"
    # Called Leads module-specific fields
    interest_status: Optional[str] = None
    # Qualified Leads module-specific fields
    contacted_by: Optional[str] = None
    remarks: Optional[str] = None
    site_visit_status: Optional[str] = None
    loan_requirement: Optional[str] = None
    next_followup_date: Optional[str] = None

class PipelineLeadUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    source: Optional[str] = None
    project: Optional[str] = None
    budget: Optional[str] = None
    status: Optional[str] = None
    interest_status: Optional[str] = None
    contacted_by: Optional[str] = None
    remarks: Optional[str] = None
    site_visit_status: Optional[str] = None
    loan_requirement: Optional[str] = None
    next_followup_date: Optional[str] = None

class PipelineLeadResponse(BaseModel):
    id: str
    date: str
    name: str
    phone: str
    email: str
    source: str
    project: str
    budget: Optional[str] = None
    stage: str
    status: str
    interest_status: Optional[str] = None
    called_at: Optional[str] = None
    call_duration: Optional[str] = None
    ai_outcome: Optional[str] = None
    ai_summary: Optional[str] = None
    ai_confidence: Optional[float] = None
    recording_available: bool = False
    call_attempts: int = 0
    last_call_attempt: Optional[str] = None
    call_recording_url: Optional[str] = None
    ai_notes: Optional[str] = None
    disposition: Optional[str] = None
    lead_temperature: Optional[str] = None
    dispatch_correlation_id: Optional[str] = None
    dispatched_at: Optional[str] = None
    callback_received_at: Optional[str] = None
    contacted_by: Optional[str] = None
    remarks: Optional[str] = None
    site_visit_status: Optional[str] = None
    loan_requirement: Optional[str] = None
    next_followup_date: Optional[str] = None
    linked_record_id: Optional[str] = None
    history: List[Any]

    class Config:
        from_attributes = True

class PipelineLeadPage(BaseModel):
    items: List[PipelineLeadResponse]
    total: int
    page: int
    pages: int

class PipelineStats(BaseModel):
    raw: int
    called: int
    qualified: int

class BulkMoveRequest(BaseModel):
    ids: List[str]
    target: str  # called, qualified, rejected, database, customer

class BulkMoveResult(BaseModel):
    moved: int
    skipped: int
    detail: str

class ImportBatchResponse(BaseModel):
    id: int
    date: datetime
    filename: str
    total_rows: int
    imported: int
    duplicates: int
    errors: int
    uploaded_by: str

    class Config:
        from_attributes = True

_HHMM = r"^([01]\d|2[0-3]):[0-5]\d$"  # 24h HH:MM

class LeadSettingResponse(BaseModel):
    dup_check_phone: bool
    dup_check_email: bool
    ai_calling_enabled: bool
    ai_call_interval_seconds: int
    ai_retry_limit: int
    ai_batch_size: int
    ai_provider: str = "hirebuddha"
    hb_client_id: Optional[str] = None
    hb_entity_id: Optional[str] = None
    calling_mode: str = "automatic"
    max_call_duration_seconds: int = 300
    call_window_start: str = "09:00"
    call_window_end: str = "19:00"

    class Config:
        from_attributes = True

class LeadSettingUpdate(BaseModel):
    dup_check_phone: Optional[bool] = None
    dup_check_email: Optional[bool] = None
    ai_calling_enabled: Optional[bool] = None
    ai_call_interval_seconds: Optional[int] = None
    ai_retry_limit: Optional[int] = None
    ai_batch_size: Optional[int] = Field(default=None, ge=1, le=100)  # Leads per Cycle
    ai_provider: Optional[str] = Field(default=None, pattern="^(simulation|hirebuddha)$")
    hb_client_id: Optional[str] = None
    hb_entity_id: Optional[str] = None
    calling_mode: Optional[str] = Field(default=None, pattern="^(automatic|manual)$")
    max_call_duration_seconds: Optional[int] = Field(default=None, ge=30, le=3600)
    call_window_start: Optional[str] = Field(default=None, pattern=_HHMM)
    call_window_end: Optional[str] = Field(default=None, pattern=_HHMM)

class ManualCallRequest(BaseModel):
    """Manual-mode: the specific pipeline lead ids to dial now."""
    ids: List[str] = Field(min_length=1)

class ManualCallResult(BaseModel):
    dispatched: int
    skipped: int
    detail: str

class AICallResult(BaseModel):
    lead_id: str
    success: bool
    interest_status: Optional[str] = None   # Interested / Not Interested
    duration_seconds: Optional[int] = None
    outcome: Optional[str] = None
    summary: Optional[str] = None
    confidence: Optional[float] = None
    budget: Optional[str] = None


# ========================================================
# HIREBUDDHA INTEGRATION SCHEMAS (CRM Update API + audit)
# ========================================================

# Documented call outcomes (HireBuddha Integration Guide v1.0)
HIREBUDDHA_OUTCOMES = {
    "interested", "not_interested", "callback_requested",
    "no_answer", "busy", "invalid_number",
}
HIREBUDDHA_TEMPERATURES = {"hot", "warm", "cold"}


class HireBuddhaCallback(BaseModel):
    """
    Payload HireBuddha posts to the CRM Update API after every AI call.
    Strictly validated against the documented v1.0 contract; unknown extra
    fields are ignored, undocumented enum values are rejected with a 422.
    """
    lead_id: Optional[str] = None                 # must match the URL path when present
    call_status: str = "completed"
    call_outcome: str
    call_summary: Optional[str] = None
    ai_notes: Optional[str] = None                # AI-generated notes (optional extension)
    call_duration: Optional[int | str] = None     # seconds, or preformatted "3m 20s"
    call_recording_url: Optional[str] = None
    recording_url: Optional[str] = None           # tolerated alias for call_recording_url
    next_action: Optional[str] = None
    next_action_date: Optional[str] = None        # ISO-8601
    lead_temperature: Optional[str] = None        # hot / warm / cold
    updated_at: Optional[str] = None              # ISO-8601
    updated_by: Optional[str] = "hirebuddha_agent"

    @field_validator("call_outcome")
    @classmethod
    def outcome_documented(cls, v: str) -> str:
        value = (v or "").strip().lower()
        if value not in HIREBUDDHA_OUTCOMES:
            raise ValueError(f"call_outcome must be one of {sorted(HIREBUDDHA_OUTCOMES)}")
        return value

    @field_validator("lead_temperature")
    @classmethod
    def temperature_documented(cls, v: Optional[str]) -> Optional[str]:
        if v is None or not str(v).strip():
            return None
        value = str(v).strip().lower()
        if value not in HIREBUDDHA_TEMPERATURES:
            raise ValueError(f"lead_temperature must be one of {sorted(HIREBUDDHA_TEMPERATURES)}")
        return value


# ========================================================
# FOLLOW-UPS SCHEMAS
# ========================================================

class FollowUpCreate(BaseModel):
    client: str = Field(min_length=2, max_length=255)
    activity: str = Field(min_length=3, max_length=500)
    date: str  # YYYY-MM-DD; must not be in the past (validated in the router)
    executive: Optional[str] = None  # defaults to the creating user
    task_type: str = Field(default="Call", pattern="^(Call|Meeting|Site Visit|Document)$")

class FollowUpResponse(BaseModel):
    id: int
    client: str
    activity: str
    date: str
    executive: str
    task_type: str
    status: str
    created_by: str

    class Config:
        from_attributes = True


# ========================================================
# WORKSPACE SETTINGS SCHEMAS
# ========================================================

class WorkspaceSettingResponse(BaseModel):
    company: dict = {}
    projects: List[Any] = []
    channels: List[Any] = []
    updated_by: Optional[str] = None

    class Config:
        from_attributes = True

class WorkspaceSettingUpdate(BaseModel):
    company: Optional[dict] = None
    projects: Optional[List[Any]] = None
    channels: Optional[List[Any]] = None


# ========================================================
# REPORTS / ANALYTICS SCHEMAS
# ========================================================

class ReportSummary(BaseModel):
    total_leads: int
    active_customers: int
    deals_closed: int
    deals_lost: int
    followups_today: int
    pending_site_visits: int
    monthly_sales_value: float          # ₹, bookings created this calendar month
    booking_portfolio_value: float      # ₹, all bookings
    monthly_sales: List[Any]            # [{month, bookings, value_cr}]
    lead_sources: List[Any]             # [{name, value}] counts across leads + pipeline
    executive_performance: List[Any]    # [{name, deals, pipeline}]

class NotificationItem(BaseModel):
    type: str      # lead, followup, payment
    title: str
    detail: str
    date: Optional[str] = None


class IntegrationLogResponse(BaseModel):
    id: int
    date: datetime
    provider: str
    direction: str
    endpoint: str
    lead_id: Optional[str] = None
    request_payload: Any = None
    response_payload: Any = None
    status_code: Optional[int] = None
    outcome: str
    error: Optional[str] = None
    attempt: int = 1

    class Config:
        from_attributes = True


# ========================================================
# CUSTOMER SCHEMAS
# ========================================================

class CustomerCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    address: str
    project: str
    budget: str
    executive: str
    status: str
    allocated_unit: Optional[str] = None
    config: Optional[str] = None
    area: Optional[str] = None
    floor: Optional[str] = None
    notes: Optional[str] = None
    documents: Optional[List[str]] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    project: Optional[str] = None
    budget: Optional[str] = None
    executive: Optional[str] = None
    status: Optional[str] = None
    allocated_unit: Optional[str] = None
    config: Optional[str] = None
    notes: Optional[str] = None
    documents: Optional[List[str]] = None
    history: Optional[List[Any]] = None

class CustomerResponse(BaseModel):
    id: str
    lead_id: Optional[str] = None
    name: str
    email: EmailStr
    phone: str
    address: str
    project: str
    budget: str
    executive: str
    status: str
    allocated_unit: Optional[str] = None
    config: Optional[str] = None
    area: Optional[str] = None
    floor: Optional[str] = None
    notes: Optional[str] = None
    documents: List[str]
    history: List[Any]

    class Config:
        from_attributes = True


# ========================================================
# BOOKING SCHEMAS
# ========================================================

class BookingUpdate(BaseModel):
    agreement_status: Optional[str] = None
    registration_status: Optional[str] = None
    milestones: Optional[List[Any]] = None

class BookingResponse(BaseModel):
    bookingNo: str
    customer_id: str
    customer_name: str
    project: str
    unit_no: str
    slab_area: str
    booking_value: str
    token_amount: str
    payment_plan: str
    agreement_status: str
    registration_status: str
    milestones: List[Any]

    class Config:
        from_attributes = True


# ========================================================
# TENANT & AUDIT LOG SCHEMAS
# ========================================================

class TenantCreate(BaseModel):
    id: str
    name: str
    subdomain: str
    tier: str
    userQuota: int
    storageQuota: int

class TenantResponse(BaseModel):
    id: str
    name: str
    subdomain: str
    tier: str
    userQuota: int
    storageQuota: int
    storageUsed: float
    brandingColor: str
    status: str

    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: int
    date: datetime
    tenant: str
    user: str
    action: str
    ip: str
    status: str

    class Config:
        from_attributes = True
