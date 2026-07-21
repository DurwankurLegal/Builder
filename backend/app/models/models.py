from sqlalchemy import Column, String, Integer, Numeric, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

# ========================================================
# GLOBAL SCHEMA MODELS (Stored in public schema)
# ========================================================

class Tenant(Base):
    __tablename__ = "tenants"
    
    id = Column(String(50), primary_key=True)
    name = Column(String(255), nullable=False)
    subdomain = Column(String(100), unique=True, nullable=False)
    tier = Column(String(50), default="Basic") # Basic, Professional, Enterprise
    userQuota = Column(Integer, default=10)
    storageQuota = Column(Integer, default=5) # In GB
    storageUsed = Column(Numeric(10, 2), default=0.0) # In GB
    brandingColor = Column(String(20), default="#4f46e5")
    status = Column(String(50), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)


# ========================================================
# TENANT-SPECIFIC SCHEMAS (Stored in individual schemas)
# ========================================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="Sales Executive") # Super Admin, Tenant Admin, Sales Executive
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Account security / lifecycle state
    is_locked = Column(Boolean, default=False)
    failed_login_attempts = Column(Integer, default=0)
    force_password_change = Column(Boolean, default=False)
    last_login = Column(DateTime, nullable=True)


class Lead(Base):
    __tablename__ = "leads"
    
    id = Column(String(50), primary_key=True)
    date = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    project = Column(String(255), nullable=False)
    budget = Column(String(100), nullable=False)
    source = Column(String(100), nullable=False)
    executive = Column(String(100), nullable=False)
    status = Column(String(50), default="New") # Converted, Lost, Qualified, etc.
    remarks = Column(JSON, default=list) # List of chat remarks
    history = Column(JSON, default=list) # Activity logs


class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(String(50), primary_key=True)
    lead_id = Column(String(50), nullable=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    address = Column(String(255), nullable=False)
    project = Column(String(255), nullable=False)
    budget = Column(String(100), nullable=False)
    executive = Column(String(100), nullable=False)
    status = Column(String(100), default="Agreement Pending") # Agreement Pending, Agreement Executed, Registered
    allocated_unit = Column(String(50), nullable=True) # Flat flatNo
    config = Column(String(50), nullable=True) # 2BHK, etc.
    area = Column(String(50), nullable=True)
    floor = Column(String(50), nullable=True)
    notes = Column(String(1000), nullable=True)
    history = Column(JSON, default=list)
    documents = Column(JSON, default=list) # Checklist elements string array


class FollowUp(Base):
    """Scheduled relationship tasks (calls, site visits, document collection)."""
    __tablename__ = "followups"

    id = Column(Integer, primary_key=True, autoincrement=True)
    client = Column(String(255), nullable=False)
    activity = Column(String(500), nullable=False)
    date = Column(String(50), nullable=False)  # YYYY-MM-DD
    executive = Column(String(100), nullable=False)
    task_type = Column(String(50), default="Call")  # Call, Meeting, Site Visit, Document
    status = Column(String(50), default="Pending")  # Pending, Completed
    created_by = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class WorkspaceSetting(Base):
    """
    Per-tenant system settings (single row per schema): company profile,
    projects directory, and lead channel toggles, stored as JSON documents.
    """
    __tablename__ = "workspace_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company = Column(JSON, default=dict)    # legal name, RERA id, CIN, GSTIN, address
    projects = Column(JSON, default=list)   # [{id, name, location, rera, units}]
    channels = Column(JSON, default=list)   # [{name, enabled}]
    updated_by = Column(String(100), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Booking(Base):
    __tablename__ = "bookings"

    bookingNo = Column("bookingno", String(50), primary_key=True)
    customer_id = Column(String(50), nullable=False)
    customer_name = Column(String(255), nullable=False)
    project = Column(String(255), nullable=False)
    unit_no = Column(String(50), nullable=False)
    slab_area = Column(String(50), nullable=False)
    booking_value = Column(String(100), nullable=False)
    token_amount = Column(String(100), nullable=False)
    payment_plan = Column(String(255), nullable=False)
    agreement_status = Column(String(50), default="Pending") # Pending, Executed
    registration_status = Column(String(50), default="Pending") # Pending, Applied, Completed
    milestones = Column(JSON, default=list) # Milestones list
    created_at = Column(DateTime, default=datetime.utcnow)  # for monthly sales aggregation


class PipelineLead(Base):
    """
    Pre-sales lead pipeline record. A single row travels through the
    lifecycle stages: raw -> called -> qualified -> (database | customer | rejected).
    All call and qualification data accumulates on the same row so the full
    lead context is preserved across stage movements.
    """
    __tablename__ = "pipeline_leads"

    id = Column(String(50), primary_key=True)
    date = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    email = Column(String(255), nullable=False)
    source = Column(String(100), nullable=False)
    project = Column(String(255), nullable=False)
    budget = Column(String(100), nullable=True)
    stage = Column(String(50), default="raw")  # raw, called, qualified, rejected, database, customer
    status = Column(String(100), default="Pending Call")  # stage-specific processing status

    # AI calling data (populated when the AI agent completes a call)
    interest_status = Column(String(50), nullable=True)  # Interested / Not Interested
    called_at = Column(String(50), nullable=True)
    call_duration = Column(String(50), nullable=True)
    ai_outcome = Column(String(255), nullable=True)
    ai_summary = Column(String(2000), nullable=True)
    ai_confidence = Column(Numeric(4, 2), nullable=True)
    recording_available = Column(Boolean, default=False)
    call_attempts = Column(Integer, default=0)
    last_call_attempt = Column(String(50), nullable=True)

    # External voice provider data (populated by the HireBuddha integration)
    call_recording_url = Column(String(500), nullable=True)   # provider-hosted recording
    ai_notes = Column(String(2000), nullable=True)            # AI-generated notes
    disposition = Column(String(100), nullable=True)          # provider call_outcome verbatim
    lead_temperature = Column(String(20), nullable=True)      # hot / warm / cold
    dispatch_correlation_id = Column(String(100), nullable=True)  # provider tracking id
    dispatched_at = Column(String(50), nullable=True)         # when we handed the lead to the dialer
    callback_received_at = Column(String(50), nullable=True)  # when the call result came back

    # Sales qualification data (populated in the Qualified stage)
    contacted_by = Column(String(100), nullable=True)
    remarks = Column(String(1000), nullable=True)
    site_visit_status = Column(String(50), nullable=True)  # Not Scheduled, Scheduled, Completed
    loan_requirement = Column(String(50), nullable=True)  # Required, Not Required, Approved
    next_followup_date = Column(String(50), nullable=True)

    linked_record_id = Column(String(50), nullable=True)  # LD-/CUST- id created on transfer
    history = Column(JSON, default=list)  # complete stage/audit activity trail
    created_at = Column(DateTime, default=datetime.utcnow)


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(DateTime, default=datetime.utcnow)
    filename = Column(String(255), nullable=False)
    total_rows = Column(Integer, default=0)
    imported = Column(Integer, default=0)
    duplicates = Column(Integer, default=0)
    errors = Column(Integer, default=0)
    uploaded_by = Column(String(100), nullable=False)


class LeadSetting(Base):
    """Per-tenant pipeline configuration (single row per tenant schema)."""
    __tablename__ = "lead_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dup_check_phone = Column(Boolean, default=True)
    dup_check_email = Column(Boolean, default=True)
    ai_calling_enabled = Column(Boolean, default=True)
    ai_call_interval_seconds = Column(Integer, default=45)
    ai_retry_limit = Column(Integer, default=3)
    ai_batch_size = Column(Integer, default=2)
    # Voice provider: 'simulation' (built-in demo dialer) or 'hirebuddha'.
    # Defaults to simulation so existing workspaces never dial real numbers
    # until an admin deliberately switches the provider on.
    ai_provider = Column(String(50), default="simulation")
    # Optional per-workspace HireBuddha overrides (fall back to global config)
    hb_client_id = Column(String(100), nullable=True)
    hb_entity_id = Column(String(100), nullable=True)


class IntegrationLog(Base):
    """
    Request/response audit for every external integration exchange
    (HireBuddha dispatches and callbacks). One row per HTTP attempt so
    retries and failures are individually traceable.
    """
    __tablename__ = "integration_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(DateTime, default=datetime.utcnow)
    provider = Column(String(50), default="hirebuddha")
    direction = Column(String(20), nullable=False)  # outbound | inbound
    endpoint = Column(String(500), nullable=False)
    lead_id = Column(String(50), nullable=True)
    request_payload = Column(JSON, default=dict)
    response_payload = Column(JSON, default=dict)
    status_code = Column(Integer, nullable=True)
    outcome = Column(String(50), default="Success")  # Success | Failed
    error = Column(String(1000), nullable=True)
    attempt = Column(Integer, default=1)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(DateTime, default=datetime.utcnow)
    tenant = Column(String(100), nullable=False)
    user = Column(String(100), nullable=False)
    action = Column(String(500), nullable=False)
    ip = Column(String(50), default="127.0.0.1")
    status = Column(String(50), default="Success")
