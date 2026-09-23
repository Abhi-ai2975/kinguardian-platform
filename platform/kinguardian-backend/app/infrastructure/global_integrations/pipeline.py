"""
Normalized Health Observation Pipeline:
Unified ingestion, validation, deduplication, and event publishing pipeline.
Ensures all incoming global health telemetry (Apple Health, Fitbit, Garmin, Oura, SMART on FHIR)
flows through a single standardized pathway rather than special-case logic throughout the codebase.
"""

from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime, timezone

from app.core.logging import get_logger
from app.domains.events import event_bus, DomainEvent
from app.infrastructure.global_integrations.models import NormalizedHealthObservation


logger = get_logger(__name__)


class NormalizedObservationPipeline:
    """
    Unified Ingestion & Analytics Pipeline for all Global Health Feeds.
    """

    def __init__(self, event_dispatcher=None):
        self.event_bus = event_dispatcher or event_bus
        self._dedup_cache = set()

    async def ingest_observations(
        self,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        observations: List[NormalizedHealthObservation]
    ) -> Dict[str, Any]:
        """
        Processes, deduplicates, and publishes normalized observations.
        """
        ingested_count = 0
        skipped_duplicates = 0
        dispatched_events = []

        for obs in observations:
            # Deterministic deduplication key
            dedup_key = f"{obs.subject_id}:{obs.code_loinc}:{obs.effective_timestamp.isoformat()}:{obs.value_numeric}"
            if dedup_key in self._dedup_cache:
                skipped_duplicates += 1
                continue

            self._dedup_cache.add(dedup_key)
            if len(self._dedup_cache) > 10000:
                self._dedup_cache.clear()

            # Construct Standardized Domain Event
            event_payload = {
                "observation_id": obs.observation_id,
                "family_id": str(family_id),
                "subject_id": str(subject_id),
                "source_provider": obs.source_provider,
                "category": obs.category.value,
                "code_loinc": obs.code_loinc,
                "display_name": obs.display_name,
                "value_numeric": obs.value_numeric,
                "unit": obs.unit,
                "effective_timestamp": obs.effective_timestamp.isoformat(),
                "device_model": obs.device_model
            }

            domain_event = DomainEvent(
                event_type="health.observation.ingested",
                family_id=family_id,
                aggregate_type="HealthObservation",
                aggregate_id=uuid.UUID(hex=obs.observation_id.replace("obs_", "")[:32]),
                payload=event_payload,
                occurred_at=datetime.now(timezone.utc)
            )

            await self.event_bus.publish(domain_event)
            ingested_count += 1
            dispatched_events.append(domain_event)

        logger.info(
            f"NormalizedObservationPipeline processed {len(observations)} items: "
            f"{ingested_count} ingested, {skipped_duplicates} duplicate skipped."
        )

        return {
            "total_submitted": len(observations),
            "ingested_count": ingested_count,
            "skipped_duplicates": skipped_duplicates,
            "pipeline_status": "SUCCESS"
        }
