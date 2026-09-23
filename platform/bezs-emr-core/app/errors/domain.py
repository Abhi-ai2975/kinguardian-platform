from app.errors.base import ApplicationError


class BusinessRuleViolationError(ApplicationError):
    def __init__(self, message: str, metadata=None):
        super().__init__(
            name="BusinessRuleViolationError",
            message=message,
            status_code=422,
            code="BUSINESS_RULE_VIOLATION",
            metadata=metadata,
        )


class ResourceConflictError(ApplicationError):
    def __init__(self, message: str):
        super().__init__(
            name="ResourceConflictError",
            message=message,
            status_code=409,
            code="RESOURCE_CONFLICT",
        )
