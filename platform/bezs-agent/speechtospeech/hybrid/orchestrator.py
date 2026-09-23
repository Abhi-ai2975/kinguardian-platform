from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, AsyncGenerator, Callable, Awaitable

from speechtospeech.hybrid.stt_provider import HybridSTTProvider
from speechtospeech.webvad import VoiceActivityDetector

logger = logging.getLogger(__name__)


class DiarizationOrchestrator:
    """Manages the full hybrid streaming + batch diarization session lifecycle.

    Runs three concurrent tasks:
      1. _capture_loop     — reads audio chunks, dual-routes to provider
      2. _transcript_loop  — sole consumer of stream_transcripts(), fires callback
      3. _silence_monitor  — tracks VAD silence timeout + max duration cap

    When the session ends, flushes streaming sockets, runs the batch
    diarization pipeline, and returns the final relabeled transcript.
    """

    def __init__(
        self,
        provider: HybridSTTProvider,
        *,
        vad: VoiceActivityDetector | None = None,
        silence_timeout: float = 15.0,
        max_session_duration: float = 600.0,
        on_partial: Callable[[dict[str, Any]], Awaitable[None]] | None = None,
    ):
        self.provider = provider
        self.vad = vad
        self.silence_timeout = silence_timeout
        self.max_session_duration = max_session_duration
        self._on_partial = on_partial or _default_partial_printer

        # Internal coordination
        self._session_done = asyncio.Event()
        self._session_start: float | None = None
        self._live_transcripts: list[str] = []

    async def run(
        self,
        audio_stream: AsyncGenerator[bytes, None],
    ) -> str:
        """Execute the full session and return the final diarized transcript."""
        self._session_start = time.monotonic()
        capture_task: asyncio.Task[None] | None = None
        transcript_task: asyncio.Task[None] | None = None
        monitor_task: asyncio.Task[None] | None = None

        try:
            capture_task = asyncio.create_task(self._capture_loop(audio_stream))
            transcript_task = asyncio.create_task(self._transcript_loop())
            monitor_task = asyncio.create_task(self._silence_monitor())

            done, pending = await asyncio.wait(
                [capture_task, transcript_task, monitor_task],
                return_when=asyncio.FIRST_COMPLETED,
            )

            for task in done:
                exc = task.exception()
                if exc:
                    logger.error("Orchestrator task failed: %s", exc)

            for task in pending:
                task.cancel()
            if pending:
                await asyncio.gather(*pending, return_exceptions=True)

        except asyncio.CancelledError:
            logger.info("DiarizationOrchestrator: session cancelled")
        finally:
            logger.info("DiarizationOrchestrator: flushing and finalizing...")
            await self.provider.flush()

        final_transcript = await self.provider.finalize_with_diarization()
        await self.provider.close()

        self._print_final(final_transcript)
        return final_transcript

    # ------------------------------------------------------------------
    # Concurrent task implementations
    # ------------------------------------------------------------------

    async def _capture_loop(
        self,
        audio_stream: AsyncGenerator[bytes, None],
    ) -> None:
        """Read audio chunks from the source and dual-route them."""
        try:
            async for chunk in audio_stream:
                if chunk is None:
                    continue
                if self._session_done.is_set():
                    return

                try:
                    await self.provider.send_audio(chunk)
                except Exception:
                    logger.exception("capture_loop: send_audio failed, continuing")

                if self.vad:
                    try:
                        self.vad.is_speech(chunk)
                    except Exception:
                        pass

        except asyncio.CancelledError:
            pass
        except Exception:
            logger.exception("capture_loop: audio source error")
        finally:
            self._session_done.set()
            logger.info("capture_loop: finished")

    async def _transcript_loop(self) -> None:
        """Sole consumer of the streaming transcript generator.

        Fires the on_partial callback for each final transcript so the
        caller can forward to WebSocket, terminal, or both.
        """
        try:
            async for transcript in self.provider.stream_transcripts():
                if self._session_done.is_set():
                    return

                text = transcript.get("text", "").strip()
                if not text:
                    continue

                if transcript.get("is_final") and text:
                    self._live_transcripts.append(text)

                try:
                    await self._on_partial(transcript)
                except Exception:
                    pass

        except asyncio.CancelledError:
            pass
        except Exception:
            logger.exception("transcript_loop: stream error")
        finally:
            logger.info("transcript_loop: finished")

    async def _silence_monitor(self) -> None:
        """Watch for VAD silence timeout or max-duration cap."""
        poll_interval = 0.25
        last_logged_remaining: float | None = None

        try:
            while True:
                await asyncio.sleep(poll_interval)

                elapsed = time.monotonic() - self._session_start
                remaining = self.max_session_duration - elapsed

                if remaining <= 0:
                    logger.info("silence_monitor: max session duration reached")
                    self._session_done.set()
                    return

                if last_logged_remaining is None or (last_logged_remaining - remaining) > 30:
                    logger.info("silence_monitor: %.0fs remaining", remaining)
                    last_logged_remaining = remaining

                if self.vad and self.vad.is_silence_timeout():
                    logger.info(
                        "silence_monitor: VAD silence timeout (%.1fs)",
                        self.silence_timeout,
                    )
                    self._session_done.set()
                    return

        except asyncio.CancelledError:
            pass

    # ------------------------------------------------------------------
    # Output
    # ------------------------------------------------------------------

    @staticmethod
    def _print_final(transcript: str) -> None:
        print("\n" + "=" * 64)
        print("FINAL DIARIZED TRANSCRIPT")
        print("=" * 64)
        if transcript.strip():
            print(transcript)
        else:
            print("(no transcript produced)")
        print("=" * 64)


async def _default_partial_printer(transcript: dict[str, Any]) -> None:
    text = transcript.get("text", "").strip()
    if not text:
        return

    is_final = transcript.get("is_final", False)
    language = transcript.get("language")

    if language and language not in ("unknown", "en-IN", "en"):
        print(f"\n[LANG] {language}")

    if is_final:
        print(f"[TRANSCRIPT] {text[:200]}")
    else:
        print(f"\r[DRAFT] {text[:120]}", end="", flush=True)