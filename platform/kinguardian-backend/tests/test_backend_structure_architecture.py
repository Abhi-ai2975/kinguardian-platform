"""
Backend Structure & Layered Architecture Test Suite:
Verifies that the backend codebase is cleanly structured and conforms to the Clean / Hexagonal Architecture:
app/
├── core/
│   ├── config/
│   ├── database/
│   ├── redis/
│   ├── security/
│   ├── logging/
│   └── telemetry/
│
├── domain/
│   ├── family/
│   ├── care/
│   ├── consent/
│   ├── medication/
│   ├── checkin/
│   ├── notification/
│   ├── insight/
│   ├── documents/
│   ├── communication/
│   └── ai/
│
├── application/
│   ├── family/
│   ├── care/
│   ├── medication/
│   ├── appointments/
│   ├── documents/
│   ├── insights/
│   ├── communication/
│   └── ai/
│
├── infrastructure/
│   ├── persistence/
│   ├── fhir/
│   ├── filenest/
│   ├── iam/
│   ├── agent/
│   ├── notifications/
│   ├── messaging/
│   └── observability/
│
├── interfaces/
│   ├── http/
│   └── events/
│
├── workers/
│   ├── outbox_worker.py
│   ├── notification_worker.py
│   ├── insight_worker.py
│   └── document_worker.py
│
├── db/
│   └── models/
│
└── main.py
"""

import pytest


def test_core_layered_packages():
    """Verifies all core packages."""
    import app.core.config as config_pkg
    import app.core.database as db_pkg
    import app.core.redis as redis_pkg
    import app.core.security as sec_pkg
    import app.core.logging as log_pkg
    import app.core.telemetry as telem_pkg

    assert hasattr(config_pkg, "settings")
    assert hasattr(db_pkg, "AsyncSessionLocal")
    assert hasattr(redis_pkg, "RedisCacheService")
    assert hasattr(sec_pkg, "verify_token")
    assert hasattr(log_pkg, "get_logger")
    assert hasattr(telem_pkg, "metrics")


def test_domain_layered_packages():
    """Verifies all domain packages."""
    import app.domain.family as dom_family
    import app.domain.care as dom_care
    import app.domain.consent as dom_consent
    import app.domain.medication as dom_medication
    import app.domain.checkin as dom_checkin
    import app.domain.notification as dom_notification
    import app.domain.insight as dom_insight
    import app.domain.documents as dom_documents
    import app.domain.communication as dom_communication
    import app.domain.ai as dom_ai

    assert hasattr(dom_family, "FamilyEntity")
    assert hasattr(dom_care, "CareSubjectEntity")
    assert hasattr(dom_consent, "ConsentEntity")
    assert hasattr(dom_medication, "MedicationAdherenceEventEntity")
    assert hasattr(dom_checkin, "WellbeingCheckinEntity")
    assert hasattr(dom_notification, "NotificationEntity")
    assert hasattr(dom_insight, "AIInsightEntity")
    assert hasattr(dom_documents, "HealthDocumentEntity")
    assert hasattr(dom_communication, "FamilyConversationEntity")
    assert hasattr(dom_ai, "AIConversationEntity")


def test_application_layered_packages():
    """Verifies all application orchestrator packages."""
    import app.application.family as app_family
    import app.application.care as app_care
    import app.application.medication as app_medication
    import app.application.appointments as app_appointments
    import app.application.documents as app_documents
    import app.application.insights as app_insights
    import app.application.communication as app_communication
    import app.application.ai as app_ai

    assert hasattr(app_family, "FamilyService")
    assert hasattr(app_family, "FamilyHomeReadService")
    assert hasattr(app_care, "FamilyService")
    assert hasattr(app_medication, "FamilyService")
    assert hasattr(app_appointments, "FamilyService")
    assert hasattr(app_documents, "FamilyService")
    assert hasattr(app_insights, "InsightEngine")
    assert hasattr(app_communication, "FamilyService")
    assert hasattr(app_ai, "AIContextBuilder")


def test_infrastructure_layered_packages():
    """Verifies all infrastructure packages."""
    import app.infrastructure.persistence as infra_persistence
    import app.infrastructure.fhir as infra_fhir
    import app.infrastructure.filenest as infra_filenest
    import app.infrastructure.iam as infra_iam
    import app.infrastructure.agent as infra_agent
    import app.infrastructure.notifications as infra_notifications
    import app.infrastructure.messaging as infra_messaging
    import app.infrastructure.observability as infra_observability

    assert hasattr(infra_persistence, "AppProfile")
    assert hasattr(infra_fhir, "FHIRClinicalRecordGateway")
    assert hasattr(infra_filenest, "FileNestGateway")
    assert hasattr(infra_agent, "KinGuardianEMRMCPBridge")

    assert hasattr(infra_notifications, "NotificationPolicyEngine")
    assert hasattr(infra_messaging, "InMemoryEventBus")
    assert hasattr(infra_observability, "AuditService")


def test_interfaces_and_workers_layered_packages():
    """Verifies interfaces, workers, and db models."""
    import app.interfaces.http.routers as http_routers
    import app.interfaces.http.dependencies as http_deps
    import app.interfaces.http.middleware as http_middleware
    import app.interfaces.events as iface_events
    import app.workers as workers_pkg
    import app.db.models as db_models

    assert hasattr(http_routers, "families_router")
    assert hasattr(http_deps, "get_db_session")
    assert hasattr(http_middleware, "CorrelationIdMiddleware")
    assert hasattr(iface_events, "DomainEvent")
    assert hasattr(workers_pkg, "run_outbox_worker")
    assert hasattr(workers_pkg, "run_notification_worker")
    assert hasattr(workers_pkg, "run_insight_worker")
    assert hasattr(workers_pkg, "run_document_worker")
    assert hasattr(db_models, "Family")
    assert hasattr(db_models, "EventLog")
