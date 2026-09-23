from pydantic import BaseModel
from typing import List

class RDBMSLoaderConfig(BaseModel):
    table_name: str
    columns: List[str]
