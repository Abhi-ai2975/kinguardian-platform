"""
filenest — FileNest Python SDK.

Provides sync (FileNest) and async (AsyncFileNest) clients for the FileNest API,
plus a standalone webhook signature verification function.

Usage:
    from filenest import FileNest, AsyncFileNest, verify_webhook_signature

    fn = FileNest(api_key=os.environ["FILENEST_API_KEY"], project_id="proj_...")
    file = fn.files.upload(filename="report.pdf", data=pdf_bytes)
"""

from filenest.client import AsyncFileNest, FileNest
from filenest.namespaces.webhooks import verify_webhook_signature

__all__ = ["FileNest", "AsyncFileNest", "verify_webhook_signature"]
__version__ = "0.1.0"
