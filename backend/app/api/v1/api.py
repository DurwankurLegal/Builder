from fastapi import APIRouter
from app.api.v1 import auth, leads, customers, bookings, admin

api_router = APIRouter()

# Include aggregated routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(leads.router, prefix="/leads", tags=["Leads"])
api_router.include_router(customers.router, prefix="/customers", tags=["Customers"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["Bookings"])
api_router.include_router(admin.router, prefix="/admin", tags=["Super Admin"])
