from pydantic import BaseModel, ConfigDict
from typing import Optional

class S3Config(BaseModel):
    model_config = ConfigDict(protected_namespaces=(), extra="ignore")
    
    login: str          # Required
    password: str       # Required
    host: str           # Required (from your JSON)
    region_name: str    # Required (from your JSON)
    # ... keep other optional fields as they were