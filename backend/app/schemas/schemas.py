from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime

# ========================================================
# AUTH & USER SCHEMAS
# ========================================================

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Any

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

class LeadSettingResponse(BaseModel):
    dup_check_phone: bool
    dup_check_email: bool
    ai_calling_enabled: bool
    ai_call_interval_seconds: int
    ai_retry_limit: int
    ai_batch_size: int

    class Config:
        from_attributes = True

class LeadSettingUpdate(BaseModel):
    dup_check_phone: Optional[bool] = None
    dup_check_email: Optional[bool] = None
    ai_calling_enabled: Optional[bool] = None
    ai_call_interval_seconds: Optional[int] = None
    ai_retry_limit: Optional[int] = None
    ai_batch_size: Optional[int] = None

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
