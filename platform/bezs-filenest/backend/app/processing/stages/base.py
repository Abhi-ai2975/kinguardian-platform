"""
app.processing.stages.base — Stage interface and result type for the processing pipeline.

Every stage receives the file's filename, declared content_type, and raw bytes.
It returns a StageResult describing whether the stage passed or failed and why.

Usage:
    from app.processing.stages.base import StageResult, ProcessingStage
"""
from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable


@dataclass
class StageResult:
    """
    Outcome from a single pipeline stage.

    Attributes:
        passed:   True if the file may continue through the pipeline.
        reason:   Human-readable explanation when passed=False.
        category: Populated by ClassificationStage; None for all other stages.
    """

    passed: bool
    reason: str | None = field(default=None)
    category: str | None = field(default=None)


@runtime_checkable
class ProcessingStage(Protocol):
    """Structural interface every pipeline stage must satisfy."""

    name: str

    async def run(
        self,
        filename: str,
        declared_content_type: str,
        content: bytes,
    ) -> StageResult: ...
