"""
app.processing.stages.virus_scan — ClamAV virus scanning stage.

Connects to the clamd TCP socket (default: clamav:3310 in Docker Compose) and
streams file bytes via the INSTREAM command. If clamd reports FOUND the file
is quarantined; all other outcomes (OK, ERROR, or clamd unavailable) propagate
as exceptions so PipelineExecutor can mark the file failed.

python-clamd is a synchronous library — calls are offloaded to a thread pool
via asyncio.to_thread() to avoid blocking the event loop.

Usage:
    from app.processing.stages.virus_scan import VirusScanStage
    stage = VirusScanStage(host="clamav", port=3310)
    result = await stage.run(filename, content_type, content)
"""
import asyncio
import io

from app.core.logging import get_logger
from app.processing.stages.base import StageResult

logger = get_logger(__name__)


class VirusScanStage:
    """
    Sends file bytes to ClamAV via INSTREAM and returns a quarantine/pass result.

    Args:
        host:    Hostname of the clamd daemon (Docker Compose service name).
        port:    TCP port clamd listens on (default 3310).
        timeout: Seconds to wait for clamd before raising RuntimeError. ClamAV
                 takes 1–3 minutes on startup to load its virus definitions.
    """

    name = "virus_scan"

    def __init__(self, host: str = "clamav", port: int = 3310, timeout: int = 300) -> None:
        self._host = host
        self._port = port
        self._timeout = timeout

    async def run(
        self,
        filename: str,
        declared_content_type: str,
        content: bytes,
    ) -> StageResult:
        """
        Scan content bytes against ClamAV.

        Returns:
            StageResult(passed=False, reason=...) when a virus is found.
            StageResult(passed=True)              when the scan is clean.

        Raises:
            RuntimeError: If clamd is unreachable, times out, or returns an
                          unexpected error. PipelineExecutor catches this and
                          marks the file failed.
        """
        host, port, timeout = self._host, self._port, self._timeout

        def _scan() -> dict:
            try:
                import clamd
            except ImportError as exc:
                raise RuntimeError("python-clamd is not installed") from exc
            cd = clamd.ClamdNetworkSocket(host=host, port=port, timeout=timeout)
            return cd.instream(io.BytesIO(content))

        try:
            result: dict = await asyncio.wait_for(
                asyncio.to_thread(_scan), timeout=float(timeout)
            )
        except asyncio.TimeoutError as exc:
            raise RuntimeError(
                f"ClamAV scan timed out after {timeout}s for '{filename}' — "
                "clamd may still be loading virus definitions"
            ) from exc
        status, virus_name = result.get("stream", ("ERROR", None))

        if status == "FOUND":
            logger.warning(
                "virus_scan.found",
                filename=filename,
                virus=virus_name,
            )
            return StageResult(passed=False, reason=f"Virus detected: {virus_name}")

        if status == "ERROR":
            raise RuntimeError(f"ClamAV scan error for '{filename}': {virus_name}")

        logger.debug("virus_scan.clean", filename=filename)
        return StageResult(passed=True)
