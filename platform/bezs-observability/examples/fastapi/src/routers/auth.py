# auth.py — login and logout endpoints.
# Every successful login and logout is recorded as an audit event so the
# security team has a full, tamper-evident authentication history.
import base64
import uuid
from fastapi import APIRouter, HTTPException, Request

from src.models.schemas import LoginRequest, LoginResponse
from src.watcher import client

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory session store — replace with Redis / DB in production.
_sessions: dict[str, str] = {}


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, request: Request) -> LoginResponse:
    """Authenticate a user and audit the login event."""
    if not body.email or not body.password:
        raise HTTPException(status_code=400, detail="email and password required")

    # Fake auth — any credentials succeed in this demo.
    user_id = "user_" + base64.urlsafe_b64encode(body.email.encode()).decode()[:8]
    token = str(uuid.uuid4())
    _sessions[token] = user_id

    # Audit every login — creates a compliance trail with IP and user context.
    client.audit(
        "user.login",
        user_id=user_id,
        payload={
            "email": body.email,
            "ip": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent", ""),
        },
    )

    client.log(
        "info",
        "auth.login.success",
        payload={"user_id": user_id},
    )

    return LoginResponse(user_id=user_id, email=body.email)


@router.post("/logout")
async def logout(user_id: str, request: Request) -> dict:
    """Log out and audit the logout event."""
    client.audit(
        "user.logout",
        user_id=user_id,
        payload={"ip": request.client.host if request.client else "unknown"},
    )
    return {"ok": True}
