"""
Open Wearables Webhook Ingress Router.
Receives real-time data sync, connection change, and anomaly notifications from Open Wearables.

Endpoints:
- POST /integrations/open-wearables/webhook
- POST /webhooks/open-wearables

Security & Verification:
- HMAC-SHA256 signature verification (X-Open-Wearables-Signature)
- Replay attack defense with timestamp drift tolerance window
- Idempotency protection to prevent duplicate event ingestion
- Zero-PHI operational request logging (no raw biometrics in logs)
- Strongly typed event validation
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.logging import get_logger
from app.domains.wearables.services import WearableService
from app.domains.wearables.schemas import OpenWearablesWebhookPayload
from app.domains.wearables.webhook_security import WebhookSecurityVerifier

logger = get_logger(__name__)

router = APIRouter(
    tags=["Webhooks & Integrations"]
)


def get_wearable_service(session: AsyncSession = Depends(get_db)) -> WearableService:
    return WearableService(session=session)


async def _handle_webhook_ingress(
    request: Request,
    payload: OpenWearablesWebhookPayload,
    service: WearableService,
    signature_header: Optional[str],
    timestamp_header: Optional[str]
) -> Dict[str, Any]:
    body_bytes = await request.body()

    # 1. Verify Authenticity / Cryptographic Signature (HMAC-SHA256)
    if signature_header:
        if not WebhookSecurityVerifier.verify_signature(body_bytes, signature_header):
            logger.warning("Open Wearables webhook signature verification failed.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or unverified webhook signature."
            )
        signature_verified = True
    else:
        signature_verified = False

    # 2. Replay Protection: Check timestamp window (drift <= 300s)
    if not WebhookSecurityVerifier.verify_timestamp(payload.timestamp, timestamp_header):
        logger.warning("Open Wearables webhook rejected due to timestamp drift / replay detection.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Webhook timestamp outside acceptable drift window (replay protection triggered)."
        )

    # 3. Idempotency Check: Prevent duplicate processing of the same delivery/event_id
    event_id = payload.event_id or request.headers.get("X-Open-Wearables-Delivery-ID")
    if event_id and WebhookSecurityVerifier.is_duplicate(event_id):
        logger.info(f"Open Wearables webhook duplicate event {event_id} ignored (idempotent response).")
        return {
            "status": "duplicate",
            "message": "Event already processed (idempotent).",
            "event_id": event_id
        }

    # 4. Zero-PHI Request Logging (metadata only, no health/biometric payloads)
    WebhookSecurityVerifier.log_webhook_metadata(
        payload=payload,
        content_length=len(body_bytes),
        signature_verified=signature_verified
    )

    # 5. Process Inbound Webhook Event & Downstream Side Effects
    result = await service.process_inbound_webhook(payload)

    # 6. Mark Event ID as processed
    if event_id:
        WebhookSecurityVerifier.mark_processed(event_id)

    return {"status": "success", "result": result}


@router.post(
    "/integrations/open-wearables/webhook",
    summary="Inbound webhook receiver from Open Wearables platform (/integrations/open-wearables/webhook)"
)
async def receive_integrations_open_wearables_webhook(
    request: Request,
    payload: OpenWearablesWebhookPayload,
    service: WearableService = Depends(get_wearable_service),
    x_open_wearables_signature: Optional[str] = Header(None, alias="X-Open-Wearables-Signature"),
    x_signature_sha256: Optional[str] = Header(None, alias="X-Signature-SHA256"),
    x_open_wearables_timestamp: Optional[str] = Header(None, alias="X-Open-Wearables-Timestamp")
):
    sig = x_open_wearables_signature or x_signature_sha256
    return await _handle_webhook_ingress(
        request=request,
        payload=payload,
        service=service,
        signature_header=sig,
        timestamp_header=x_open_wearables_timestamp
    )


@router.post(
    "/webhooks/open-wearables",
    summary="Inbound webhook receiver alias (/webhooks/open-wearables)"
)
async def receive_webhooks_open_wearables(
    request: Request,
    payload: OpenWearablesWebhookPayload,
    service: WearableService = Depends(get_wearable_service),
    x_open_wearables_signature: Optional[str] = Header(None, alias="X-Open-Wearables-Signature"),
    x_signature_sha256: Optional[str] = Header(None, alias="X-Signature-SHA256"),
    x_open_wearables_timestamp: Optional[str] = Header(None, alias="X-Open-Wearables-Timestamp")
):
    sig = x_open_wearables_signature or x_signature_sha256
    return await _handle_webhook_ingress(
        request=request,
        payload=payload,
        service=service,
        signature_header=sig,
        timestamp_header=x_open_wearables_timestamp
    )
