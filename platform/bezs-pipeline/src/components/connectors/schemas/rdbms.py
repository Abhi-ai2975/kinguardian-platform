from pydantic import BaseModel, Field, AliasChoices
from typing import Optional

class RDBMSConfig(BaseModel):
    """
    Configuration schema for RDBMS connections.
    """
    
    type: str
    host: str
    port: int
    login: str
    password: Optional[str]

    # This tells Pydantic: "Try to find 'database' first. 
    # If it's not there, look for 'schema'."
    database: str = Field(validation_alias=AliasChoices('database', 'schema'))