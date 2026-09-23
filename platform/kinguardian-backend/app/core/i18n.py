from enum import Enum
from typing import Dict, List, Any, Optional
from pydantic import BaseModel

from app.core.logging import get_logger

logger = get_logger(__name__)


class SupportedLanguage(str, Enum):
    EN = "en"  # English (Default)
    HI = "hi"  # Hindi (हिन्दी)
    TA = "ta"  # Tamil (தமிழ்)
    TE = "te"  # Telugu (తెలుగు)
    KN = "kn"  # Kannada (ಕನ್ನಡ)
    ML = "ml"  # Malayalam (മലയാളം)
    MR = "mr"  # Marathi (मराठी)
    BN = "bn"  # Bengali (বাংলা)
    GU = "gu"  # Gujarati (ગુજરાતી)
    PA = "pa"  # Punjabi (ਪੰਜਾਬੀ)


class LanguageMetadata(BaseModel):
    code: str
    name_english: str
    name_native: str
    script: str
    is_default: bool = False
    is_active: bool = True


# Registry of Supported Languages
LANGUAGE_REGISTRY: Dict[str, LanguageMetadata] = {
    "en": LanguageMetadata(code="en", name_english="English", name_native="English", script="Latin", is_default=True, is_active=True),
    "hi": LanguageMetadata(code="hi", name_english="Hindi", name_native="हिन्दी", script="Devanagari", is_active=True),
    "ta": LanguageMetadata(code="ta", name_english="Tamil", name_native="தமிழ்", script="Tamil", is_active=True),
    "te": LanguageMetadata(code="te", name_english="Telugu", name_native="తెలుగు", script="Telugu", is_active=True),
    "kn": LanguageMetadata(code="kn", name_english="Kannada", name_native="ಕನ್ನಡ", script="Kannada", is_active=True),
    "ml": LanguageMetadata(code="ml", name_english="Malayalam", name_native="മലയാളം", script="Malayalam", is_active=True),
    "mr": LanguageMetadata(code="mr", name_english="Marathi", name_native="मराठी", script="Devanagari", is_active=True),
    "bn": LanguageMetadata(code="bn", name_english="Bengali", name_native="বাংলা", script="Bengali", is_active=True),
    "gu": LanguageMetadata(code="gu", name_english="Gujarati", name_native="ગુજરાતી", script="Gujarati", is_active=True),
    "pa": LanguageMetadata(code="pa", name_english="Punjabi", name_native="ਪੰਜਾਬੀ", script="Gurmukhi", is_active=True),
}


# System Localization Translation Catalogs
TRANSLATION_CATALOGS: Dict[str, Dict[str, str]] = {
    "en": {
        # General UI & Common
        "app.name": "KinGuardian",
        "welcome.greeting": "Welcome back, {name}!",

        "common.error": "An error occurred. Please try again.",
        "common.success": "Operation completed successfully.",

        # Medication Reminders
        "notif.medication.title": "Medication Reminder",
        "notif.medication.body": "Time to take your scheduled dose: {medication_name}.",
        "notif.medication_missed.parent.title": "Missed Medication Dose",
        "notif.medication_missed.parent.body": "You missed your scheduled {medication_name}. Please take it as soon as possible.",
        "notif.medication_missed.coord.title": "Medication Missed Alert",
        "notif.medication_missed.coord.body": "{parent_name} missed their scheduled {medication_name}.",

        # Check-in Reminders
        "notif.checkin.title": "Daily Wellbeing Check-in",
        "notif.checkin.body": "Good morning {name}! Please share how you are feeling today.",
        "notif.checkin_received.title": "Parent Check-in Received",
        "notif.checkin_received.body": "{parent_name} submitted a check-in: Feeling {feeling}.",

        # Appointment Reminders
        "notif.appointment.title": "Appointment Reminder: Tomorrow",
        "notif.appointment.body": "You have a scheduled visit with {doctor_name} at {appointment_time}.",

        # Guardian Moments & Insights
        "notif.guardian_moment.title": "Guardian Moment: {title}",
        "notif.guardian_moment.body": "{summary}",
    },
    "hi": {
        "app.name": "किनगार्ड",
        "welcome.greeting": "नमस्ते, {name}!",
        "notif.medication.title": "दवा की याद दिलाना",
        "notif.medication.body": "आपकी निर्धारित दवा लेने का समय हो गया है: {medication_name}।",
        "notif.medication_missed.parent.title": "दवा छूट गई है",
        "notif.medication_missed.parent.body": "आपकी {medication_name} की खुराक छूट गई है। कृपया इसे जल्द से जल्द लें।",
        "notif.checkin.title": "दैनिक स्वास्थ्य जांच",
        "notif.checkin.body": "शुभ प्रभात {name}! कृपया बताएं कि आज आप कैसा महसूस कर रहे हैं।",
        "notif.appointment.title": "डॉक्टर से मिलने का रिमाइंडर: कल",
        "notif.appointment.body": "कल {appointment_time} पर {doctor_name} के साथ आपकी मुलाकात तय है।",
    },
    "te": {
        "app.name": "కిన్‌గార్డ్",
        "welcome.greeting": "స్వాగతం, {name}!",
        "notif.medication.title": "మందుల రిమైండర్",
        "notif.medication.body": "మీ మందులు తీసుకునే సమయం అయింది: {medication_name}.",
        "notif.checkin.title": "రోజువారీ శ్రేయస్సు చెకిన్",
        "notif.checkin.body": "శుభోదయం {name}! ఈరోజు మీరు ఎలా ఉన్నారో దయచేసి తెలియజేయండి.",
    },
    "ta": {
        "app.name": "கின்கார்ட்",
        "welcome.greeting": "வணக்கம், {name}!",
        "notif.medication.title": "மருந்து நினைவூட்டல்",
        "notif.medication.body": "மருந்து எடுத்துக்கொள்ளும் நேரம்: {medication_name}.",
    }
}


class I18nService:
    """
    Internationalization Service:
    Manages supported languages (en, hi, ta, te, kn, ml, mr, bn, gu, pa)
    with English as default and graceful fallback.
    """

    DEFAULT_LANGUAGE = "en"

    @classmethod
    def get_supported_languages(cls) -> List[LanguageMetadata]:
        """Returns the list of all 10 supported languages with metadata."""
        return list(LANGUAGE_REGISTRY.values())

    @classmethod
    def is_supported(cls, lang_code: Optional[str]) -> bool:
        """Checks whether a language code is in the supported 10 languages."""
        if not lang_code:
            return False
        return lang_code.strip().lower() in LANGUAGE_REGISTRY

    @classmethod
    def normalize_language(cls, lang_code: Optional[str]) -> str:
        """Normalizes and validates language code, falling back to 'en' if invalid."""
        if not lang_code:
            return cls.DEFAULT_LANGUAGE
        code = lang_code.strip().lower()
        return code if code in LANGUAGE_REGISTRY else cls.DEFAULT_LANGUAGE

    @classmethod
    def translate(
        cls,
        key: str,
        lang: str = "en",
        **kwargs: Any
    ) -> str:
        """
        Translates a message key into the requested language with fallback to English.
        Formats dynamic placeholders with kwargs.
        """
        normalized_lang = cls.normalize_language(lang)
        catalog = TRANSLATION_CATALOGS.get(normalized_lang, {})
        default_catalog = TRANSLATION_CATALOGS.get(cls.DEFAULT_LANGUAGE, {})

        template = catalog.get(key) or default_catalog.get(key, key)

        try:
            return template.format(**kwargs) if kwargs else template
        except KeyError as e:
            logger.warning(f"I18n: Missing placeholder parameter {e} for key '{key}'")
            return template
