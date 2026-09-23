
from __future__ import annotations

import io
import numpy as np
import soundfile as sf
from .signal import Signal


class AudioProcessor:
    """
    Universal audio processor for STT and TTS.

    Features:
    - convert stereo → mono
    - resample audio
    - numpy → wav bytes
    - wav bytes → numpy
    - float → PCM16 (for streaming)
    """

    def __init__(self, target_rate: int = 16000):
        self.target_rate = target_rate

    # AUDIO NORMALIZATION (Used before STT)

    def process(self, raw: np.ndarray, rate: int) -> np.ndarray:
        """
        Normalize audio for STT.

        Steps:
        - convert stereo → mono
        - resample to target rate
        """

        if raw.ndim > 1:
            raw = Signal.mono(raw)

        if rate != self.target_rate:
            raw = Signal.resample(raw, rate, self.target_rate)

        return raw

    # NUMPY → WAV BYTES (Send to STT APIs)
    def to_bytes(self, audio: np.ndarray) -> bytes:
        """
        Convert numpy audio → WAV bytes
        """

        buffer = io.BytesIO()

        sf.write(
            buffer,
            audio,
            self.target_rate,
            format="WAV"
        )

        buffer.seek(0)

        return buffer.read()

    # WAV BYTES → NUMPY (Used for TTS responses)

    def bytes_to_array(
        self,
        audio_bytes: bytes,
        make_mono: bool = True
    ):

        buffer = io.BytesIO(audio_bytes)

        audio, sr = sf.read(buffer, dtype="float32")

        if audio.size == 0:
            raise RuntimeError("Audio decoded but empty")

        if make_mono and audio.ndim > 1:
            audio = Signal.mono(audio)

        if sr != self.target_rate:
            audio = Signal.resample(audio, sr, self.target_rate)
            sr = self.target_rate

        return audio, sr

    # NUMPY → WAV BYTES (for browser/websocket)
    
    def array_to_wav_bytes(
        self,
        audio: np.ndarray,
        sr: int
    ) -> bytes:

        buffer = io.BytesIO()

        sf.write(
            buffer,
            audio,
            sr,
            format="WAV"
        )

        buffer.seek(0)

        return buffer.read()

    # FLOAT32 → PCM16 (for streaming audio)
    def float_to_pcm16(self, audio: np.ndarray) -> bytes:
        """
        Convert float audio (-1 to 1) → PCM16
        Used for realtime streaming.
        """

        audio_int16 = (
            np.clip(audio, -1, 1) * 32767
        ).astype(np.int16)

        return audio_int16.tobytes()