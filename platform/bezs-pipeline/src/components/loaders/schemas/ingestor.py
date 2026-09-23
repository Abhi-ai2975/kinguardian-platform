from pydantic import BaseModel
from typing import Dict, Any

class IngestorConfig(BaseModel):

    index_name: str
    settings: Dict[str, Any]
    mappings: Dict[str, Any]
