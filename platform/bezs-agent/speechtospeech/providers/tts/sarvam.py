from __future__ import annotations

import base64
import logging
from pathlib import Path

from sarvamai import AsyncSarvamAI

from .base import BaseTTSProvider

logger = logging.getLogger(__name__)


class SarvamTTSProvider(BaseTTSProvider):

    def __init__(
        self,
        api_key: str,
        target_language_code: str = "en-IN",
        speaker: str = "anushka",
    ):
        self.client = AsyncSarvamAI(
            api_subscription_key=api_key
        )

        self.target_language_code = target_language_code
        self.speaker = speaker

    async def synthesize(
        self,
        text: str,
        output_file: str,
    ) -> str:

        if not text.strip():
            raise ValueError("Text cannot be empty")

        logger.info("Generating speech")

        response = await self.client.text_to_speech.convert(
            text=text,
            target_language_code=self.target_language_code,
            speaker=self.speaker,
        )

        # Sarvam returns base64 audio
        audio_base64 = response.audios[0]

        audio_bytes = base64.b64decode(audio_base64)

        output_path = Path(output_file)

        output_path.parent.mkdir(
            parents=True,
            exist_ok=True
        )

        with open(output_path, "wb") as f:
            f.write(audio_bytes)

        logger.info(
            f"Audio saved: {output_file}"
        )

        return str(output_path)