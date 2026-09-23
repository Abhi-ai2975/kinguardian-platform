"""Shared helpers and payloads for practitioner integration tests."""

BASE = "/api/fhir/v1/practitioners"
FHIR_ACCEPT = {"Accept": "application/fhir+json"}

MINIMAL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "active": True,
    "gender": "female",
}

FULL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "active": True,
    "gender": "male",
    "birth_date": "1978-03-15",
    "deceased_boolean": False,
}


async def create_practitioner(client, payload=None) -> int:
    """Create a practitioner and return the public practitioner id."""
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

