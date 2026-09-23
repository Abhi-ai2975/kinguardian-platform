"""
filenest.fastapi — FastAPI integration helper.

Provides a FastAPI dependency that returns a cached AsyncFileNest client.

Usage in dependencies.py:
    from filenest.fastapi import get_filenest

Usage in routes.py:
    from fastapi import Depends
    from filenest.fastapi import get_filenest

    @router.post("/upload")
    async def upload(fn: AsyncFileNest = Depends(get_filenest)):
        ...
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from filenest.client import AsyncFileNest


@lru_cache(maxsize=1)
def _get_client() -> "AsyncFileNest":
    from filenest.client import AsyncFileNest

    return AsyncFileNest(
        api_key=os.environ["FILENEST_API_KEY"],
        project_id=os.environ["FILENEST_PROJECT_ID"],
        base_url=os.environ.get("FILENEST_BASE_URL", "https://api.filenest.io"),
    )


def get_filenest() -> "AsyncFileNest":
    """FastAPI dependency — returns a shared AsyncFileNest instance."""
    return _get_client()
