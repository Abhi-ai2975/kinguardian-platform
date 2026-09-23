"""
Wearable Authentication Boundary Test Suite.

Verifies:
1. Authentication Topology:
   - KinGuardian IAM -> KinGuardian API -> Open Wearables Service Credentials/API
2. Mobile application authenticates ONLY with KinGuardian IAM.
3. Open Wearables internal authentication model is NEVER exposed to KinGuardian users.
4. KinGuardian Backend acts as the sole credentialed proxy to Open Wearables using server-to-server API keys.
"""

import uuid
import pytest
from app.domains.wearables.domain.auth_boundary import AuthenticationBoundaryVerifier


def test_mobile_authenticates_only_with_kinguardian_iam():
    """
    Verifies that client requests must contain KinGuardian IAM Bearer tokens
    and do not carry Open Wearables internal API credentials.
    """
    valid_iam_jwt = "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ODc2NSIsImZhbWlseV9pZCI6IjEyMzQ1In0.signature"
    assert AuthenticationBoundaryVerifier.verify_client_token(valid_iam_jwt) is True

    # Reject raw Open Wearables internal keys from clients
    invalid_raw_ow_key = "Bearer ow_sec_live_9837492837492837492"
    assert AuthenticationBoundaryVerifier.verify_client_token(invalid_raw_ow_key) is False

    # Reject missing or malformed tokens
    assert AuthenticationBoundaryVerifier.verify_client_token(None) is False
    assert AuthenticationBoundaryVerifier.verify_client_token("Basic dXNlcjpwYXNz") is False


def test_backend_uses_service_credentials_for_open_wearables():
    """
    Verifies that the KinGuardian API acts as the authenticated gateway
    using server-to-server credentials and pseudonymized subject identifiers.
    """
    subject_id = uuid.uuid4()
    service_api_key = "kinguardian_open_wearables_sec_key_prod"

    headers = AuthenticationBoundaryVerifier.build_backend_service_headers(
        service_api_key=service_api_key,
        subject_id=subject_id
    )

    assert headers["Authorization"] == f"Bearer {service_api_key}"
    assert headers["X-API-Key"] == service_api_key
    assert headers["X-Client-Platform"] == "KinGuardian"
    assert headers["X-Subject-Pseudonym"] == f"kinguardian_subject_{subject_id}"
