"""
Infrastructure FHIR Gateway:
Adapters and integration clients for FHIR R4 clinical services.
"""

from app.domains.clinical.gateway import ClinicalRecordGateway, FHIRClinicalRecordGateway

__all__ = ["ClinicalRecordGateway", "FHIRClinicalRecordGateway"]
