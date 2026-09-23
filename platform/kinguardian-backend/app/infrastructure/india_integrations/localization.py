"""
Indian Languages & AI Voice Localization Interface Contracts:
Defines protocols for Indian language translation, transliteration, and TTS/STT:
- Bhashini (AI4Bharat / National Language Translation Mission)
- IndicTrans & IndicWav2Vec
- Support for: Hindi, Telugu, Tamil, Kannada, Bengali, Marathi, Gujarati, Malayalam, Punjabi
"""

from typing import Protocol, Dict, Any, List, Optional
from dataclasses import dataclass


SUPPORTED_INDIAN_LANGUAGES = [
    "hi",  # Hindi
    "te",  # Telugu
    "ta",  # Tamil
    "kn",  # Kannada
    "bn",  # Bengali
    "mr",  # Marathi
    "gu",  # Gujarati
    "ml",  # Malayalam
    "pa",  # Punjabi
    "en"   # Indian English
]


@dataclass(frozen=True)
class TranslationResult:
    source_language: str
    target_language: str
    original_text: str
    translated_text: str
    confidence: float = 0.95


class IIndianLanguageService(Protocol):
    """Protocol for Indian language translation, transliteration, and voice processing."""

    async def translate_text(
        self,
        text: str,
        source_lang: str,
        target_lang: str
    ) -> TranslationResult:
        """Translates clinical or conversational text between Indian languages."""
        ...

    async def speech_to_text_indic(
        self,
        audio_bytes: bytes,
        language_code: str
    ) -> str:
        """Converts Indian language voice note to text (e.g. Bhashini ASR)."""
        ...

    async def text_to_speech_indic(
        self,
        text: str,
        language_code: str,
        voice_gender: str = "FEMALE"
    ) -> bytes:
        """Synthesizes speech in Indian regional accents."""
        ...
