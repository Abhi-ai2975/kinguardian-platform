from __future__ import annotations

import asyncio
import glob
import json
import logging
from typing import Any, AsyncGenerator

from sarvamai import AsyncSarvamAI

from speechtospeech.hybrid.audio_manager import AudioBufferManager
from speechtospeech.providers.stt.streamsarvam import SarvamStreamingSTTProvider

logger = logging.getLogger(__name__)


class HybridSTTProvider:
    """Composes streaming STT with post-hoc batch speaker diarization.

    Dual-routes incoming audio bytes to both a live WebSocket transcription
    stream AND an on-disk audio cache. When the session ends, uploads the
    cached WAV file to Sarvam's Batch STT endpoint with diarization enabled
    and returns the speaker-attributed dialogue transcript with Doctor/Patient
    labels.
    """

    def __init__(
        self,
        api_key: str,
        streaming_model: str = "saaras:v3",
        batch_model: str = "saarika:v2.5",
        language_code: str = "unknown",
        sample_rate: int = 16000,
        num_speakers: int = 2,
        session_id: str | None = None,
    ):
        self.language_code = language_code
        self.sample_rate = sample_rate
        self.num_speakers = num_speakers
        self.batch_model = batch_model

        self._streaming = SarvamStreamingSTTProvider(
            api_key=api_key,
            language_code=language_code,
            model=streaming_model,
            sample_rate=sample_rate,
        )

        self._buffer = AudioBufferManager(
            session_id=session_id,
            sample_rate=sample_rate,
            vault_dir="./vault",
        )

        self._batch_client = AsyncSarvamAI(api_subscription_key=api_key)
        self._streaming_transcript_lines: list[str] = []

    # ------------------------------------------------------------------
    # Delegated streaming interface
    # ------------------------------------------------------------------

    async def connect(self) -> None:
        await self._streaming.connect()

    async def send_audio(self, audio_bytes: bytes) -> None:
        if not audio_bytes:
            return
        send_task = asyncio.create_task(self._streaming.send_audio(audio_bytes))
        await self._buffer.append_chunk(audio_bytes)
        try:
            await send_task
        except Exception:
            logger.exception("HybridSTTProvider: streaming send_audio failed")

    async def stream_transcripts(self) -> AsyncGenerator[dict[str, Any], None]:
        async for transcript in self._streaming.stream_transcripts():
            text = transcript.get("text", "")
            if transcript.get("is_final") and text.strip():
                self._streaming_transcript_lines.append(text.strip())
            yield transcript

    async def update_config(self, language_code: str) -> None:
        await self._streaming.update_config(language_code)

    async def flush(self) -> None:
        await self._streaming.flush()

    async def close(self) -> None:
        await self._streaming.close()
        await self._buffer.cleanup()

    # ------------------------------------------------------------------
    # Post-processing pipeline
    # ------------------------------------------------------------------

    async def finalize_with_diarization(self) -> str:
        """Execute the batch diarization pipeline and return the transcript."""
        wav_path = await self._buffer.get_wav_file()

        if wav_path is None:
            logger.warning("No audio buffered, returning stream transcript")
            return "\n".join(self._streaming_transcript_lines)

        segments = await self._run_batch_diarization(wav_path)

        if not segments:
            logger.warning("Batch diarization returned no segments, falling back")
            return "\n".join(self._streaming_transcript_lines)

        transcript = _relabel_segments(segments)
        await self._buffer.cleanup()
        return transcript

    async def _run_batch_diarization(self, wav_path: str) -> list[dict[str, Any]]:
        """Upload WAV to Sarvam job-based STT API with diarization enabled."""
        try:
            job = await self._batch_client.speech_to_text_job.create_job(
                model=self.batch_model,
                language_code=self.language_code,
                with_diarization=True,
                with_timestamps=True,
                num_speakers=self.num_speakers,
            )
            logger.info("Batch job created: %s", job.job_id)

            await job.upload_files(file_paths=[wav_path])
            logger.info("Batch job: file uploaded")

            await job.start()
            logger.info("Batch job: started, waiting...")

            await job.wait_until_complete(poll_interval=3)
            logger.info("Batch job: completed")

            results = await job.get_file_results()

            if results and isinstance(results, dict):
                for item in results.get("successful", []):
                    segments = _parse_diarized_response(item)
                    if segments:
                        return segments

            output_dir = f"./vault/job_output_{job.job_id}"
            downloaded = await job.download_outputs(output_dir=output_dir)
            if downloaded:
                for jf in glob.glob(f"{output_dir}/**/*.json", recursive=True):
                    with open(jf) as fh:
                        data = json.load(fh)
                    segments = _parse_diarized_response(data)
                    if segments:
                        return segments

            logger.warning("Batch job: no diarized segments found")
            return []

        except Exception:
            logger.exception("Batch diarization API call failed")
            return []


# ---------------------------------------------------------------------------
# Response parser
# ---------------------------------------------------------------------------

def _parse_diarized_response(response: Any) -> list[dict[str, Any]]:
    """Extract diarized segments from a Sarvam batch STT response.

    Returns a list of {speaker_id, text, start, end} dicts.
    """
    segments: list[dict[str, Any]] = []

    dt = getattr(response, "diarized_transcript", None)
    if dt is not None:
        entries = getattr(dt, "entries", None) or dt
        for entry in entries:
            segments.append({
                "speaker_id": str(getattr(entry, "speaker_id", "0")),
                "text": getattr(entry, "transcript", ""),
                "start": getattr(entry, "start_time_seconds", 0.0),
                "end": getattr(entry, "end_time_seconds", 0.0),
            })
        return segments

    if isinstance(response, dict):
        raw = response.get("diarized_transcript") or response.get("segments") or []
        if isinstance(raw, dict):
            raw = raw.get("entries", [])
        for seg in raw:
            segments.append({
                "speaker_id": str(seg.get("speaker_id", seg.get("speaker", "0"))),
                "text": seg.get("transcript", seg.get("text", "")),
                "start": seg.get("start_time_seconds", seg.get("start", 0.0)),
                "end": seg.get("end_time_seconds", seg.get("end", 0.0)),
            })
        return segments

    try:
        for seg in response:
            if hasattr(seg, "speaker_id"):
                segments.append({
                    "speaker_id": str(getattr(seg, "speaker_id", "")),
                    "text": getattr(seg, "transcript", getattr(seg, "text", "")),
                    "start": getattr(seg, "start_time_seconds", getattr(seg, "start", 0.0)),
                    "end": getattr(seg, "end_time_seconds", getattr(seg, "end", 0.0)),
                })
    except TypeError:
        pass

    return segments

# Speaker relabeling

def _relabel_segments(segments: list[dict[str, Any]]) -> str:
    """Relabel numeric speaker IDs as Doctor / Patient.

    Heuristic: the speaker with the most total characters is labeled Doctor
    (doctors typically speak more in clinical consultations).
    """
    chars_by_speaker: dict[str, int] = {}
    for seg in segments:
        sid = seg["speaker_id"]
        chars_by_speaker[sid] = chars_by_speaker.get(sid, 0) + len(seg.get("text", ""))

    ids = sorted(chars_by_speaker, key=lambda k: chars_by_speaker[k], reverse=True)

    if len(ids) == 0:
        return "\n".join(f"Speaker_{seg['speaker_id']}: {seg['text']}" for seg in segments)

    doctor_id = ids[0]
    patient_id = ids[1] if len(ids) > 1 else None

    label_map = {doctor_id: "Doctor"}
    if patient_id:
        label_map[patient_id] = "Patient"
    for sid in ids[2:]:
        label_map[sid] = f"Speaker_{sid}"

    labeled: list[str] = []
    for seg in segments:
        speaker = label_map.get(seg["speaker_id"], f"Speaker_{seg['speaker_id']}")
        labeled.append(f"{speaker}: {seg['text']}")

    return "\n".join(labeled)
