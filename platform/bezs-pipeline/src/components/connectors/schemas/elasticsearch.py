from pydantic import BaseModel, ConfigDict
from typing import Optional

class ElasticsearchConfig(BaseModel):
    """
    Purpose:
        Configuration schema for Elasticsearch connections.
    """
    model_config = ConfigDict(protected_namespaces=())

    schema: str
    host: str
    port: int
    verify_certs: bool = True
    ca_certs: Optional[str] = None #Certificate Authority (Public CA)

    #verify_certs=True
    #ca_certs="/etc/ssl/certs/internal-ca.pem" , Internal/Self-signedCA (most enterprises)
    
    #must provide CA explicitly
    #Not trusted by OS
    #Python has no idea about it
    #with out this : TLS verification fails
    #Connection is blocked (correct behavior)