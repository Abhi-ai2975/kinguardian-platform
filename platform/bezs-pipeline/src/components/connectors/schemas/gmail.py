from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class GmailConfig(BaseModel):
    # These are required for the connector to function
    refresh_token: str
    token_uri: str          # https://oauth2.googleapis.com/token
    client_id: str          # 
    client_secret: str
    scopes: List[str]
    
    # These were in our logs; add them as optional to avoid validation errors
    universe_domain: Optional[str] = None   # googleapis.com
    account: Optional[str] = None           # user's email
    expiry: Optional[str] = None            # token expiry time
    
    model_config = ConfigDict(extra="ignore") # Ignore standard Airflow fields like 'host'