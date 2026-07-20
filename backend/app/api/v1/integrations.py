"""
External integration endpoints.

HireBuddha CRM Update API — the callback surface the HireBuddha platform
calls after every AI voice call, following the "Update Endpoint Pattern"
from their integration guide:

    POST /api/v1/integrations/hirebuddha/{workspace_id}/leads/{lead_id}/update

The workspace travels in the URL (external platforms can only be configured
with a URL + auth header, not our X-Tenant-ID convention), and every request
must present the shared callback token as `Authorization: Bearer <token>`
or `X-API-Key: <token>`. All exchanges are recorded in integration_logs.

Also exposes admin tooling: the integration log viewer and a manual
"dispatch now" trigger for verifying the pipeline with a test lead.
"""
import hmac

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.api.deps import get_db, check_roles
from app.core.config import settings
from app.db.session import get_db_session, InvalidTenantError
from app.models.models import IntegrationLog, PipelineLead, Tenant
from app.schemas.schemas import HireBuddhaCallback, IntegrationLogResponse, PipelineLeadResponse
from app.services import hirebuddha, pipeline_service

router = APIRouter()

ADMIN_ROLES = ["Super Admin", "Tenant Admin"]


def _verify_callback_token(request: Request) -> None:
    """
    Shared-secret authentication for HireBuddha callbacks. Fails closed when
    no token is configured; constant-time comparison against the presented
    Bearer / X-API-Key credential.
    """
    expected = settings.HIREBUDDHA_CALLBACK_TOKEN
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="HireBuddha callback token is not configured on this server")

    presented = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.lower().startswith("bearer "):
        presented = auth_header[7:].strip()
    presented = presented or request.headers.get("X-API-Key")

    if not presented or not hmac.compare_digest(presented, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing callback credentials")


@router.post("/hirebuddha/{workspace_id}/leads/{lead_id}/update")
async def hirebuddha_call_result(
    workspace_id: str,
    lead_id: str,
    payload: HireBuddhaCallback,
    request: Request,
):
    """
    CRM Update API: receives the AI call result from HireBuddha and applies
    it to the pipeline lead — storing status, duration, recording URL,
    summary, AI notes, disposition, temperature, and follow-up date, with a
    complete history + audit + integration-log trail.
    """
    _verify_callback_token(request)

    if payload.lead_id and payload.lead_id != lead_id:
        raise HTTPException(
            status_code=400,
            detail=f"Body lead_id '{payload.lead_id}' does not match the URL lead '{lead_id}'")

    try:
        db = await get_db_session(workspace_id)
    except InvalidTenantError:
        raise HTTPException(status_code=404, detail=f"Unknown workspace '{workspace_id}'")

    try:
        # Callbacks are only valid for real provisioned workspaces
        tenant_row = (await db.execute(select(Tenant).where(Tenant.id == workspace_id))).scalars().first()
        if not tenant_row:
            raise HTTPException(status_code=404, detail=f"Unknown workspace '{workspace_id}'")
        tenant_name = tenant_row.name

        endpoint = f"/integrations/hirebuddha/{workspace_id}/leads/{lead_id}/update"
        result = await db.execute(select(PipelineLead).where(PipelineLead.id == lead_id))
        lead = result.scalars().first()

        if not lead:
            hirebuddha._log_exchange(
                db, direction="inbound", endpoint=endpoint, lead_id=lead_id,
                request_payload=payload.model_dump(), response_payload={"detail": "lead not found"},
                status_code=404, outcome="Failed", error="Pipeline lead not found")
            await db.commit()
            raise HTTPException(status_code=404, detail=f"Pipeline lead '{lead_id}' not found")

        if lead.stage != "raw":
            # Duplicate/late callback for an already-processed lead: acknowledge
            # with 2xx (per the guide) so HireBuddha stops retrying, change nothing.
            response_body = {"status": "ignored", "lead_id": lead_id,
                             "detail": f"Lead already in stage '{lead.stage}'"}
            hirebuddha._log_exchange(
                db, direction="inbound", endpoint=endpoint, lead_id=lead_id,
                request_payload=payload.model_dump(), response_payload=response_body,
                status_code=200, outcome="Success")
            await db.commit()
            return response_body

        settings_row = await pipeline_service.get_settings(db)
        action = hirebuddha.apply_callback(lead, payload, settings_row.ai_retry_limit)

        response_body = {
            "status": "updated",
            "lead_id": lead.id,
            "action": action,
            "stage": lead.stage,
            "lead_status": lead.status,
        }
        hirebuddha._log_exchange(
            db, direction="inbound", endpoint=endpoint, lead_id=lead_id,
            request_payload=payload.model_dump(), response_payload=response_body,
            status_code=200, outcome="Success")
        await pipeline_service.write_audit(
            db, tenant_name, payload.updated_by or hirebuddha.CALLBACK_ACTOR,
            f"HireBuddha call result for {lead.id} ({lead.name}): {payload.call_outcome}"
            f"{' - moved to Called Leads' if action == 'advanced' else ''}.",
            status="Success" if action != "halted" else "Failed")
        await db.commit()
        return response_body
    finally:
        await db.close()


@router.get("/hirebuddha/logs", response_model=List[IntegrationLogResponse])
async def hirebuddha_integration_logs(
    limit: int = 50,
    direction: Optional[str] = None,
    lead_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(check_roles(ADMIN_ROLES)),
):
    """Recent integration exchanges for the active workspace (troubleshooting/audit)."""
    query = select(IntegrationLog).where(IntegrationLog.provider == hirebuddha.PROVIDER)
    if direction in ("inbound", "outbound"):
        query = query.where(IntegrationLog.direction == direction)
    if lead_id:
        query = query.where(IntegrationLog.lead_id == lead_id)
    query = query.order_by(IntegrationLog.date.desc(), IntegrationLog.id.desc()).limit(min(limit, 200))
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/hirebuddha/dispatch/{lead_id}", response_model=PipelineLeadResponse)
async def hirebuddha_dispatch_now(
    lead_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(check_roles(ADMIN_ROLES)),
):
    """
    Immediately dispatches one raw lead to HireBuddha (admin testing helper —
    the background worker normally handles this on the workspace cadence).
    """
    settings_row = await pipeline_service.get_settings(db)
    if not hirebuddha.is_configured(settings_row):
        raise HTTPException(
            status_code=409,
            detail="HireBuddha integration is disabled or missing a client id")

    result = await db.execute(select(PipelineLead).where(PipelineLead.id == lead_id))
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Pipeline lead not found")
    if lead.stage != "raw":
        raise HTTPException(status_code=400, detail="Only raw-stage leads can be dispatched")
    if lead.status == hirebuddha.STATUS_IN_PROGRESS:
        raise HTTPException(status_code=409, detail="Lead already has an AI call in progress")

    tenant_id = getattr(request.state, "tenant_id", "public")
    tenant_row = (await db.execute(select(Tenant).where(Tenant.id == tenant_id))).scalars().first()
    accepted = await hirebuddha.dispatch_lead(
        db, lead, settings_row, tenant_row.name if tenant_row else tenant_id)
    await db.commit()

    if not accepted:
        raise HTTPException(
            status_code=502,
            detail=f"HireBuddha did not accept the lead (status: {lead.status}) - "
                   "see the integration logs for the full exchange")
    return lead
