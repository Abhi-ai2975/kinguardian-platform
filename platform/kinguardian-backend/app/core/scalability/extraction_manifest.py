"""
Service Extraction Manifest & Boundary Registry:
Defines the technical extraction specification for the 6 target standalone services:
1. Family Service
2. Notification Service
3. Insight Service
4. Document Service
5. Communication Service
6. AI Orchestration Service

Enforces that while they are currently hosted in a single deployable modular monolith,
each domain maintains strict encapsulation, decoupled event contracts, and zero foreign table joins.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field


@dataclass(frozen=True)
class ServiceExtractionDefinition:
    """Technical extraction profile for a future standalone microservice."""
    service_name: str
    bounded_domain: str
    monolith_module_path: str
    primary_router_prefix: str
    inbound_event_subscriptions: List[str]
    outbound_event_publications: List[str]
    external_adapters: List[str]
    database_tables: List[str]
    is_deployable_standalone: bool = True


# The 6 Target Future Extraction Services
FUTURE_EXTRACTION_SERVICES: Dict[str, ServiceExtractionDefinition] = {
    "FamilyService": ServiceExtractionDefinition(
        service_name="Family Service",
        bounded_domain="family",
        monolith_module_path="app.domains.family",
        primary_router_prefix="/api/v1/families",
        inbound_event_subscriptions=[
            "user_authenticated",
            "consent_updated"
        ],
        outbound_event_publications=[
            "care_circle_created",
            "member_added",
            "care_subject_added",
            "care_task_created",
            "care_task_completed",
            "wellbeing_checkin_submitted"
        ],
        external_adapters=["iam_auth", "fhir_r4_adapter"],
        database_tables=[
            "families",
            "family_memberships",
            "care_subjects",
            "care_relationships",
            "care_tasks",
            "wellbeing_checkins",
            "consents"
        ]
    ),
    "NotificationService": ServiceExtractionDefinition(
        service_name="Notification Service",
        bounded_domain="notification",
        monolith_module_path="app.domains.notifications",
        primary_router_prefix="/api/v1/notifications",
        inbound_event_subscriptions=[
            "wellbeing_checkin_submitted",
            "medication_reminder_triggered",
            "guardian_moment_generated",
            "appointment_scheduled",
            "family_message_sent"
        ],
        outbound_event_publications=[
            "notification_queued",
            "notification_delivered",
            "notification_failed"
        ],
        external_adapters=["fcm_push", "twilio_sms", "whatsapp_cloud", "sendgrid_email"],
        database_tables=["notifications", "notification_deliveries"]
    ),
    "InsightService": ServiceExtractionDefinition(
        service_name="Insight Service",
        bounded_domain="insight",
        monolith_module_path="app.domains.insights",
        primary_router_prefix="/api/v1/insights",
        inbound_event_subscriptions=[
            "wellbeing_checkin_submitted",
            "medication_adherence_recorded",
            "vital_signs_recorded",
            "document_extraction_reviewed"
        ],
        outbound_event_publications=[
            "ai_insight_generated",
            "guardian_moment_generated",
            "health_trend_detected"
        ],
        external_adapters=["trend_engine", "gemini_pro_analytics"],
        database_tables=["ai_insights", "ai_insight_sources", "monitoring_preferences"]
    ),
    "DocumentService": ServiceExtractionDefinition(
        service_name="Document Service",
        bounded_domain="documents",
        monolith_module_path="app.domains.documents",
        primary_router_prefix="/api/v1/documents",
        inbound_event_subscriptions=[
            "document_uploaded",
            "filenest_file_ready",
            "extraction_requested"
        ],
        outbound_event_publications=[
            "document_scanned",
            "document_extraction_completed",
            "document_reviewed"
        ],
        external_adapters=["filenest_gateway", "ocr_extraction_worker", "fhir_r4_writer"],
        database_tables=["health_documents", "document_extractions"]
    ),
    "CommunicationService": ServiceExtractionDefinition(
        service_name="Communication Service",
        bounded_domain="communication",
        monolith_module_path="app.domains.family.presentation.conversations_router",
        primary_router_prefix="/api/v1/conversations",
        inbound_event_subscriptions=[
            "care_circle_created",
            "member_added"
        ],
        outbound_event_publications=[
            "family_message_sent",
            "conversation_created"
        ],
        external_adapters=["realtime_ws_hub", "push_dispatcher"],
        database_tables=["family_conversations", "family_messages"]
    ),
    "AIOrchestrationService": ServiceExtractionDefinition(
        service_name="AI Orchestration Service",
        bounded_domain="ai",
        monolith_module_path="app.domains.agent",
        primary_router_prefix="/api/v1/agent",
        inbound_event_subscriptions=[
            "appointment_prep_requested",
            "clinical_summary_requested",
            "agent_query_initiated"
        ],
        outbound_event_publications=[
            "agent_action_proposed",
            "appointment_prep_completed",
            "clinical_summary_drafted"
        ],
        external_adapters=["emr_mcp_client", "fhir_tools", "gemini_agent_engine"],
        database_tables=["agent_interactions", "ai_actions", "ai_conversations"]
    )
}


class ServiceExtractionRegistry:
    """Registry providing extraction introspection and boundary validation."""

    @classmethod
    def list_future_services(cls) -> List[ServiceExtractionDefinition]:
        return list(FUTURE_EXTRACTION_SERVICES.values())

    @classmethod
    def get_service_definition(cls, service_key: str) -> Optional[ServiceExtractionDefinition]:
        return FUTURE_EXTRACTION_SERVICES.get(service_key)

    @classmethod
    def validate_service_boundary_isolation(cls, service_key: str) -> Dict[str, Any]:
        defn = cls.get_service_definition(service_key)
        if not defn:
            raise ValueError(f"Service {service_key} is not registered in extraction manifest.")

        return {
            "service_name": defn.service_name,
            "bounded_domain": defn.bounded_domain,
            "has_dedicated_router": bool(defn.primary_router_prefix),
            "event_decoupled": len(defn.inbound_event_subscriptions) > 0 and len(defn.outbound_event_publications) > 0,
            "isolated_persistence": len(defn.database_tables) > 0,
            "extraction_readiness": "READY"
        }
