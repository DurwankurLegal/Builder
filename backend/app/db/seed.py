import asyncio
from datetime import datetime
from sqlalchemy import text, select
from app.db.session import engine, Base, async_session_maker
from app.models.models import Tenant, AuditLog, User, Lead, Customer, Booking, PipelineLead, LeadSetting
from app.core.security import get_password_hash

# Dynamic DDLs lists
SCHEMA_TABLES_DDL = [
    """CREATE TABLE IF NOT EXISTS {schema}.users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        hashed_password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'Sales Executive',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_locked BOOLEAN DEFAULT FALSE,
        failed_login_attempts INTEGER DEFAULT 0,
        force_password_change BOOLEAN DEFAULT FALSE,
        last_login TIMESTAMP NULL
    )""",
    """CREATE TABLE IF NOT EXISTS {schema}.leads (
        id VARCHAR(50) PRIMARY KEY,
        date VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        project VARCHAR(255) NOT NULL,
        budget VARCHAR(100) NOT NULL,
        source VARCHAR(100) NOT NULL,
        executive VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'New',
        remarks JSON DEFAULT '[]',
        history JSON DEFAULT '[]'
    )""",
    """CREATE TABLE IF NOT EXISTS {schema}.customers (
        id VARCHAR(50) PRIMARY KEY,
        lead_id VARCHAR(50) NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        address VARCHAR(255) NOT NULL,
        project VARCHAR(255) NOT NULL,
        budget VARCHAR(100) NOT NULL,
        executive VARCHAR(100) NOT NULL,
        status VARCHAR(100) DEFAULT 'Agreement Pending',
        allocated_unit VARCHAR(50) NULL,
        config VARCHAR(50) NULL,
        area VARCHAR(50) NULL,
        floor VARCHAR(50) NULL,
        notes VARCHAR(1000) NULL,
        history JSON DEFAULT '[]',
        documents JSON DEFAULT '[]'
    )""",
    """CREATE TABLE IF NOT EXISTS {schema}.pipeline_leads (
        id VARCHAR(50) PRIMARY KEY,
        date VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL,
        source VARCHAR(100) NOT NULL,
        project VARCHAR(255) NOT NULL,
        budget VARCHAR(100) NULL,
        stage VARCHAR(50) DEFAULT 'raw',
        status VARCHAR(100) DEFAULT 'Pending Call',
        interest_status VARCHAR(50) NULL,
        called_at VARCHAR(50) NULL,
        call_duration VARCHAR(50) NULL,
        ai_outcome VARCHAR(255) NULL,
        ai_summary VARCHAR(2000) NULL,
        ai_confidence NUMERIC(4,2) NULL,
        recording_available BOOLEAN DEFAULT FALSE,
        call_attempts INTEGER DEFAULT 0,
        last_call_attempt VARCHAR(50) NULL,
        contacted_by VARCHAR(100) NULL,
        remarks VARCHAR(1000) NULL,
        site_visit_status VARCHAR(50) NULL,
        loan_requirement VARCHAR(50) NULL,
        next_followup_date VARCHAR(50) NULL,
        linked_record_id VARCHAR(50) NULL,
        history JSON DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""",
    """CREATE TABLE IF NOT EXISTS {schema}.import_batches (
        id SERIAL PRIMARY KEY,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        filename VARCHAR(255) NOT NULL,
        total_rows INTEGER DEFAULT 0,
        imported INTEGER DEFAULT 0,
        duplicates INTEGER DEFAULT 0,
        errors INTEGER DEFAULT 0,
        uploaded_by VARCHAR(100) NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS {schema}.lead_settings (
        id SERIAL PRIMARY KEY,
        dup_check_phone BOOLEAN DEFAULT TRUE,
        dup_check_email BOOLEAN DEFAULT TRUE,
        ai_calling_enabled BOOLEAN DEFAULT TRUE,
        ai_call_interval_seconds INTEGER DEFAULT 45,
        ai_retry_limit INTEGER DEFAULT 3,
        ai_batch_size INTEGER DEFAULT 2
    )""",
    """CREATE TABLE IF NOT EXISTS {schema}.bookings (
        bookingNo VARCHAR(50) PRIMARY KEY,
        customer_id VARCHAR(50) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        project VARCHAR(255) NOT NULL,
        unit_no VARCHAR(50) NOT NULL,
        slab_area VARCHAR(50) NOT NULL,
        booking_value VARCHAR(100) NOT NULL,
        token_amount VARCHAR(100) NOT NULL,
        payment_plan VARCHAR(255) NOT NULL,
        agreement_status VARCHAR(50) DEFAULT 'Pending',
        registration_status VARCHAR(50) DEFAULT 'Pending',
        milestones JSON DEFAULT '[]'
    )"""
]

# Additive migrations applied to every tenant schema on each seed run so
# workspaces provisioned before these account-security columns existed get them.
USER_COLUMN_MIGRATIONS = [
    "ALTER TABLE {schema}.users ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE",
    "ALTER TABLE {schema}.users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0",
    "ALTER TABLE {schema}.users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT FALSE",
    "ALTER TABLE {schema}.users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL",
]

TENANTS_SEED = [
    {"id": "tenant-1", "name": "Prestige Group", "subdomain": "prestige", "tier": "Enterprise", "userQuota": 150, "storageQuota": 100},
    {"id": "tenant-2", "name": "DLF Limited", "subdomain": "dlf", "tier": "Enterprise", "userQuota": 200, "storageQuota": 150},
    {"id": "tenant-3", "name": "LODHA Group", "subdomain": "lodha", "tier": "Professional", "userQuota": 50, "storageQuota": 50},
    {"id": "tenant-4", "name": "Sobha Developers", "subdomain": "sobha", "tier": "Professional", "userQuota": 40, "storageQuota": 40},
    {"id": "tenant-5", "name": "Godrej Properties", "subdomain": "godrej", "tier": "Basic", "userQuota": 10, "storageQuota": 10}
]

# Shared Mock Datasets
MOCK_LEADS = [
    {"name": "Aarav Sharma", "email": "aarav.sharma@gmail.com", "phone": "9811234567", "project": "Sunrise Heights", "budget": "₹85 Lakhs", "source": "Google Ads", "executive": "Priya Patel", "status": "New"},
    {"name": "Aditya Verma", "email": "aditya.v@yahoo.com", "phone": "9822345678", "project": "Green Meadows", "budget": "₹1.2 Crore", "source": "Referral", "executive": "Amit Singh", "status": "Contacted"},
    {"name": "Karan Malhotra", "email": "karan.m@gmail.com", "phone": "9833456789", "project": "Royal Residency", "budget": "₹95 Lakhs", "source": "Newspaper", "executive": "Priya Patel", "status": "Qualified"},
    {"name": "Neha Gupta", "email": "neha.g@outlook.com", "phone": "9844567890", "project": "Sunrise Heights", "budget": "₹75 Lakhs", "source": "Direct Visit", "executive": "Amit Singh", "status": "Site Visit"},
    {"name": "Siddharth Roy", "email": "sid.roy@gmail.com", "phone": "9855678901", "project": "Green Meadows", "budget": "₹1.5 Crore", "source": "Social Media", "executive": "Priya Patel", "status": "Negotiation"}
]

MOCK_PIPELINE_LEADS = [
    {"name": "Rohan Deshpande", "phone": "9861112233", "email": "rohan.d@gmail.com", "source": "Facebook Ads", "project": "Sunrise Heights", "budget": "₹90 Lakhs"},
    {"name": "Ishita Banerjee", "phone": "9872223344", "email": "ishita.b@yahoo.com", "source": "MagicBricks", "project": "Green Meadows", "budget": "₹1.3 Crore"},
    {"name": "Farhan Qureshi", "phone": "9883334455", "email": "farhan.q@outlook.com", "source": "99acres", "project": "Royal Residency", "budget": "₹1.1 Crore"},
    {"name": "Tanvi Kulkarni", "phone": "9894445566", "email": "tanvi.k@gmail.com", "source": "Google Ads", "project": "Sunrise Heights", "budget": "₹78 Lakhs"},
    {"name": "Manish Agarwal", "phone": "9905556677", "email": "manish.a@gmail.com", "source": "Website Form", "project": "Green Meadows", "budget": "₹1.6 Crore"},
    {"name": "Sneha Reddy", "phone": "9916667788", "email": "sneha.r@hotmail.com", "source": "Facebook Ads", "project": "Royal Residency", "budget": "₹95 Lakhs"},
    {"name": "Arjun Mehta", "phone": "9927778899", "email": "arjun.m@gmail.com", "source": "Housing.com", "project": "Sunrise Heights", "budget": "₹82 Lakhs"},
    {"name": "Pooja Choudhary", "phone": "9938889900", "email": "pooja.c@yahoo.com", "source": "Website Form", "project": "Green Meadows", "budget": "₹1.2 Crore"},
]

MOCK_CUSTOMERS = [
    {"id": "CUST-5001", "name": "Rajesh Nair", "email": "rajesh.nair@hotmail.com", "phone": "9911223344", "address": "Mumbai, Maharashtra", "project": "Sunrise Heights", "budget": "₹80 Lakhs", "executive": "Priya Patel", "status": "Registered", "allocated_unit": "Tower A, Flat 405", "config": "2BHK", "area": "1150 sq ft", "floor": "4th Floor"},
    {"id": "CUST-5002", "name": "Meera Iyer", "email": "meera.iyer@gmail.com", "phone": "9922334455", "address": "Bangalore, Karnataka", "project": "Royal Residency", "budget": "₹1.1 Crore", "executive": "Amit Singh", "status": "Agreement Executed", "allocated_unit": "Block C, Flat 1012", "config": "3BHK", "area": "1650 sq ft", "floor": "10th Floor"},
    {"id": "CUST-5003", "name": "Vikram Seth", "email": "vikram.s@yahoo.com", "phone": "9933445566", "address": "Delhi NCR", "project": "Green Meadows", "budget": "₹1.4 Crore", "executive": "Priya Patel", "status": "Agreement Pending", "allocated_unit": "Villa 18", "config": "Villa", "area": "2400 sq ft", "floor": "Ground + 1"}
]

MOCK_BOOKINGS = [
    {"bookingNo": "BK-8001", "customer_id": "CUST-5001", "customer_name": "Rajesh Nair", "project": "Sunrise Heights", "unit_no": "Tower A, Flat 405", "slab_area": "1150 sq ft", "booking_value": "₹80 Lakhs", "token_amount": "₹5 Lakhs", "payment_plan": "Construction Linked Plan (CLP)", "agreement_status": "Executed", "registration_status": "Completed"},
    {"bookingNo": "BK-8002", "customer_id": "CUST-5002", "customer_name": "Meera Iyer", "project": "Royal Residency", "unit_no": "Block C, Flat 1012", "slab_area": "1650 sq ft", "booking_value": "₹1.1 Crore", "token_amount": "₹10 Lakhs", "payment_plan": "Down Payment Plan (DPP)", "agreement_status": "Executed", "registration_status": "Applied"},
    {"bookingNo": "BK-8003", "customer_id": "CUST-5003", "customer_name": "Vikram Seth", "project": "Green Meadows", "unit_no": "Villa 18", "slab_area": "2400 sq ft", "booking_value": "₹1.4 Crore", "token_amount": "₹15 Lakhs", "payment_plan": "Construction Linked Plan (CLP)", "agreement_status": "Pending", "registration_status": "Pending"}
]

async def seed_all():
    # 1. Spawn global public tables
    async with engine.begin() as conn:
        # Create public tables if not exist
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS public"))
        await conn.execute(text("SET search_path TO public"))
        await conn.run_sync(Base.metadata.create_all)
        # public.users predates the account-security columns when the table
        # already existed (create_all never alters an existing table).
        for alter in USER_COLUMN_MIGRATIONS:
            await conn.execute(text(alter.format(schema="public")))
        print("Spawned public schema tables.")

    async_session = async_session_maker()
    
    # 2. Seed Tenants & Global logs
    async with async_session as session:
        await session.execute(text("SET search_path TO public"))
        
        # Check if tenants seeded
        res = await session.execute(select(Tenant))
        if not res.scalars().all():
            for t_data in TENANTS_SEED:
                tenant = Tenant(
                    id=t_data["id"],
                    name=t_data["name"],
                    subdomain=t_data["subdomain"],
                    tier=t_data["tier"],
                    userQuota=t_data["userQuota"],
                    storageQuota=t_data["storageQuota"],
                    storageUsed=0.35,
                    brandingColor="#4f46e5",
                    status="Active"
                )
                session.add(tenant)
            
            # Initial audit logs
            session.add(AuditLog(tenant="System", user="Super Admin", action="Initial database schema bootstrapped successfully.", ip="127.0.0.1"))
            session.add(AuditLog(tenant="Prestige Group", user="System", action="Workspace credentials provisioned.", ip="127.0.0.1"))
            await session.commit()
            print("Seeded public tenants directory.")

    # 3. Spawn and seed each tenant schema
    for tenant_seed in TENANTS_SEED:
        schema = tenant_seed["id"].replace("-", "_").lower()
        
        # Spawn schema and run custom DDLs
        async with engine.begin() as conn:
            await conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema}"))
            for ddl in SCHEMA_TABLES_DDL:
                await conn.execute(text(ddl.format(schema=schema)))
            # Idempotent migrations for schemas created before these columns existed
            for alter in USER_COLUMN_MIGRATIONS:
                await conn.execute(text(alter.format(schema=schema)))
            print(f"Spawned workspace tables for schema: {schema}")
            
        # Seed records
        async with async_session_maker() as session:
            await session.execute(text(f"SET search_path TO {schema}"))
            
            # Users
            res_user = await session.execute(select(User))
            if not res_user.scalars().all():
                hashed_pwd = get_password_hash("admin")
                session.add(User(username="admin", email=f"admin@{tenant_seed['subdomain']}.com", hashed_password=hashed_pwd, role="Super Admin"))
                session.add(User(username="priya", email=f"priya@{tenant_seed['subdomain']}.com", hashed_password=hashed_pwd, role="Sales Executive"))
                session.add(User(username="amit", email=f"amit@{tenant_seed['subdomain']}.com", hashed_password=hashed_pwd, role="Sales Executive"))
            
            # Leads
            res_lead = await session.execute(select(Lead))
            if not res_lead.scalars().all():
                for idx, ml in enumerate(MOCK_LEADS):
                    now_date = datetime.now().strftime("%Y-%m-%d")
                    session.add(Lead(
                        id=f"LD-{1001 + idx}",
                        date=now_date,
                        name=ml["name"],
                        email=ml["email"],
                        phone=ml["phone"],
                        project=ml["project"],
                        budget=ml["budget"],
                        source=ml["source"],
                        executive=ml["executive"],
                        status=ml["status"],
                        remarks=[],
                        history=[{"date": now_date, "detail": "Lead profile registered in DB."}]
                    ))
            
            # Customers
            res_cust = await session.execute(select(Customer))
            if not res_cust.scalars().all():
                for mc in MOCK_CUSTOMERS:
                    now_date = datetime.now().strftime("%Y-%m-%d")
                    session.add(Customer(
                        id=mc["id"],
                        lead_id=None,
                        name=mc["name"],
                        email=mc["email"],
                        phone=mc["phone"],
                        address=mc["address"],
                        project=mc["project"],
                        budget=mc["budget"],
                        executive=mc["executive"],
                        status=mc["status"],
                        allocated_unit=mc["allocated_unit"],
                        config=mc["config"],
                        area=mc["area"],
                        floor=mc["floor"],
                        notes="Seeded profile.",
                        documents=["PAN Card", "Aadhaar Card"],
                        history=[{"date": now_date, "detail": "Customer registered dynamically."}]
                    ))

            # Pipeline (Raw Leads) + workspace pipeline settings
            res_pipe = await session.execute(select(PipelineLead))
            if not res_pipe.scalars().all():
                now_stamp = datetime.now().strftime("%Y-%m-%d %H:%M")
                for idx, mp in enumerate(MOCK_PIPELINE_LEADS):
                    session.add(PipelineLead(
                        id=f"PL-{1001 + idx}",
                        date=datetime.now().strftime("%Y-%m-%d"),
                        name=mp["name"],
                        phone=mp["phone"],
                        email=mp["email"],
                        source=mp["source"],
                        project=mp["project"],
                        budget=mp["budget"],
                        stage="raw",
                        status="Pending Call",
                        call_attempts=0,
                        history=[{"date": now_stamp, "action": "Raw lead registered via seed import", "user": "System"}]
                    ))

            res_settings = await session.execute(select(LeadSetting))
            if not res_settings.scalars().all():
                session.add(LeadSetting())

            # Bookings
            res_book = await session.execute(select(Booking))
            if not res_book.scalars().all():
                for mb in MOCK_BOOKINGS:
                    session.add(Booking(
                        bookingNo=mb["bookingNo"],
                        customer_id=mb["customer_id"],
                        customer_name=mb["customer_name"],
                        project=mb["project"],
                        unit_no=mb["unit_no"],
                        slab_area=mb["slab_area"],
                        booking_value=mb["booking_value"],
                        token_amount=mb["token_amount"],
                        payment_plan=mb["payment_plan"],
                        agreement_status=mb["agreement_status"],
                        registration_status=mb["registration_status"],
                        milestones=[
                            {"milestone": "Token Booking Amount Paid", "ratio": "10%", "value": "₹5 Lakhs", "status": "Paid", "dueDate": "2026-07-01"},
                            {"milestone": "Agreement Execution Stage", "ratio": "10%", "value": "₹5 Lakhs", "status": "Paid", "dueDate": "2026-07-15"},
                            {"milestone": "Excavation Milestone Complete", "ratio": "20%", "value": "₹10 Lakhs", "status": "Paid", "dueDate": "2026-08-30"},
                            {"milestone": "Superstructure Slab Launch", "ratio": "30%", "value": "₹15 Lakhs", "status": "Pending", "dueDate": "2026-10-15"},
                            {"milestone": "Superstructure Plinth Cast", "ratio": "20%", "value": "₹10 Lakhs", "status": "Pending", "dueDate": "2026-12-01"},
                            {"milestone": "Possession Certificate Issuance", "ratio": "10%", "value": "₹5 Lakhs", "status": "Pending", "dueDate": "2027-02-28"}
                        ]
                    ))
            
            await session.commit()
            print(f"Seeded records inside workspace schema: {schema}")

if __name__ == "__main__":
    asyncio.run(seed_all())
