"""
app.services.upload_validation — Shared pre-upload validation against project_configs.

Validates the client's declared upload parameters (filename, content_type, size_bytes)
against the project's configured restrictions before a presigned URL is issued.
This is the API-level gate — it runs on declared values, not actual bytes.

The MimeValidationStage in the processing pipeline provides a second layer that
byte-sniffs the actual uploaded content to catch disguised file types.

Usage:
    from app.services.upload_validation import validate_upload_request
    from app.models.project_config import ProjectConfig

    await validate_upload_request(config, filename="report.pdf",
                                  content_type="application/pdf", size_bytes=5_000_000)
"""
from pathlib import Path

from app.errors import FileTooLargeError, ValidationError
from app.models.project_config import ProjectConfig


def validate_upload_request(
    config: ProjectConfig,
    *,
    filename: str,
    content_type: str,
    size_bytes: int,
) -> None:
    """
    Validate declared upload parameters against project_configs restrictions.

    All checks run against the values the client declared — not actual bytes.
    Raises the appropriate domain error on the first violated constraint.

    Args:
        config:       ProjectConfig row for the target project.
        filename:     Client-declared filename (used to extract extension).
        content_type: Client-declared MIME type.
        size_bytes:   Client-declared file size in bytes.

    Raises:
        FileTooLargeError: size_bytes exceeds max_file_size_bytes.
        ValidationError:   content_type not in allowed_mime_types, or
                           file extension not in allowed_extensions.
    """
    if config.max_file_size_bytes and size_bytes > config.max_file_size_bytes:
        raise FileTooLargeError(
            f"File size {size_bytes:,} bytes exceeds the project limit "
            f"of {config.max_file_size_bytes:,} bytes",
            detail={
                "size_bytes": size_bytes,
                "max_file_size_bytes": config.max_file_size_bytes,
            },
        )

    if config.allowed_mime_types:
        allowed = {m.strip().lower() for m in config.allowed_mime_types.split(",")}
        if content_type.lower() not in allowed:
            raise ValidationError(
                f"Content type '{content_type}' is not allowed for this project",
                detail={
                    "content_type": content_type,
                    "allowed_mime_types": list(allowed),
                },
            )

    if config.allowed_extensions:
        allowed_exts = {e.strip().lower() for e in config.allowed_extensions.split(",")}
        ext = Path(filename).suffix.lower()
        if not ext:
            raise ValidationError(
                "Filename must have an extension",
                detail={"filename": filename, "allowed_extensions": list(allowed_exts)},
            )
        if ext not in allowed_exts:
            raise ValidationError(
                f"File extension '{ext}' is not allowed for this project",
                detail={
                    "extension": ext,
                    "allowed_extensions": list(allowed_exts),
                },
            )
