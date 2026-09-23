from typing import Optional, Dict, Any


class ApplicationError(Exception):
    def __init__(
        self,
        name: str,
        message: str,
        *,
        status_code: int = 500,
        code: str = "APPLICATION_ERROR",
        metadata: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None,
        is_operational: bool = True,
    ):
        super().__init__(message)
        self.name = name
        self.message = message
        self.status_code = status_code
        self.code = code
        self.metadata = metadata
        self.cause = cause
        self.is_operational = is_operational
