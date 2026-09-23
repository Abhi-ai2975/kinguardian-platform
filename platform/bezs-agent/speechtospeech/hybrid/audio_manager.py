from __future__ import annotations

import asyncio
import logging
import os
import tempfile
import uuid
import wave

logger = logging.getLogger(__name__)


class AudioBufferManager:
    """Thread-safe accumulator for raw PCM16 audio bytes.

    Appends incoming PCM chunks in memory and writes a valid mono 16-bit
    PCM WAV file on demand for batch processing.
    """

    def __init__(
        self,
        session_id: str | None = None,
        sample_rate: int = 16000,
        vault_dir: str | None = None,
    ):
        self.session_id = session_id or uuid.uuid4().hex[:12]
        self.sample_rate = sample_rate
        self._chunks: list[bytes] = []
        self._total_bytes: int = 0
        self._lock = asyncio.Lock()
        self._wav_path: str | None = None

        self._vault_dir = vault_dir
        if self._vault_dir:
            os.makedirs(self._vault_dir, exist_ok=True)

    async def append_chunk(self, byte_data: bytes) -> None:
        if not byte_data:
            return
        async with self._lock:
            self._chunks.append(byte_data)
            self._total_bytes += len(byte_data)

    async def get_wav_file(self) -> str | None:
        """Write accumulated PCM data to a temp WAV file and return its path.

        Returns None if the buffer is empty.
        """
        async with self._lock:
            if self._total_bytes == 0:
                logger.warning("AudioBufferManager: buffer empty, no WAV to write")
                return None

            if self._vault_dir:
                path = os.path.join(
                    self._vault_dir,
                    f"session_{self.session_id}.wav",
                )
            else:
                fd, path = tempfile.mkstemp(
                    suffix=".wav",
                    prefix=f"session_{self.session_id}_",
                )
                os.close(fd)

            try:
                with wave.open(path, "wb") as wf:
                    wf.setnchannels(1)
                    wf.setsampwidth(2)  # 16-bit
                    wf.setframerate(self.sample_rate)
                    for chunk in self._chunks:
                        wf.writeframes(chunk)
            except Exception:
                logger.exception("AudioBufferManager: failed to write WAV file")
                try:
                    os.unlink(path)
                except OSError:
                    pass
                return None

            self._wav_path = path
            logger.info(
                "AudioBufferManager: wrote WAV — session=%s size=%d path=%s",
                self.session_id,
                self._total_bytes,
                path,
            )
            return path

    @property
    def total_duration_seconds(self) -> float:
        return self._total_bytes / (self.sample_rate * 2)

    async def cleanup(self) -> None:
        async with self._lock:
            if self._wav_path and os.path.exists(self._wav_path):
                try:
                    os.unlink(self._wav_path)
                    logger.debug("AudioBufferManager: deleted %s", self._wav_path)
                except OSError:
                    logger.exception("AudioBufferManager: failed to delete WAV")
            self._wav_path = None
            self._chunks.clear()
            self._total_bytes = 0

    def __len__(self) -> int:
        return self._total_bytes