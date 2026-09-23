from app.errors.base import ApplicationError


class InputValidationError(ApplicationError):
    def __init__(self, errors: list[dict]):
        super().__init__(
            name="InputValidationError",
            message="Input validation failed",
            status_code=400,
            code="INPUT_VALIDATION_ERROR",
            metadata={"errors": errors},
        )
        self.errors = errors
