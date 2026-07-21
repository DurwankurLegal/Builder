from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_
from typing import List, Optional
from datetime import datetime
from app.api.deps import get_db, get_current_user
from app.models.models import Lead, Customer, Tenant
from app.schemas.schemas import LeadCreate, LeadUpdate, LeadResponse
from app.services.pipeline_service import next_suffix_id, normalize_phone, write_audit

router = APIRouter()


async def _tenant_label(request: Request, db: AsyncSession) -> str:
    tenant_id = getattr(request.state, "tenant_id", "public")
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalars().first()
    return tenant.name if tenant else tenant_id

@router.get("", response_model=List[LeadResponse])
async def list_leads(
    search: Optional[str] = None,
    project: Optional[str] = None,
    executive: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Lists active leads directory applying real-time searches, project scopes, and filters.
    """
    stmt = select(Lead)
    
    # Restrict Sales Executives to their assigned leads only (data isolation)
    if user.role == "Sales Executive":
        stmt = stmt.where(Lead.executive == user.username)
        
    result = await db.execute(stmt)
    leads = result.scalars().all()
    
    # Perform filtering
    filtered = []
    for l in leads:
        if search:
            search_lower = search.lower()
            if not (search_lower in l.name.lower() or search_lower in l.id.lower() or search_lower in l.phone):
                continue
        if project and l.project != project:
            continue
        if executive and l.executive != executive:
            continue
        if status and l.status != status:
            continue
        filtered.append(l)
        
    return filtered

@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: str, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    """
    Retrieves detailed parameters of a single lead.
    """
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead profile not found")
    return lead

@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(payload: LeadCreate, request: Request, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    """
    Registers a new lead with historical logs in the database.
    """
    # Generate unique ID (max-based so it never collides after deletions)
    new_id = await next_suffix_id(db, Lead, "LD", 1000)

    now_date = datetime.now().strftime("%Y-%m-%d")
    new_lead = Lead(
        id=new_id,
        date=now_date,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        project=payload.project,
        budget=payload.budget,
        source=payload.source,
        executive=payload.executive,
        status="New",
        remarks=[],
        history=[{"date": now_date, "detail": "Lead profile registered in DB."}]
    )

    db.add(new_lead)
    await write_audit(db, await _tenant_label(request, db), user.username,
                      f"Lead {new_id} ({payload.name}) registered in the leads database.")
    await db.commit()
    return new_lead

@router.put("/{lead_id}", response_model=LeadResponse)
async def update_lead(lead_id: str, payload: LeadUpdate, request: Request, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    """
    Updates lead profile columns, status levels, remarks, and logs historical modifications.
    """
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    update_data = payload.dict(exclude_unset=True)

    # Append activity log history if status changes
    status_changed = "status" in update_data and update_data["status"] != lead.status
    if status_changed:
        now_str = datetime.now().strftime("%Y-%m-%d")
        history = list(lead.history or [])
        history.append({
            "date": now_str,
            "detail": f"Status updated from {lead.status} to {update_data['status']} by {user.username}."
        })
        lead.history = history

    for key, value in update_data.items():
        setattr(lead, key, value)

    if status_changed:
        await write_audit(db, await _tenant_label(request, db), user.username,
                          f"Lead {lead_id} ({lead.name}) status changed to {lead.status}.")
    await db.commit()
    return lead

@router.post("/{lead_id}/convert", response_model=LeadResponse)
async def convert_lead(lead_id: str, request: Request, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    """
    Converts a qualified lead into an active customer registry. Per the
    business rules, the lead's email/mobile must not already exist in the
    customer database, and the conversion is audit-logged.
    """
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if lead.status == "Converted":
        raise HTTPException(status_code=400, detail="Lead has already been converted")

    # Duplicate validation against the existing customer database (SRS 4.1)
    lead_phone = normalize_phone(lead.phone)
    lead_email = (lead.email or "").strip().lower()
    result = await db.execute(select(Customer.id, Customer.phone, Customer.email))
    for cust_id_row, c_phone, c_email in result.all():
        if lead_phone and normalize_phone(c_phone) == lead_phone:
            raise HTTPException(status_code=409,
                                detail=f"Conversion blocked: mobile number already belongs to customer {cust_id_row}")
        if lead_email and (c_email or "").strip().lower() == lead_email:
            raise HTTPException(status_code=409,
                                detail=f"Conversion blocked: email already belongs to customer {cust_id_row}")

    now_str = datetime.now().strftime("%Y-%m-%d")
    
    # Update Lead Status
    lead.status = "Converted"
    history = list(lead.history or [])
    history.append({"date": now_str, "detail": f"Lead converted to active customer context by {user.username}."})
    lead.history = history
    
    # Create Customer Record (max-based id, collision-safe)
    cust_id = await next_suffix_id(db, Customer, "CUST", 5000)

    new_customer = Customer(
        id=cust_id,
        lead_id=lead.id,
        name=lead.name,
        email=lead.email,
        phone=lead.phone,
        address="Address unassigned",
        project=lead.project,
        budget=lead.budget,
        executive=lead.executive,
        status="Agreement Pending",
        allocated_unit="Flat unassigned",
        config="2BHK",
        area="1200 sq ft",
        floor="2nd Floor",
        notes="Transferred from Lead Pipeline.",
        documents=["PAN Card", "Aadhaar Card"],
        history=[{"date": now_str, "detail": "Customer registered dynamically via lead conversion."}]
    )
    
    db.add(new_customer)
    await write_audit(db, await _tenant_label(request, db), user.username,
                      f"Lead {lead.id} ({lead.name}) converted to customer {cust_id}.")
    await db.commit()
    return lead
