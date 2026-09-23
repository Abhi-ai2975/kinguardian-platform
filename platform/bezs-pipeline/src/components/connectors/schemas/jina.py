from pydantic import BaseModel

class JinaConfig(BaseModel):
    """
    Purpose:
        Configuration schema for Jina connections.
    """
    base_url: str
    api_key: str
    timeout: int