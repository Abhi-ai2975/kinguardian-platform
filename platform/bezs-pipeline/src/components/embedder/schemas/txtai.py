from pydantic import BaseModel

class EmbeddingsConfig(BaseModel):
    """
    Configuration for txtai embeddings model.
    """
    # Required fields for embedding functionality
    path: str
    content: bool
    backend: str