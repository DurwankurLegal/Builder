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
