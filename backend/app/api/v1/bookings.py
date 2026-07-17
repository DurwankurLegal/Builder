from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.api.deps import get_db, get_current_user
from app.models.models import Booking
from app.schemas.schemas import BookingUpdate, BookingResponse

router = APIRouter()

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
async def update_booking(booking_no: str, payload: BookingUpdate, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    """
    Modifies milestone payment schedules and legal registry validation stages.
    """
    result = await db.execute(select(Booking).where(Booking.bookingNo == booking_no))
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Closed deal booking not found")
        
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(booking, key, value)
        
    await db.commit()
    return booking
