from pydantic import BaseModel
from typing import Optional

class ApiConfig(BaseModel):
    """
    Purpose:
        Configuration schema for API connections.
    """
    api_key: Optional[str] = None
    timeout: int = 30