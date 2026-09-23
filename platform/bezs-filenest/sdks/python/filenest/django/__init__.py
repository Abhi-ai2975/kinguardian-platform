"""
filenest.django — Django integration helper.

Reads FILENEST settings from django.conf.settings and returns a cached
FileNest client instance.

Usage in settings.py:
    FILENEST = {
        "API_KEY": env("FILENEST_API_KEY"),
        "PROJECT_ID": env("FILENEST_PROJECT_ID"),
    }

Usage in views.py:
    from filenest.django import get_filenest
    fn = get_filenest()
    file = fn.files.upload(...)
"""

from __future__ import annotations

from functools import lru_cache
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from filenest.client import FileNest


@lru_cache(maxsize=1)
def get_filenest() -> "FileNest":
    """Return a cached FileNest client configured from Django settings."""
    from django.conf import settings  # type: ignore[import]
    from filenest.client import FileNest

    cfg = getattr(settings, "FILENEST", {})
    return FileNest(
        api_key=cfg["API_KEY"],
        project_id=cfg["PROJECT_ID"],
        base_url=cfg.get("BASE_URL", "https://api.filenest.io"),
    )
