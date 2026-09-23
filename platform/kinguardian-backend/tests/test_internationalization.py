import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.security import get_current_user
from app.core.i18n import (
    SupportedLanguage,
    LanguageMetadata,
    I18nService,
    LANGUAGE_REGISTRY
)
from app.domains.family.infrastructure.models import AppProfile
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.family.application.services import FamilyService


def test_ten_supported_languages_registry():
    """
    Verifies that all 10 required languages are supported:
    en, hi, ta, te, kn, ml, mr, bn, gu, pa
    with English initially active as default.
    """
    expected_codes = ["en", "hi", "ta", "te", "kn", "ml", "mr", "bn", "gu", "pa"]
    languages = I18nService.get_supported_languages()

    assert len(languages) == 10
    actual_codes = [l.code for l in languages]
    for code in expected_codes:
        assert code in actual_codes
        assert I18nService.is_supported(code) is True

    # Unsupported language
    assert I18nService.is_supported("fr") is False
    assert I18nService.is_supported("de") is False

    # English as default
    en_meta = [l for l in languages if l.code == "en"][0]
    assert en_meta.is_default is True
    assert en_meta.name_english == "English"


def test_i18n_translation_and_english_fallback():
    """
    Verifies localization lookup, dynamic variable substitution, and graceful English fallback.
    """
    # 1. English (Default)
    en_med = I18nService.translate("notif.medication.title", lang="en")
    assert en_med == "Medication Reminder"

    en_body = I18nService.translate("notif.medication.body", lang="en", medication_name="Metformin 500mg")
    assert "Metformin 500mg" in en_body

    # 2. Hindi Translation
    hi_med = I18nService.translate("notif.medication.title", lang="hi")
    assert "दवा" in hi_med

    # 3. Telugu Translation
    te_med = I18nService.translate("notif.medication.title", lang="te")
    assert "మందుల రిమైండర్" in te_med

    # 4. Graceful English Fallback for unpopulated key in Kannada/Marathi
    kn_fallback = I18nService.translate("notif.guardian_moment.title", lang="kn", title="Stable BP")
    assert kn_fallback == "Guardian Moment: Stable BP"

    # 5. Invalid language code falls back to English
    invalid_fallback = I18nService.translate("notif.medication.title", lang="xyz")
    assert invalid_fallback == "Medication Reminder"


@pytest.mark.asyncio
async def test_i18n_rest_endpoints_and_user_preference_update(db_session):
    """
    Verifies REST endpoints for language list, translations, and user language preference updates.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    user = await family_svc.get_or_create_profile(
        iam_subject_id="iam_user_i18n_test",
        email="user_i18n@kinguardian.com",
        display_name="Ramesh Coordinator",
        timezone="Asia/Kolkata"
    )

    app_profile = await db_session.get(AppProfile, user.id)
    app.dependency_overrides[get_current_user] = lambda: app_profile

    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. GET /api/v1/i18n/languages
            res_langs = await client.get("/api/v1/i18n/languages")
            assert res_langs.status_code == 200
            langs_data = res_langs.json()
            assert len(langs_data) == 10
            codes = [l["code"] for l in langs_data]
            assert "hi" in codes
            assert "te" in codes
            assert "ta" in codes

            # 2. GET /api/v1/i18n/translations/hi
            res_trans = await client.get("/api/v1/i18n/translations/hi")
            assert res_trans.status_code == 200
            trans_data = res_trans.json()
            assert trans_data["language"] == "hi"
            assert "notif.medication.title" in trans_data["translations"]

            # 3. PATCH /api/v1/i18n/preferences/language -> Update to Hindi ('hi')
            res_update = await client.patch(
                "/api/v1/i18n/preferences/language",
                json={"language": "hi"}
            )
            assert res_update.status_code == 200
            updated = res_update.json()
            assert updated["preferred_language"] == "hi"
            assert updated["language_metadata"]["name_native"] == "हिन्दी"

            # 4. Verify in DB
            db_profile = await db_session.get(AppProfile, user.id)
            assert db_profile.preferred_language == "hi"

            # 5. Invalid language code error
            res_bad = await client.patch(
                "/api/v1/i18n/preferences/language",
                json={"language": "invalid_lang"}
            )
            assert res_bad.status_code == 400
    finally:
        app.dependency_overrides.clear()
