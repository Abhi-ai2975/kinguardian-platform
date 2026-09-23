"""
Create the full DB schema from the current ORM models and stamp Alembic at head.

Use this after a fresh DB reset (drop + recreate) instead of running migrations
from scratch — the migration chain assumes several tables pre-existed.

Usage:
    uv run python scripts/create_schema.py
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.core.database import FHIRBase

# Register every model with FHIRBase.metadata
import app.models.patient.patient  # noqa: F401
import app.models.practitioner.practitioner  # noqa: F401
import app.models.encounter.encounter  # noqa: F401
import app.models.appointment.appointment  # noqa: F401
import app.models.questionnaire_response.questionnaire_response  # noqa: F401
import app.models.vitals.vitals  # noqa: F401
import app.models.service_request.service_request  # noqa: F401
import app.models.medication_request.medication_request  # noqa: F401
import app.models.procedure.procedure  # noqa: F401
import app.models.diagnostic_report.diagnostic_report  # noqa: F401
import app.models.condition.condition  # noqa: F401
import app.models.device_request.device_request  # noqa: F401
import app.models.practitioner_role.practitioner_role  # noqa: F401
import app.models.healthcare_service.healthcare_service  # noqa: F401
import app.models.observation.observation  # noqa: F401
import app.models.claim.claim  # noqa: F401
import app.models.claim_response.claim_response  # noqa: F401
import app.models.organization.organization  # noqa: F401
import app.models.schedule.schedule  # noqa: F401
import app.models.slot.slot  # noqa: F401
import app.models.invoice.invoice  # noqa: F401
import app.models.location.location  # noqa: F401
import app.models.coverage.coverage  # noqa: F401
import app.models.medication.medication  # noqa: F401
import app.models.allergy_intolerance.allergy_intolerance  # noqa: F401
import app.models.provenance.provenance  # noqa: F401
import app.models.task.task  # noqa: F401
import app.models.care_plan.care_plan  # noqa: F401
import app.models.related_person.related_person  # noqa: F401
import app.models.specimen.specimen  # noqa: F401
import app.models.document_reference.document_reference  # noqa: F401
import app.models.immunization.immunization  # noqa: F401
import app.models.audit_event.audit_event  # noqa: F401
import app.models.episode_of_care.episode_of_care  # noqa: F401
import app.models.terminology.terminology  # noqa: F401


# Shared PG enum types used with create_type=False in ORM models.
# These must be created before create_all() runs.
SHARED_ENUMS = [
    ("subject_reference_type", ["Patient", "Group"]),
    ("organization_reference_type", ["Organization"]),
    ("encounter_reference_type", ["Encounter"]),
]


async def create_schema() -> None:
    engine = create_async_engine(settings.FHIR_DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        print("Creating shared enum types...")
        for enum_name, values in SHARED_ENUMS:
            quoted = ", ".join(f"'{v}'" for v in values)
            await conn.execute(
                text(f"CREATE TYPE {enum_name} AS ENUM ({quoted})")
            )

        print("Creating all tables from ORM models...")
        await conn.run_sync(FHIRBase.metadata.create_all)

    await engine.dispose()
    print("Schema created successfully.")

    print("Stamping Alembic at head...")
    import subprocess
    result = subprocess.run(
        ["uv", "run", "alembic", "stamp", "head"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"alembic stamp failed:\n{result.stderr}", file=sys.stderr)
        sys.exit(1)
    print(result.stdout or "Done.")


if __name__ == "__main__":
    asyncio.run(create_schema())
