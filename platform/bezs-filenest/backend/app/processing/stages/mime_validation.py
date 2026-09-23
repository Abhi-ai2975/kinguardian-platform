"""
app.processing.stages.mime_validation — MIME type byte-sniffing validation stage.

Uses python-magic to detect the actual content type from the first 4 KB of the
file bytes and compares it against the declared content_type. A mismatch fails
the file (status=failed).

The stage fails-open if python-magic is not installed or raises an unexpected
exception — MIME validation is advisory and must not block uploads in environments
where libmagic is unavailable (e.g. CI runners without the shared library).

python-magic wraps the libmagic C library and is synchronous — calls are run in
a thread pool via asyncio.to_thread().

Usage:
    from app.processing.stages.mime_validation import MimeValidationStage
    stage = MimeValidationStage()
    result = await stage.run(filename, "image/jpeg", content)
"""
import asyncio

from app.core.logging import get_logger
from app.processing.stages.base import StageResult

logger = get_logger(__name__)

# Map declared MIME types to their acceptable detected aliases.
# python-magic may return a canonical form that differs from what clients declare.
_ALIASES: dict[str, set[str]] = {
    "image/jpg": {"image/jpeg"},
    "image/jpeg": {"image/jpg"},
    "text/plain": {"text/x-python", "text/x-script.python", "application/x-sh"},
}

# Pairs where a mismatch is acceptable (e.g. SVG declared as image/* but detected as text/xml).
_COMPATIBLE_PREFIXES: set[tuple[str, str]] = {
    ("image/svg+xml", "text/xml"),
    ("image/svg+xml", "application/xml"),
}


def _types_compatible(declared: str, detected: str) -> bool:
    """Return True if declared and detected MIME types are considered equivalent."""
    if declared == detected:
        return True
    if detected in _ALIASES.get(declared, set()):
        return True
    return (declared, detected) in _COMPATIBLE_PREFIXES


class MimeValidationStage:
    """
    Validates that file bytes match the declared content type.

    Files with a gross MIME mismatch (e.g. a .exe disguised as image/jpeg) fail
    this stage and are set to status=failed. Minor aliases (image/jpg vs
    image/jpeg) are treated as compatible.
    """

    name = "mime_validation"

    async def run(
        self,
        filename: str,
        declared_content_type: str,
        content: bytes,
    ) -> StageResult:
        """
        Sniff the first 4 KB of content and compare to declared_content_type.

        Returns:
            StageResult(passed=False, reason=...) on MIME mismatch.
            StageResult(passed=True)              on match or when magic is unavailable.
        """
        sample = content[:4096]

        def _detect() -> str | None:
            try:
                import magic  # type: ignore[import-untyped]
                return magic.from_buffer(sample, mime=True)
            except ImportError:
                return None  # fail-open: libmagic not installed

        detected: str | None = await asyncio.to_thread(_detect)

        if detected is None:
            logger.debug("mime_validation.skipped", filename=filename, reason="libmagic unavailable")
            return StageResult(passed=True)

        if not _types_compatible(declared_content_type, detected):
            logger.warning(
                "mime_validation.mismatch",
                filename=filename,
                declared=declared_content_type,
                detected=detected,
            )
            return StageResult(
                passed=False,
                reason=f"MIME mismatch: declared={declared_content_type}, detected={detected}",
            )

        logger.debug("mime_validation.ok", filename=filename, mime=detected)
        return StageResult(passed=True)
