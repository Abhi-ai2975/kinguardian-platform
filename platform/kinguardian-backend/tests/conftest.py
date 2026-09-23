import os
import asyncio

# Set environment before any app imports to override config
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool
from app.core.database import Base, db

# Import all models to register on Base.metadata
from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    FamilyMembership,
    FamilyRelationship,
    CareSubject,
    CareRelationship,
    CareTask,
    MedicationAdherenceEvent,
    WellbeingCheckin,
    MonitoringPreference,
    AIInsight,
    AIInsightSource,
    Notification,
    NotificationDelivery,
    FamilyConversation,
    FamilyMessage,
    AppointmentCoordination,
    HealthDocument,
    DocumentExtraction,
    AIConversation,
    AIAction,
    Consent
)
from app.domains.events.models import EventLog, OutboxEvent


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def _init_test_database():
    test_engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )
    
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    db.engine = test_engine
    db.session_maker = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    
    yield
    
    await test_engine.dispose()


@pytest_asyncio.fixture
async def db_session() -> AsyncSession:
    async with db.session() as session:
        yield session
        
        from sqlalchemy import text
        try:
            await session.execute(text("DELETE FROM outbox_events"))
            await session.execute(text("DELETE FROM event_logs"))
            await session.execute(text("DELETE FROM consents"))
            await session.execute(text("DELETE FROM ai_actions"))
            await session.execute(text("DELETE FROM ai_conversations"))
            await session.execute(text("DELETE FROM document_extractions"))
            await session.execute(text("DELETE FROM health_documents"))
            await session.execute(text("DELETE FROM appointment_coordination"))
            await session.execute(text("DELETE FROM family_messages"))
            await session.execute(text("DELETE FROM family_conversations"))
            await session.execute(text("DELETE FROM notification_deliveries"))
            await session.execute(text("DELETE FROM notifications"))
            await session.execute(text("DELETE FROM ai_insight_sources"))
            await session.execute(text("DELETE FROM ai_insights"))
            await session.execute(text("DELETE FROM monitoring_preferences"))
            await session.execute(text("DELETE FROM wellbeing_checkins"))
            await session.execute(text("DELETE FROM medication_adherence_events"))
            await session.execute(text("DELETE FROM care_tasks"))
            await session.execute(text("DELETE FROM care_relationships"))
            await session.execute(text("DELETE FROM care_subjects"))
            await session.execute(text("DELETE FROM family_relationships"))
            await session.execute(text("DELETE FROM family_memberships"))
            await session.execute(text("DELETE FROM families"))
            await session.execute(text("DELETE FROM app_profiles"))
            await session.commit()
        except Exception:
            await session.rollback()
