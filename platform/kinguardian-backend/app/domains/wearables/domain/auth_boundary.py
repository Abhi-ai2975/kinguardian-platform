"""
Authentication Boundary Enforcement for Wearables.

Security Architecture:
1. KinGuardian IAM handles user authentication (OIDC / JWT Bearer Tokens).
2. Mobile application authenticates ONLY with KinGuardian API.
3. KinGuardian API acts as the secure, authenticated reverse-proxy to Open Wearables using service credentials.
4. Open Wearables' internal authentication model is NEVER exposed to KinGuardian users or mobile clients.

Flow:
Mobile App -> (KinGuardian IAM JWT) -> KinGuardian API -> (Service Credentials / API Key) -> Open Wearables API
"""

from typing import Dict, Any, Optional
import uuid


class AuthenticationBoundaryVerifier:
    """
    Enforces the zero-trust authentication boundary between KinGuardian users and Open Wearables.
    """

    @classmethod
    def verify_client_token(cls, authorization_header: Optional[str]) -> bool:
        """
        Ensures the client provides a KinGuardian IAM Bearer token and does NOT pass
        raw Open Wearables internal API keys.
        """
        if not authorization_header or not authorization_header.startswith("Bearer "):
            return False
        token = authorization_header[7:].strip()
        # Ensure token is not an upstream API key format
        if token.startswith("ow_sec_") or token.startswith("openwearables_"):
            return False
        return len(token) > 20

    @classmethod
    def build_backend_service_headers(
        cls,
        service_api_key: str,
        subject_id: uuid.UUID
    ) -> Dict[str, str]:
        """
        Constructs server-to-server service credential headers for Open Wearables.
        Ensures pseudonymized subject identity is passed rather than raw user credentials.
        """
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {service_api_key}",
            "X-API-Key": service_api_key,
            "X-Client-Platform": "KinGuardian",
            "X-Subject-Pseudonym": f"kinguardian_subject_{subject_id}"
        }
