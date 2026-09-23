from pydantic import BaseModel

class ArxivConfig(BaseModel):
    """
    Purpose:
        Configuration schema for Arxiv connections.
    """
    base_url: str
    timeout: int