from pydantic import BaseModel
from typing import Dict, List

class JinaEmbeddingRequest(BaseModel):
    """Request model for Jina embeddings API."""

    model: str
    task: str
    dimensions: int
    late_chunking: bool
    embedding_type: str     # The standard format. Each number in the vector is a 32-bit decimal (e.g., 0.1234567)
    input: List[str]


class JinaEmbeddingResponse(BaseModel):
    """Response model from Jina embeddings API."""

    model: str
    object: str
    usage: Dict[str, int]
    data: List[Dict]