"""
Infrastructure FileNest Gateway:
WORM storage adapter and document repository integration.
"""

from app.core.adapters.prod_filenest import FileNestGateway
from app.core.adapters.mock_filenest import MockFileStorageGateway

__all__ = ["FileNestGateway", "MockFileStorageGateway"]
