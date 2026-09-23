from app.errors.base import ApplicationError


class InfrastructureError(ApplicationError):
    def __init__(self, message: str, cause: Exception | None = None):
        super().__init__(
            name="InfrastructureError",
            message=message,
            status_code=500,
            code="INFRASTRUCTURE_ERROR",
            cause=cause,
            is_operational=False,
        )


class DatabaseError(ApplicationError):
    def __init__(self, message="Database operation failed", cause=None):
        super().__init__(
            name="DatabaseError",
            message=message,
            status_code=500,
            code="DATABASE_ERROR",
            cause=cause,
            is_operational=False,
        )
