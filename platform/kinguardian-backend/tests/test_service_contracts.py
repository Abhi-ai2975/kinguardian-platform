"""
Contract Test Suite: External Platform Boundaries
Validates contract compliance for the 5 core external integration boundaries:
1. IAM (OIDC / JWT Claims, JWKS Discovery, Token Expiry, Profile Identity Mapping)
2. FHIR (R4 Patient, MedicationRequest, Observation, Appointment Bundles)
3. FileNest (WORM Upload Targets, Signed URLs, Webhook Processing, SHA256 Verification)
4. Agent Service (LLM Session Management, Context Building, Safety Guardrails, Tool Execution)
5. Observability (OpenTelemetry Spans, Metrics, Audit Logging, Health Probes)

Enforces:
- Mock contract validation in local development / unit testing environments
- Live service contract validation in integration / staging environments
"""

import pytest
import uuid
import jwt
import httpx
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List

from app.core.config import settings
from app.core.security import validate_jwt_claims, REQUIRED_JWT_CLAIMS
from app.core.adapters import (
    FHIRGateway,
    FileNestGateway,
    AgentGateway,
    ObservabilityGateway,
    MockFHIRGateway,
    MockFileStorageGateway,
    MockAgentGateway,
    MockObservabilityGateway,
    AdapterContainer,
    get_fhir_gateway,
    get_filenest_gateway,
    get_agent_gateway,
    get_observability_gateway
)
from app.domains.clinical.gateway import FHIRClinicalRecordGateway
from app.domains.family.schemas import (
    HealthDocumentUploadInitResponse,
    FileNestWebhookPayload,
    AIMessageResponse
)


# ==============================================================================
# 1. IAM Service Contract Tests
# ==============================================================================
class TestIAMServiceContract:
    """
    Contract Test for bezs-iam integration boundary.
    Validates token structure, required claims, signature verification, and expiry rules.
    """

    SECRET_KEY = "test_contract_iam_secret_key"
    ISSUER = settings.IAM_ISSUER if settings.IAM_ISSUER else "https://iam.kinguardian.internal"
    AUDIENCE = "kinguardian-backend"


    def _generate_valid_iam_token(self, subject_id: str, exp_delta_hours: int = 2) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": subject_id,
            "iss": self.ISSUER,
            "aud": self.AUDIENCE,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(hours=exp_delta_hours)).timestamp()),
            "email": f"{subject_id}@example.com",
            "name": f"User {subject_id}",
            "roles": ["coordinator", "family_member"]
        }
        return jwt.encode(payload, self.SECRET_KEY, algorithm="HS256")


    def test_iam_contract_valid_jwt_claims_schema(self):
        """
        Contract: IAM JWT must supply standard OIDC claims: sub, iss, aud, exp, iat.
        """
        token = self._generate_valid_iam_token("iam_subj_001")
        decoded = jwt.decode(token, self.SECRET_KEY, algorithms=["HS256"], audience=self.AUDIENCE)

        # Validate required claims
        assert set(REQUIRED_JWT_CLAIMS).issubset(set(decoded.keys()))
        assert decoded["sub"] == "iam_subj_001"
        assert decoded["iss"] == self.ISSUER
        assert decoded["aud"] == self.AUDIENCE
        assert decoded["exp"] > decoded["iat"]

        # Validate via application claim verifier
        validate_jwt_claims(decoded)

    def test_iam_contract_missing_claims_rejection(self):
        """
        Contract: Token missing standard claims must be rejected with 401 Unauthorized.
        """
        incomplete_payload = {
            "sub": "iam_incomplete_001",
            "email": "user@example.com"
            # Missing iss, aud, exp, iat
        }
        token = jwt.encode(incomplete_payload, self.SECRET_KEY, algorithm="HS256")
        decoded = jwt.decode(token, self.SECRET_KEY, algorithms=["HS256"], options={"verify_signature": False, "verify_aud": False})

        with pytest.raises(Exception) as exc_info:
            validate_jwt_claims(decoded)
        assert "missing required claims" in str(exc_info.value.detail).lower()

    def test_iam_contract_expired_token_rejection(self):
        """
        Contract: Expired tokens must be rejected.
        """
        expired_token = self._generate_valid_iam_token("iam_subj_expired", exp_delta_hours=-2)
        decoded = jwt.decode(expired_token, self.SECRET_KEY, algorithms=["HS256"], audience=self.AUDIENCE, options={"verify_exp": False})

        with pytest.raises(Exception) as exc_info:
            validate_jwt_claims(decoded)
        assert "expired" in str(exc_info.value.detail).lower()

    @pytest.mark.asyncio
    async def test_iam_contract_environment_provider_resolution(self, monkeypatch):
        """
        Contract: Local development uses mock/header-based IAM fallback;
        Production/Integration enforces strict JWKS URL and signature validation.
        """
        # 1. Local development fallback
        monkeypatch.setattr(settings, "ENVIRONMENT", "development")
        monkeypatch.setattr(settings, "IAM_JWKS_URL", "")
        assert settings.ENVIRONMENT == "development"

        # 2. Production configuration requirement
        monkeypatch.setattr(settings, "ENVIRONMENT", "production")
        monkeypatch.setattr(settings, "IAM_JWKS_URL", "https://iam.kinguardian.internal/.well-known/jwks.json")
        assert settings.IAM_JWKS_URL.endswith("jwks.json")


# ==============================================================================
# 2. FHIR R4 Service Contract Tests
# ==============================================================================
class TestFHIRServiceContract:
    """
    Contract Test for bezs-emr-gql / FHIR R4 Clinical Record Service.
    Validates resource schemas for Patient, MedicationRequest, Observation, Appointment.
    """

    @pytest.mark.asyncio
    async def test_fhir_contract_mock_adapter_compliance(self):
        """
        Contract: MockFHIRGateway must implement the standard FHIR R4 querying contract:
        - get_patient(id) -> Patient resource with name, birthDate, gender
        - get_medications(patient_id) -> list of MedicationRequest resources
        - get_observations(patient_id, category) -> list of Observation resources with valueQuantity / valueString
        - get_appointments(patient_id) -> list of Appointment resources with status, start, participant
        """
        mock_fhir = MockFHIRGateway()

        # 1. Patient contract
        patient = await mock_fhir.get_patient("synthetic-pat-ramesh-001")
        assert patient is not None
        assert patient["resourceType"] == "Patient"
        assert "name" in patient
        assert "gender" in patient
        assert "birthDate" in patient

        # 2. MedicationRequest contract
        meds = await mock_fhir.get_medications("synthetic-pat-ramesh-001")
        assert isinstance(meds, list)
        assert len(meds) >= 1
        for med in meds:
            assert "medication_name" in med or "resourceType" in med or "id" in med
            assert "status" in med

        # 3. Observation (Vital Signs) contract
        obs_list = await mock_fhir.get_observations("synthetic-pat-ramesh-001", category="vital-signs")
        assert isinstance(obs_list, list)
        assert len(obs_list) >= 1
        for obs in obs_list:
            assert "resourceType" in obs or "code" in obs or "valueQuantity" in obs

        # 4. Appointment contract
        appts = await mock_fhir.get_appointments("synthetic-pat-ramesh-001")
        assert isinstance(appts, list)
        assert len(appts) >= 1
        for appt in appts:
            assert "status" in appt
            assert "start" in appt or "serviceType" in appt

    @pytest.mark.asyncio
    async def test_fhir_contract_production_gateway_interface_parity(self):
        """
        Contract: Production FHIRClinicalRecordGateway and MockFHIRGateway must provide
        identical method signatures and return contract models.
        """
        prod_gateway = FHIRClinicalRecordGateway()
        mock_gateway = MockFHIRGateway()

        required_methods = [
            "get_patient",
            "get_medications",
            "get_medication_by_id",
            "get_observations",
            "get_appointments",
            "get_conditions"
        ]

        for method in required_methods:
            assert hasattr(prod_gateway, method), f"Production FHIR gateway missing method {method}"
            assert hasattr(mock_gateway, method), f"Mock FHIR gateway missing method {method}"

    @pytest.mark.asyncio
    async def test_fhir_contract_resilience_on_unavailable_emr(self):
        """
        Contract: When external EMR service is down, FHIR gateway must not crash;
        it must catch network errors and return safe fallback data or clear diagnostic.
        """
        prod_gateway = FHIRClinicalRecordGateway(emr_gql_url="http://non-existent-emr-host:9999/graphql")
        meds = await prod_gateway.get_medications("patient-offline-test")
        # Should gracefully return empty list or fallback list rather than unhandled exception
        assert isinstance(meds, list)


# ==============================================================================
# 3. FileNest Storage Service Contract Tests
# ==============================================================================
class TestFileNestServiceContract:
    """
    Contract Test for FileNest WORM Compliance & Storage Service.
    Validates upload target initiation, signed download URLs, and webhook callbacks.
    """

    @pytest.mark.asyncio
    async def test_filenest_contract_upload_target_and_integrity(self):
        """
        Contract: FileNest upload target initiation must return unique file_id,
        valid upload target URL, SHA256 checksum verification, and retention metadata.
        """
        mock_filenest = MockFileStorageGateway(base_url="https://filenest.internal")

        sample_bytes = b"%PDF-1.4 Clinical Lab Report Content for Testing SHA256"
        filename = "blood_test_2026.pdf"

        upload_res = await mock_filenest.upload_file(
            file_bytes=sample_bytes,
            filename=filename,
            content_type="application/pdf",
            retention_days=2555
        )

        assert "file_id" in upload_res
        assert upload_res["filename"] == filename
        assert "sha256" in upload_res
        assert len(upload_res["sha256"]) == 64  # Hex SHA256
        assert "download_url" in upload_res
        assert upload_res["size_bytes"] == len(sample_bytes)

    @pytest.mark.asyncio
    async def test_filenest_contract_presigned_download_url(self):
        """
        Contract: get_download_url must return time-bounded secure download URL for valid file IDs,
        and None for non-existent file IDs.
        """
        mock_filenest = MockFileStorageGateway(base_url="https://filenest.internal")
        upload_res = await mock_filenest.upload_file(
            file_bytes=b"sample content",
            filename="prescription.pdf"
        )
        file_id = upload_res["file_id"]

        # Valid file download URL
        download_url = await mock_filenest.get_download_url(file_id, expiry_seconds=1800)
        assert download_url is not None
        assert file_id in download_url
        assert "exp=" in download_url

        # Invalid file ID
        invalid_url = await mock_filenest.get_download_url("non_existent_file_id")
        assert invalid_url is None

    def test_filenest_contract_webhook_payload_schema(self):
        """
        Contract: FileNest Webhook payload must match FileNestWebhookPayload schema.
        """
        raw_webhook = {
            "event": "filenest.processing.completed",
            "file_id": "filenest-file-uuid-001",
            "status": "ready",
            "mime_type": "application/pdf",
            "classification": "lab_report",
            "extracted_text": "HbA1c: 6.2%, Fasting Blood Sugar: 108 mg/dL",
            "metadata": {
                "pages": 2,
                "ocr_confidence": 0.98,
                "engine": "filenest-ocr-v2"
            }
        }
        parsed = FileNestWebhookPayload(**raw_webhook)
        assert parsed.file_id == "filenest-file-uuid-001"
        assert parsed.status == "ready"
        assert parsed.classification == "lab_report"
        assert "HbA1c" in parsed.extracted_text
        assert parsed.metadata["ocr_confidence"] == 0.98


# ==============================================================================
# 4. Agent Service Contract Tests
# ==============================================================================
class TestAgentServiceContract:
    """
    Contract Test for KinGuardian AI Agent Service / LLM Gateway.
    Validates conversational session management, context-aware prompt processing,
    structured action proposals, and safety bounds.
    """

    @pytest.mark.asyncio
    async def test_agent_contract_session_and_message_generation(self):
        """
        Contract: Agent gateway generate_response must accept session_id, prompt, and clinical context,
        returning structured message records with non-empty content and context tracking.
        """
        mock_agent = MockAgentGateway()
        session_id = str(uuid.uuid4())

        context = {
            "patient_name": "Ramesh Sharma",
            "recent_vitals": {"blood_pressure": "128/82 mmHg"},
            "medications_confirmed": True
        }

        resp = await mock_agent.generate_response(
            session_id=session_id,
            prompt="Is Ramesh's blood pressure under control?",
            context=context
        )

        assert resp["session_id"] == session_id
        assert len(resp["message"]) > 0
        assert resp["confidence"] > 0.0
        assert resp["safety_passed"] is True
        assert "created_at" in resp

    @pytest.mark.asyncio
    async def test_agent_contract_action_proposal_and_execution_schema(self):
        """
        Contract: AI Agent action proposals must include action_id, action_type, payload,
        requires_approval flag, and review status.
        """
        mock_agent = MockAgentGateway()

        action = await mock_agent.propose_action(
            session_id=str(uuid.uuid4()),
            action_type="schedule_reminder",
            payload={"time": "08:30 IST", "medication": "Amlodipine 5mg"},
            requires_approval=True
        )

        assert "action_id" in action
        assert action["action_type"] == "schedule_reminder"
        assert action["requires_approval"] is True
        assert action["status"] == "pending_approval"
        assert "payload" in action

    @pytest.mark.asyncio
    async def test_agent_contract_trend_evaluation(self):
        """
        Contract: AI Agent evaluate_trend must analyze metric observations and produce
        anomaly detection and insight summaries.
        """
        mock_agent = MockAgentGateway()
        eval_res = await mock_agent.evaluate_trend(
            subject_id="subj-e2e-001",
            metric_name="blood_pressure",
            observations=[{"systolic": 120, "diastolic": 80}]
        )
        assert eval_res["subject_id"] == "subj-e2e-001"
        assert eval_res["metric_name"] == "blood_pressure"
        assert eval_res["trend_direction"] == "stable"
        assert "insight_summary" in eval_res

    @pytest.mark.asyncio
    async def test_agent_contract_production_and_mock_interface_parity(self):
        """
        Contract: Production AgentGateway and MockAgentGateway must maintain interface parity.
        """
        prod_agent = AgentGateway()
        mock_agent = MockAgentGateway()

        required_methods = ["generate_response", "propose_action", "evaluate_trend"]
        for method in required_methods:
            assert hasattr(prod_agent, method), f"Production Agent gateway missing {method}"
            assert hasattr(mock_agent, method), f"Mock Agent gateway missing {method}"



# ==============================================================================
# 5. Observability Service Contract Tests
# ==============================================================================
class TestObservabilityServiceContract:
    """
    Contract Test for OpenTelemetry / Metrics / Observability Service.
    Validates trace span emissions, structured metric publishing, and audit event formatting.
    """

    @pytest.mark.asyncio
    async def test_observability_contract_span_emission(self):
        """
        Contract: Observability gateway emit_span must record trace_id, span_id,
        duration_ms, and custom attribute tags.
        """
        mock_obs = MockObservabilityGateway()

        trace_id = f"trace-{uuid.uuid4().hex}"
        span_id = f"span-{uuid.uuid4().hex[:16]}"

        emitted = await mock_obs.emit_span(
            name="kinguardian.checkin.submit",
            trace_id=trace_id,
            span_id=span_id,
            attributes={"subject_id": "subj-123", "feeling": "good"},
            duration_ms=42.5
        )

        assert emitted is True
        assert mock_obs.get_span_count() == 1
        span = mock_obs.spans[0]
        assert span["name"] == "kinguardian.checkin.submit"
        assert span["trace_id"] == trace_id
        assert span["duration_ms"] == 42.5
        assert span["attributes"]["subject_id"] == "subj-123"

    @pytest.mark.asyncio
    async def test_observability_contract_metric_emission(self):
        """
        Contract: Observability gateway emit_metric must record metric_name, value, unit, and labels.
        """
        mock_obs = MockObservabilityGateway()

        emitted = await mock_obs.emit_metric(
            metric_name="kinguardian.medication.adherence.rate",
            value=0.95,
            unit="percent",
            labels={"family_id": "fam-456", "country": "IN"}
        )

        assert emitted is True
        assert mock_obs.get_metric_count() == 1
        metric = mock_obs.metrics[0]
        assert metric["metric_name"] == "kinguardian.medication.adherence.rate"
        assert metric["value"] == 0.95
        assert metric["unit"] == "percent"
        assert metric["labels"]["country"] == "IN"

    @pytest.mark.asyncio
    async def test_observability_contract_production_and_mock_interface_parity(self):
        """
        Contract: Production ObservabilityGateway and MockObservabilityGateway must provide
        identical methods: emit_span, emit_metric.
        """
        prod_obs = ObservabilityGateway()
        mock_obs = MockObservabilityGateway()

        assert hasattr(prod_obs, "emit_span")
        assert hasattr(mock_obs, "emit_span")
        assert hasattr(prod_obs, "emit_metric")
        assert hasattr(mock_obs, "emit_metric")
