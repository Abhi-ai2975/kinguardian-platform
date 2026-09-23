from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any

# Strict Config for all records
STRICT_CONFIG = ConfigDict(extra="forbid")

# --- Document Specific Configs ---

class DocumentTransformerConfig(BaseModel):
    """Matches the 'transformation' block in your YAML."""
    index_name: str
    textractor: Dict[str, Any]
    segmentation: Dict[str, Any]

class TransformerInputRecord(BaseModel):
    """Validates the raw data coming from Gmail extractor."""
    model_config = STRICT_CONFIG
    id: str
    source_id: str
    source: str
    body: Optional[str] = None
    attachments: List[str]
    metadata: Dict[str, Any]

class TransformerOutputChunk(BaseModel):
    """Validates the chunk before it goes to the BaseTransformer."""
    model_config = STRICT_CONFIG
    id: str
    text: str
    source_id: str
    source: str
    metadata: Dict[str, Any]