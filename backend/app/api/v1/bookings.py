from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.api.deps import get_db, get_current_user
from app.models.models import Booking, Tenant
from app.schemas.schemas import BookingUpdate, BookingResponse
from app.services.pipeline_service import write_audit

router = APIRouter()


async def _tenant_label(request: Request, db: AsyncSession) -> str:
    tenant_id = getattr(request.state, "tenant_id", "public")
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalars().first()
    return tenant.name if tenant else tenant_id

@router.get("", response_model=List[BookingResponse])
async def list_bookings(db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    """
    Lists agreement bookings data.
    """
    stmt = select(Booking)
    result = await db.execute(stmt)
    bookings = result.scalars().all()
    return bookings

@router.get("/{booking_no}", response_model=BookingResponse)
async def get_booking(booking_no: str, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    """
    Retrieves milestone scheduling and documentation states of a closed deal.
    """
    result = await db.execute(select(Booking).where(Booking.bookingNo == booking_no))
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Closed deal booking not found")
    return booking

@router.put("/{booking_no}", response_model=BookingResponse)
async def update_booking(booking_no: str, payload: BookingUpdate, request: Request,
                         db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    """
    Modifies milestone payment schedules and legal registry validation stages.
    Legal-stage progressions are audit-logged (business rule 4.2).
    """
    result = await db.execute(select(Booking).where(Booking.bookingNo == booking_no))
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Closed deal booking not found")

    update_data = payload.dict(exclude_unset=True)
    changed = [k for k, v in update_data.items() if getattr(booking, k) != v]
    for key, value in update_data.items():
        setattr(booking, key, value)

    if changed:
        legal = [f"{k.replace('_', ' ')}: {getattr(booking, k)}"
                 for k in ("agreement_status", "registration_status") if k in changed]
        detail = "; ".join(legal) if legal else f"fields: {', '.join(changed)}"
        await write_audit(db, await _tenant_label(request, db), user.username,
                          f"Booking {booking_no} ({booking.customer_name}) updated - {detail}.")
    await db.commit()
    return booking
