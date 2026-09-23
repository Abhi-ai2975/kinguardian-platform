from typing import Optional
from pydantic import BaseModel


class DocumentUploadResponse(BaseModel):
    file_id: str
    filename: str
    mime_type: str
    size_bytes: int
    status: str
    classification: Optional[str] = None
