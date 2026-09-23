import pytest
import os
from pathlib import Path
from scripts.generate_ts_client import generate_typescript_client


def test_typescript_sdk_generation_and_contract_integrity():
    """
    Verifies that generate_typescript_client() automatically produces typed mobile client
    contracts from FastAPI OpenAPI 3.1.0 specification.
    """
    # Execute generator
    generate_typescript_client()

    backend_dir = Path(__file__).resolve().parent.parent
    sdk_dir = backend_dir.parent / "drgodly-api-client" / "src"

    types_file = sdk_dir / "types.ts"
    client_file = sdk_dir / "client.ts"
    index_file = sdk_dir / "index.ts"
    pkg_file = sdk_dir.parent / "package.json"

    # Verify Files Exist
    assert types_file.exists()
    assert client_file.exists()
    assert index_file.exists()
    assert pkg_file.exists()

    types_content = types_file.read_text(encoding="utf-8")
    client_content = client_file.read_text(encoding="utf-8")

    # Verify Typed Contracts (No manual reconstruction required by React Native app)
    assert "export interface MedicationConfirmRequest" in types_content
    assert "export interface MedicationAdherenceResponse" in types_content
    assert "export interface WellbeingCheckinCreate" in types_content
    assert "export interface WellbeingCheckinResponse" in types_content
    assert "export interface CareTaskCreate" in types_content
    assert "export interface CareTaskResponse" in types_content
    assert "export interface ConsentGrantRequest" in types_content
    assert "export interface ConsentResponse" in types_content
    assert "export interface ErrorDetail" in types_content
    assert "export interface ErrorResponse" in types_content
    assert "export type ErrorCode" in types_content

    # Verify Client Features (Bearer token injection, Idempotency-Key, Correlation IDs)
    assert "export class DrGodlyApiClient" in client_content
    assert "export class DrGodlyApiError" in client_content
    assert "'Idempotency-Key'" in client_content
    assert "'X-Request-ID'" in client_content
    assert "'Authorization'] = `Bearer ${token}`" in client_content
