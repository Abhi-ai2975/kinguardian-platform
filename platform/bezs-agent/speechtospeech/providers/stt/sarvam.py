from __future__ import annotations

import logging
from pathlib import Path

from sarvamai import AsyncSarvamAI

from .base import BaseSTTProvider

logger = logging.getLogger(__name__)


class SarvamSTTProvider(BaseSTTProvider):

    def __init__(
        self,
        api_key: str,
        model: str = "saarika:v2.5",
        language_code: str = "en-IN",
    ):
        self.client = AsyncSarvamAI(
            api_subscription_key=api_key
        )

        self.model = model
        self.language_code = language_code

    async def transcribe(
        self,
        audio_file: str,
    ) -> str:

        file_path = Path(audio_file)

        if not file_path.exists():
            raise FileNotFoundError(
                f"Audio file not found: {audio_file}"
            )

        logger.info(
            f"Transcribing file: {audio_file}"
        )

        with open(file_path, "rb") as audio:

            response = await self.client.speech_to_text.transcribe(
                file=audio,
                model=self.model,
                language_code=self.language_code,
            )

        logger.info("Transcription completed")

        # Debug once to see actual response structure
        logger.debug(response)

        # Usually Sarvam returns transcript text
        if hasattr(response, "transcript"):
            return response.transcript

        if isinstance(response, dict):
            return response.get("transcript", "")

        return str(response)