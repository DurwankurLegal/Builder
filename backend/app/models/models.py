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


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(DateTime, default=datetime.utcnow)
    tenant = Column(String(100), nullable=False)
    user = Column(String(100), nullable=False)
    action = Column(String(500), nullable=False)
    ip = Column(String(50), default="127.0.0.1")
    status = Column(String(50), default="Success")
