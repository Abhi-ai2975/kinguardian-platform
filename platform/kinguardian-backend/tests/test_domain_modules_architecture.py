"""
Domain Modules Architecture Test Suite:
Verifies that backend code is cleanly organized into the 13 requested bounded domains:
1. family
2. identity
3. care
4. consent
5. clinical (adapter/boundary to FHIR platform)
6. medication
7. appointment
8. documents
9. communication
10. notification
11. insight
12. ai
13. audit
"""

import pytest


def test_domain_modules_bounded_contexts():
    """
    Verifies that all 13 bounded domain modules exist, are cleanly importable,
    and expose their bounded context primitives without circular dependencies.
    """
    # 1. Family Domain
    import app.domains.family as family_domain
    assert hasattr(family_domain, "Family")
    assert hasattr(family_domain, "FamilyMembership")
    assert hasattr(family_domain, "FamilyService")
    assert hasattr(family_domain, "FamilyHomeReadService")

    # 2. Identity Domain
    import app.domains.identity as identity_domain
    assert hasattr(identity_domain, "AppProfile")
    assert hasattr(identity_domain, "AppProfileEntity")
    assert hasattr(identity_domain, "IAppProfileRepository")

    # 3. Care Domain
    import app.domains.care as care_domain
    assert hasattr(care_domain, "CareSubject")
    assert hasattr(care_domain, "CareRelationship")
    assert hasattr(care_domain, "CareTask")
    assert hasattr(care_domain, "WellbeingCheckin")

    # 4. Consent Domain
    import app.domains.consent as consent_domain
    assert hasattr(consent_domain, "Consent")
    assert hasattr(consent_domain, "ConsentEntity")
    assert hasattr(consent_domain, "IConsentRepository")

    # 5. Clinical Domain (Adapter / Boundary to FHIR Platform)
    import app.domains.clinical as clinical_domain
    assert hasattr(clinical_domain, "ClinicalRecordGateway")
    assert hasattr(clinical_domain, "FHIRClinicalRecordGateway")
    assert hasattr(clinical_domain, "ClinicalService")
    assert hasattr(clinical_domain, "HealthAnalyticsService")

    # 6. Medication Domain
    import app.domains.medication as medication_domain
    assert hasattr(medication_domain, "MedicationAdherenceEvent")
    assert hasattr(medication_domain, "MedicationAdherenceEventEntity")

    # 7. Appointment Domain
    import app.domains.appointment as appointment_domain
    assert hasattr(appointment_domain, "AppointmentCoordination")
    assert hasattr(appointment_domain, "AppointmentCoordinationEntity")

    # 8. Documents Domain
    import app.domains.documents as documents_domain
    assert hasattr(documents_domain, "HealthDocument")
    assert hasattr(documents_domain, "DocumentExtraction")
    assert hasattr(documents_domain, "FileNestGateway")

    # 9. Communication Domain
    import app.domains.communication as communication_domain
    assert hasattr(communication_domain, "FamilyConversation")
    assert hasattr(communication_domain, "FamilyMessage")

    # 10. Notification Domain
    import app.domains.notification as notification_domain
    assert hasattr(notification_domain, "NotificationPolicyEngine")
    assert hasattr(notification_domain, "NotificationPolicy")
    assert hasattr(notification_domain, "NotificationProvider")


    # 11. Insight Domain
    import app.domains.insight as insight_domain
    assert hasattr(insight_domain, "BaselineService")
    assert hasattr(insight_domain, "InsightEngine")
    assert hasattr(insight_domain, "TrendDetectionStrategy")
    assert hasattr(insight_domain, "AIInsight")

    # 12. AI Domain
    import app.domains.ai as ai_domain
    assert hasattr(ai_domain, "AIContextBuilder")
    assert hasattr(ai_domain, "AISafetyGuard")
    assert hasattr(ai_domain, "ExternalToolAuthorizationGatekeeper")
    assert hasattr(ai_domain, "ControlledToolRegistry")

    # 13. Audit Domain
    import app.domains.audit as audit_domain
    assert hasattr(audit_domain, "EventLog")
    assert hasattr(audit_domain, "OutboxEvent")
    assert hasattr(audit_domain, "AuditLogger")
    assert hasattr(audit_domain, "EventService")
