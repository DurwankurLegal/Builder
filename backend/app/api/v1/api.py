from fastapi import APIRouter
from app.api.v1 import (
    auth, leads, customers, bookings, admin, pipeline, users, integrations,
    followups, reports, settings_ws
)

api_router = APIRouter()

# Include aggregated routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["User Management"])
api_router.include_router(pipeline.router, prefix="/pipeline", tags=["Lead Pipeline"])
api_router.include_router(integrations.router, prefix="/integrations", tags=["Integrations"])
api_router.include_router(leads.router, prefix="/leads", tags=["Leads"])
api_router.include_router(customers.router, prefix="/customers", tags=["Customers"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["Bookings"])
api_router.include_router(followups.router, prefix="/followups", tags=["Follow-ups"])
api_router.include_router(reports.router, prefix="/reports", tags=["Analytics & Reports"])
api_router.include_router(settings_ws.router, prefix="/settings", tags=["System Settings"])
api_router.include_router(admin.router, prefix="/admin", tags=["Super Admin"])
