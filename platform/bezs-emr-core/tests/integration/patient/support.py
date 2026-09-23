"""Shared helpers and payloads for patient integration tests."""

BASE = "/api/fhir/v1/patients"
FHIR_ACCEPT = {"Accept": "application/fhir+json"}

MINIMAL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "active": True,
    "gender": "male",
}

FULL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "active": True,
    "gender": "female",
    "birth_date": "1990-06-15",
    "deceased_boolean": False,
    "marital_status_system": "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus",
    "marital_status_code": "M",
    "marital_status_display": "Married",
    "marital_status_text": "Married",
    "multiple_birth_boolean": False,
    "managing_organization": "Organization/190001",
    "managing_organization_display": "General Hospital",
}


async def create_patient(client, payload=None) -> int:
    """Create a patient and return the public patient id."""
    payload = payload or MINIMAL
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 200
    return resp.json()["id"]


async def get_first_child_id(client, path: str) -> int:
    """Fetch the first child row id from a `{data: [...], total: ...}` response."""
    resp = await client.get(path)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    return data["data"][0]["id"]

