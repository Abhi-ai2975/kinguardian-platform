import pytest
import uuid
from app.core.adapters import (
    MockFHIRGateway,
    MockFileStorageGateway,
    MockAgentGateway,
    MockNotificationProvider,
)
from app.domains.notifications.providers import NotificationDeliveryRequest


@pytest.mark.asyncio
async def test_mock_fhir_gateway_fallback():
    """
    Verifies that MockFHIRGateway provides synthetic FHIR R4 clinical data
    without requiring external EMR services to be online.
    """
    gateway = MockFHIRGateway()

    # 1. Patient retrieval
    patient = await gateway.get_patient("synthetic-pat-ramesh-001")
    assert patient is not None
    assert patient["resourceType"] == "Patient"
    assert patient["name"][0]["family"] == "Sharma"

    # 2. Observations retrieval
    observations = await gateway.get_observations("synthetic-pat-ramesh-001")
    assert len(observations) > 0
    assert any(o.get("code", {}).get("coding", [{}])[0].get("display") == "Blood Pressure" for o in observations)

    # 3. Medications retrieval
    meds = await gateway.get_medications("synthetic-pat-ramesh-001")
    assert len(meds) > 0
    assert meds[0]["resourceType"] == "MedicationRequest"
    assert "Synthetic Metformin" in meds[0]["medicationCodeableConcept"]["text"]

    # 4. Appointments retrieval
    appts = await gateway.get_appointments("synthetic-pat-ramesh-001")
    assert len(appts) > 0
    assert appts[0]["resourceType"] == "Appointment"

    # 5. Dynamic synthetic registration
    gateway.register_patient({
        "id": "synthetic-pat-test-999",
        "resourceType": "Patient",
        "name": [{"family": "CustomTest"}]
    })
    custom_pat = await gateway.get_patient("synthetic-pat-test-999")
    assert custom_pat is not None
    assert custom_pat["name"][0]["family"] == "CustomTest"


@pytest.mark.asyncio
async def test_mock_file_storage_gateway_fallback():
    """
    Verifies that MockFileStorageGateway simulates FileNest WORM storage
    with SHA256 integrity, retention policy, and download URLs.
    """
    gateway = MockFileStorageGateway(base_url="http://localhost:8000")

    file_content = b"Sample Synthetic Medical Summary PDF Content"
    upload_res = await gateway.upload_file(
        file_bytes=file_content,
        filename="discharge_summary.pdf",
        content_type="application/pdf",
        metadata={"subject_id": "test-sub-123"},
        retention_days=3650  # 10 years
    )

    file_id = upload_res["file_id"]
    assert file_id is not None
    assert upload_res["sha256"] is not None
    assert upload_res["filename"] == "discharge_summary.pdf"
    assert "download_url" in upload_res

    # Retrieve metadata
    meta = await gateway.get_metadata(file_id)
    assert meta is not None
    assert meta["retention_days"] == 3650
    assert meta["metadata"]["subject_id"] == "test-sub-123"

    # Retrieve content bytes
    retrieved_bytes = await gateway.get_file_bytes(file_id)
    assert retrieved_bytes == file_content

    # Retrieve download URL with expiry
    download_url = await gateway.get_download_url(file_id, expiry_seconds=1800)
    assert download_url is not None
    assert file_id in download_url
    assert "exp=1800" in download_url


@pytest.mark.asyncio
async def test_mock_agent_gateway_fallback():
    """
    Verifies that MockAgentGateway simulates AI Guardian agent interaction,
    safety checks, and action proposals without external LLM API dependencies.
    """
    gateway = MockAgentGateway()
    session_id = str(uuid.uuid4())

    # 1. Conversational Response
    res = await gateway.generate_response(
        session_id=session_id,
        prompt="When is the next scheduled medication dose?",
        context={"subject_name": "Ramesh"}
    )
    assert res["session_id"] == session_id
    assert "medication" in res["message"].lower() or "dose" in res["message"].lower()
    assert res["safety_passed"] is True

    # 2. Action Proposal
    action = await gateway.propose_action(
        session_id=session_id,
        action_type="schedule_reminder",
        payload={"time": "08:00", "subject_id": "ramesh-sub"},
        requires_approval=True
    )
    assert action["action_id"] is not None
    assert action["status"] == "pending_approval"
    assert action["requires_approval"] is True

    # 3. Trend Evaluation
    trend = await gateway.evaluate_trend(
        subject_id="ramesh-sub",
        metric_name="Blood Pressure",
        observations=[{"val": 120}, {"val": 122}]
    )
    assert trend["trend_direction"] == "stable"
    assert trend["data_points_analyzed"] == 2
    assert trend["anomaly_detected"] is False


@pytest.mark.asyncio
async def test_mock_notification_provider_fallback():
    """
    Verifies that MockNotificationProvider captures multi-channel notification
    dispatches in-memory with delivery assertions and simulated failure modes.
    """
    provider = MockNotificationProvider(channel="push", provider_name="mock_fcm")
    req = NotificationDeliveryRequest(
        notification_id=uuid.uuid4(),
        recipient_profile_id=uuid.uuid4(),
        recipient_email="anjali@example.com",
        title="Medication Reminder",
        body="Ramesh has confirmed morning dose.",
        priority="high"
    )

    # 1. Normal Delivery Success
    result = await provider.send(req)
    assert result.success is True
    assert result.channel == "push"
    assert result.provider_message_id is not None
    assert provider.get_sent_count() == 1

    # 2. Simulated Delivery Failure
    provider.fail_mode = True
    result_fail = await provider.send(req)
    assert result_fail.success is False
    assert "failure" in result_fail.error.lower()
    assert provider.get_sent_count() == 2

    # 3. Reset / Clear
    provider.clear()
    assert provider.get_sent_count() == 0
