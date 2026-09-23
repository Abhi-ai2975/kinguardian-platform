"""
bezs-pipeline Infrastructure Package:
Connector, Extractor, Transformer, Loader ETL architecture for bulk ingestion:
- wearables
- health platforms
- imported health records
- documents
- lab feeds
"""

from app.infrastructure.pipeline.stages import (
    IngestionRecord,
    IConnector,
    IExtractor,
    ITransformer,
    ILoader,
    StandardExtractor,
    StandardTransformer
)
from app.infrastructure.pipeline.connectors import (
    WearablesConnector,
    HealthPlatformsConnector,
    ImportedRecordsConnector,
    DocumentsConnector,
    LabFeedsConnector
)
from app.infrastructure.pipeline.engine import (
    ETLPipelineEngine,
    BatchIngestionJob,
    ClinicalFHIRLoader
)

__all__ = [
    "IngestionRecord",
    "IConnector",
    "IExtractor",
    "ITransformer",
    "ILoader",
    "StandardExtractor",
    "StandardTransformer",
    "WearablesConnector",
    "HealthPlatformsConnector",
    "ImportedRecordsConnector",
    "DocumentsConnector",
    "LabFeedsConnector",
    "ETLPipelineEngine",
    "BatchIngestionJob",
    "ClinicalFHIRLoader"
]
