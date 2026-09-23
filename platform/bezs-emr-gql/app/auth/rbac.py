from fastapi import HTTPException, Request, status

from app.auth.models import AuthUser


def require_permission(resource: str, action: str):
    """
    Dependency that checks the caller has `resource:action` in their JWT permissions
    and returns a typed AuthUser built from request.state.user.

    Requires get_current_user to have already run (applied at router level).
    """

    async def _check(request: Request) -> AuthUser:
        user: dict = request.state.user
        permissions: list[str] = user.get("permissions", [])

        if f"{resource}:{action}" not in permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {resource}:{action}",
            )

        return AuthUser(
            sub=user.get("sub", ""),
            org_id=user.get("activeOrganizationId"),
        )

    _check.required_permission = f"{resource}:{action}"
    return _check
