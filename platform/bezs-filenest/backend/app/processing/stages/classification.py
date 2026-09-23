"""
app.processing.stages.classification — File category classification stage.

Maps file extensions to broad category labels that are stored in the files.category
column. Always runs as the last stage in the pipeline regardless of project config.

Categories: document, image, video, audio, archive, other.

Usage:
    from app.processing.stages.classification import ClassificationStage
    stage = ClassificationStage()
    result = await stage.run("report.pdf", "application/pdf", content)
    print(result.category)  # "document"
"""
from pathlib import Path

from app.processing.stages.base import StageResult

_CATEGORY_MAP: dict[str, str] = {
    # Documents
    ".pdf": "document",
    ".doc": "document",
    ".docx": "document",
    ".xls": "document",
    ".xlsx": "document",
    ".ppt": "document",
    ".pptx": "document",
    ".txt": "document",
    ".rtf": "document",
    ".odt": "document",
    ".ods": "document",
    ".odp": "document",
    ".csv": "document",
    ".md": "document",
    # Images
    ".jpg": "image",
    ".jpeg": "image",
    ".png": "image",
    ".gif": "image",
    ".webp": "image",
    ".svg": "image",
    ".bmp": "image",
    ".tiff": "image",
    ".tif": "image",
    ".ico": "image",
    ".heic": "image",
    ".heif": "image",
    # Video
    ".mp4": "video",
    ".avi": "video",
    ".mov": "video",
    ".mkv": "video",
    ".wmv": "video",
    ".flv": "video",
    ".webm": "video",
    ".m4v": "video",
    ".mpeg": "video",
    ".mpg": "video",
    # Audio
    ".mp3": "audio",
    ".wav": "audio",
    ".flac": "audio",
    ".aac": "audio",
    ".ogg": "audio",
    ".m4a": "audio",
    ".wma": "audio",
    ".opus": "audio",
    # Archives
    ".zip": "archive",
    ".tar": "archive",
    ".gz": "archive",
    ".bz2": "archive",
    ".7z": "archive",
    ".rar": "archive",
    ".tgz": "archive",
    ".xz": "archive",
}


class ClassificationStage:
    """
    Sets the file's category from its extension.

    Pure computation — no I/O, no external dependencies. Always runs last in
    the pipeline so the category is written even when earlier stages short-circuit.
    """

    name = "classification"

    async def run(
        self,
        filename: str,
        declared_content_type: str,
        content: bytes,
    ) -> StageResult:
        """
        Classify the file by its extension.

        Returns:
            StageResult(passed=True, category=<label>). Never fails.
        """
        ext = Path(filename).suffix.lower()
        category = _CATEGORY_MAP.get(ext, "other")
        return StageResult(passed=True, category=category)
