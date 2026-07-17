from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_
from typing import List, Optional
from datetime import datetime
from app.api.deps import get_db, get_current_user
from app.models.models import Lead, Customer
from app.schemas.schemas import LeadCreate, LeadUpdate, LeadResponse

router = APIRouter()

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
async def create_lead(payload: LeadCreate, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    """
    Registers a new lead with historical logs in the database.
    """
    # Generate unique ID
    result = await db.execute(select(Lead))
    all_leads = result.scalars().all()
    new_id = f"LD-{1000 + len(all_leads) + 1}"
    
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
    await db.commit()
    return new_lead

@router.put("/{lead_id}", response_model=LeadResponse)
async def update_lead(lead_id: str, payload: LeadUpdate, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    """
    Updates lead profile columns, status levels, remarks, and logs historical modifications.
    """
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    update_data = payload.dict(exclude_unset=True)
    
    # Append activity log history if status changes
    if "status" in update_data and update_data["status"] != lead.status:
        now_str = datetime.now().strftime("%Y-%m-%d")
        history = list(lead.history or [])
        history.append({
            "date": now_str,
            "detail": f"Status updated from {lead.status} to {update_data['status']} by {user.username}."
        })
        lead.history = history
        
    for key, value in update_data.items():
        setattr(lead, key, value)
        
    await db.commit()
    return lead

@router.post("/{lead_id}/convert", response_model=LeadResponse)
async def convert_lead(lead_id: str, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    """
    Converts a qualified lead into an active customer registry.
    """
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    if lead.status == "Converted":
        raise HTTPException(status_code=400, detail="Lead has already been converted")
        
    now_str = datetime.now().strftime("%Y-%m-%d")
    
    # Update Lead Status
    lead.status = "Converted"
    history = list(lead.history or [])
    history.append({"date": now_str, "detail": f"Lead converted to active customer context by {user.username}."})
    lead.history = history
    
    # Create Customer Record
    result_cust = await db.execute(select(Customer))
    all_cust = result_cust.scalars().all()
    cust_id = f"CUST-{5000 + len(all_cust) + 1}"
    
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
    await db.commit()
    return lead
