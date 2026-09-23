"""app.di.dependencies — per-request FastAPI service dependency factories."""
from app.di.dependencies.file import get_file_service
from app.di.dependencies.project import get_project_service
from app.di.dependencies.storage_config import get_storage_config_service

__all__ = ["get_project_service", "get_file_service", "get_storage_config_service"]
