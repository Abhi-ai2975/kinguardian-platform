from pydantic import BaseModel, ConfigDict
from typing import Optional

class OpensearchConfig(BaseModel):
    """
    Purpose:
        Configuration schema for Opensearch connections.
    """
    model_config = ConfigDict(protected_namespaces=())

    schema: str
    host: str
    port: int
    verify_certs: bool = True
    ca_certs: Optional[str] = None