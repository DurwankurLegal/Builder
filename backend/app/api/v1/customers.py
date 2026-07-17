from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime
from app.api.deps import get_db, get_current_user
from app.models.models import Customer
from app.schemas.schemas import CustomerCreate, CustomerUpdate, CustomerResponse
from app.services.pipeline_service import next_suffix_id

router = APIRouter()

@router.get("", response_model=List[CustomerResponse])
async def list_customers(
    search: Optional[str] = None,
    project: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Lists active customers database with search parameters and category filters.
    """
    stmt = select(Customer)
    if user.role == "Sales Executive":
        stmt = stmt.where(Customer.executive == user.username)
        
    result = await db.execute(stmt)
    customers = result.scalars().all()
    
    filtered = []
    for c in customers:
        if search:
            search_lower = search.lower()
            if not (search_lower in c.name.lower() or search_lower in c.id.lower() or search_lower in c.phone):
                continue
        if project and c.project != project:
            continue
        if status and c.status != status:
            continue
        filtered.append(c)
        
    return filtered

@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    """
    Retrieves detailed parameter metrics of an active customer.
    """
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalars().first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer profile not found")
    return customer

@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(payload: CustomerCreate, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    """
    Registers a new active customer manually in the system database.
    """
    cust_id = await next_suffix_id(db, Customer, "CUST", 5000)

    now_str = datetime.now().strftime("%Y-%m-%d")
    
    new_cust = Customer(
        id=cust_id,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        address=payload.address,
        project=payload.project,
        budget=payload.budget,
        executive=payload.executive,
        status=payload.status,
        allocated_unit=payload.allocated_unit or "Flat unassigned",
        config=payload.config or "2BHK",
        area=payload.area or "1200 sq ft",
        floor=payload.floor or "2nd Floor",
        notes=payload.notes or "Manually registered active customer profile.",
        documents=payload.documents or ["PAN Card", "Aadhaar Card"],
        history=[{"date": now_str, "detail": "Customer profile created manually in DB."}]
    )
    
    db.add(new_cust)
    await db.commit()
    return new_cust

@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: str, payload: CustomerUpdate, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    """
    Modifies configuration parameters, notes logs, and checklists for an active customer.
    """
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalars().first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer profile not found")
        
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(customer, key, value)
        
    await db.commit()
    return customer
