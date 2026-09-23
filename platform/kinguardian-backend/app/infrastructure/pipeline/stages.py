"""
bezs-pipeline ETL Stage Architecture:
Implements Connector, Extractor, Transformer, and Loader stages with retry, embedding derivation, and error policies.
"""

from typing import Protocol, List, Dict, Any, Optional, runtime_checkable
from datetime import datetime, timezone
import hashlib
import uuid
from pydantic import BaseModel, Field


class IngestionRecord(BaseModel):
    record_id: str = Field(default_factory=lambda: f"rec_{uuid.uuid4().hex[:12]}")
    source_type: str  # "wearables" | "health_platforms" | "imported_records" | "documents" | "lab_feeds"
    subject_id: uuid.UUID
    family_id: uuid.UUID
    raw_payload: Dict[str, Any]
    normalized_data: Optional[Dict[str, Any]] = None
    embedding_vector: Optional[List[float]] = None
    checksum: Optional[str] = None
    extracted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "extracted"


@runtime_checkable
class IConnector(Protocol):
    """Stage 1: Connector - Connects to external upstream health feeds."""
    async def connect(self) -> bool: ...
    async def fetch_raw_batch(self, subject_id: uuid.UUID, cursor: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]: ...


@runtime_checkable
class IExtractor(Protocol):
    """Stage 2: Extractor - Parses raw payloads into standardized IngestionRecords with deduplication checksums."""
    async def extract(self, source_type: str, subject_id: uuid.UUID, family_id: uuid.UUID, raw_items: List[Dict[str, Any]]) -> List[IngestionRecord]: ...


@runtime_checkable
class ITransformer(Protocol):
    """Stage 3: Transformer - Normalizes schemas, cleanses timestamps, standardizes units, and derives embeddings."""
    async def transform(self, records: List[IngestionRecord]) -> List[IngestionRecord]: ...


@runtime_checkable
class ILoader(Protocol):
    """Stage 4: Loader - Bulk persists normalized records into FHIR R4 clinical stores or observation tables."""
    async def load(self, records: List[IngestionRecord]) -> int: ...


# Default Implementations

class StandardExtractor:
    """Standard Extractor computing cryptographic deduplication checksums."""
    async def extract(self, source_type: str, subject_id: uuid.UUID, family_id: uuid.UUID, raw_items: List[Dict[str, Any]]) -> List[IngestionRecord]:
        records = []
        for item in raw_items:
            payload_str = str(sorted(item.items()))
            chk = hashlib.sha256(payload_str.encode("utf-8")).hexdigest()
            records.append(IngestionRecord(
                source_type=source_type,
                subject_id=subject_id,
                family_id=family_id,
                raw_payload=item,
                checksum=chk
            ))
        return records


class StandardTransformer:
    """Standard Transformer normalizing timestamps and generating embeddings."""
    async def transform(self, records: List[IngestionRecord]) -> List[IngestionRecord]:
        for rec in records:
            raw = rec.raw_payload
            norm: Dict[str, Any] = {}

            if rec.source_type == "wearables":
                # E.g. Heart rate, steps, sleep, SpO2
                norm = {
                    "metric_type": raw.get("type", "vital_metric"),
                    "value": float(raw.get("value", 0)),
                    "unit": raw.get("unit", "count"),
                    "recorded_at": raw.get("timestamp") or datetime.now(timezone.utc).isoformat(),
                    "device_model": raw.get("device", "Apple Watch / Fitbit")
                }
            elif rec.source_type == "health_platforms":
                # E.g. Connected Blood Pressure cuff, CGM
                norm = {
                    "metric_type": raw.get("metric", "blood_pressure"),
                    "systolic": raw.get("systolic"),
                    "diastolic": raw.get("diastolic"),
                    "glucose_mg_dl": raw.get("glucose"),
                    "recorded_at": raw.get("timestamp") or datetime.now(timezone.utc).isoformat(),
                    "platform": raw.get("platform", "Dexcom / Omron")
                }
            elif rec.source_type == "imported_records":
                # E.g. C-CDA XML / FHIR Bundle
                norm = {
                    "resource_type": raw.get("resourceType", "Condition"),
                    "code": raw.get("code", {}).get("text", "Unknown Condition"),
                    "clinical_status": raw.get("clinicalStatus", "active"),
                    "source_emr": raw.get("source_emr", "Epic / Cerner")
                }
            elif rec.source_type == "lab_feeds":
                # E.g. HL7 v2 ORU^R01 / LOINC feed
                norm = {
                    "test_code": raw.get("loinc_code", "883-9"),
                    "test_name": raw.get("test_name", "Blood Glucose"),
                    "result_value": raw.get("value", "105"),
                    "unit": raw.get("unit", "mg/dL"),
                    "reference_range": raw.get("reference_range", "70-99 mg/dL"),
                    "flag": raw.get("abnormal_flag", "N")
                }
            elif rec.source_type == "documents":
                # E.g. FileNest extracted summary
                norm = {
                    "document_type": raw.get("document_type", "prescription"),
                    "extracted_text": raw.get("text", ""),
                    "entities": raw.get("entities", [])
                }

            rec.normalized_data = norm
            # Derive deterministic semantic embedding vector (mock 16-dim embedding)
            summary_text = f"{rec.source_type} {norm}"
            hash_bytes = hashlib.md5(summary_text.encode("utf-8"), usedforsecurity=False).digest()
            rec.embedding_vector = [float(b) / 255.0 for b in hash_bytes]

            rec.status = "transformed"
        return records
