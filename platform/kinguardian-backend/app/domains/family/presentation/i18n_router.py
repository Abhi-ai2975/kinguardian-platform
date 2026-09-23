from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.i18n import I18nService, LanguageMetadata, SupportedLanguage, TRANSLATION_CATALOGS
from app.domains.family.infrastructure.models import AppProfile
from app.domains.family.infrastructure.repositories import SQLAlchemyAppProfileRepository

router = APIRouter(prefix="/i18n", tags=["Internationalization & Localization"])


class UserLanguageUpdateRequest(BaseModel):
    language: str = Field(..., description="Language code e.g. en, hi, ta, te, kn, ml, mr, bn, gu, pa")


class UserLanguageUpdateResponse(BaseModel):
    profile_id: str
    preferred_language: str
    language_metadata: LanguageMetadata


@router.get("/languages", response_model=List[LanguageMetadata])
async def list_supported_languages():
    """
    Returns the list of all 10 supported languages (en, hi, ta, te, kn, ml, mr, bn, gu, pa).
    """
    return I18nService.get_supported_languages()


@router.get("/translations/{lang}")
async def get_translations_for_language(lang: str):
    """
    Returns localized UI catalog for client app hydration with English fallback.
    """
    normalized = I18nService.normalize_language(lang)
    default_catalog = TRANSLATION_CATALOGS.get("en", {})
    target_catalog = TRANSLATION_CATALOGS.get(normalized, {})

    # Merge target over default
    merged = dict(default_catalog)
    merged.update(target_catalog)

    return {
        "language": normalized,
        "translations": merged
    }


@router.patch("/preferences/language", response_model=UserLanguageUpdateResponse)
async def update_user_language_preference(
    payload: UserLanguageUpdateRequest,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Updates the authenticated user's preferred language in their profile.
    """
    if not I18nService.is_supported(payload.language):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported language code '{payload.language}'. Supported codes: en, hi, ta, te, kn, ml, mr, bn, gu, pa."
        )

    norm_lang = I18nService.normalize_language(payload.language)
    current_user.preferred_language = norm_lang
    await db_session.flush()

    lang_meta = [l for l in I18nService.get_supported_languages() if l.code == norm_lang][0]

    return UserLanguageUpdateResponse(
        profile_id=str(current_user.id),
        preferred_language=norm_lang,
        language_metadata=lang_meta
    )
