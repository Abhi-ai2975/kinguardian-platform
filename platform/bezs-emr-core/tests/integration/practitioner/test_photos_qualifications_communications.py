"""Practitioner sub-resource coverage for richer child types."""

from tests.helpers.assertions import assert_operation_outcome
from tests.integration.practitioner.support import BASE, FHIR_ACCEPT, create_practitioner, get_first_child_id


async def test_add_and_list_practitioner_photo(client):
    practitioner_id = await create_practitioner(client)
    resp = await client.post(
        f"{BASE}/{practitioner_id}/photos",
        json={
            "content_type": "image/png",
            "language": "en",
            "data": "ZmFrZS1pbWFnZS1kYXRh",
            "url": "https://example.com/practitioner.png",
            "size": 15,
            "hash": "ZmFrZS1oYXNo",
            "title": "Headshot",
            "creation": "2025-01-02T03:04:05",
        },
    )
    assert resp.status_code == 200
    list_resp = await client.get(f"{BASE}/{practitioner_id}/photos")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total"] == 1
    assert data["data"][0]["content_type"] == "image/png"
    assert data["data"][0]["title"] == "Headshot"


async def test_list_practitioner_photos_fhir(client):
    practitioner_id = await create_practitioner(client)
    await client.post(f"{BASE}/{practitioner_id}/photos", json={"content_type": "image/jpeg", "title": "FHIR photo"})
    resp = await client.get(f"{BASE}/{practitioner_id}/photos", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["data"][0]["contentType"] == "image/jpeg"
    assert data["data"][0]["title"] == "FHIR photo"


async def test_delete_practitioner_photo(client):
    practitioner_id = await create_practitioner(client)
    await client.post(f"{BASE}/{practitioner_id}/photos", json={"title": "Delete Me"})
    photo_id = await get_first_child_id(client, f"{BASE}/{practitioner_id}/photos")
    assert (await client.delete(f"{BASE}/{practitioner_id}/photos/{photo_id}")).status_code == 204
    assert (await client.get(f"{BASE}/{practitioner_id}/photos")).json()["total"] == 0


async def test_add_and_list_practitioner_qualification(client):
    practitioner_id = await create_practitioner(client)
    resp = await client.post(
        f"{BASE}/{practitioner_id}/qualifications",
        json={
            "identifier": [
                {
                    "use": "official",
                    "system": "http://example.org/licenses",
                    "value": "LIC-12345",
                    "type_text": "License Number",
                    "assigner": "Medical Board",
                }
            ],
            "code_system": "http://snomed.info/sct",
            "code_code": "309343006",
            "code_display": "Physician",
            "code_text": "Doctor of Medicine",
            "status_system": "http://example.org/qualification-status",
            "status_code": "active",
            "status_display": "Active",
            "status_text": "Active",
            "period_start": "2020-01-01T00:00:00",
            "period_end": "2030-01-01T00:00:00",
            "issuer": "Organization/190001",
            "issuer_display": "Medical Board",
        },
    )
    assert resp.status_code == 200
    list_resp = await client.get(f"{BASE}/{practitioner_id}/qualifications")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total"] == 1
    qual = data["data"][0]
    assert qual["code_code"] == "309343006"
    assert qual["issuer_type"] == "Organization"
    assert qual["issuer_id"] == 190001
    assert qual["identifier"][0]["value"] == "LIC-12345"


async def test_list_practitioner_qualifications_fhir(client):
    practitioner_id = await create_practitioner(client)
    await client.post(
        f"{BASE}/{practitioner_id}/qualifications",
        json={"code_text": "Board Certification", "issuer": "Organization/190001", "issuer_display": "Issuer Org"},
    )
    resp = await client.get(f"{BASE}/{practitioner_id}/qualifications", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["data"][0]["code"]["text"] == "Board Certification"
    assert data["data"][0]["issuer"]["reference"] == "Organization/190001"


async def test_delete_practitioner_qualification(client):
    practitioner_id = await create_practitioner(client)
    await client.post(f"{BASE}/{practitioner_id}/qualifications", json={"code_text": "Delete Qualification"})
    qualification_id = await get_first_child_id(client, f"{BASE}/{practitioner_id}/qualifications")
    assert (await client.delete(f"{BASE}/{practitioner_id}/qualifications/{qualification_id}")).status_code == 204
    assert (await client.get(f"{BASE}/{practitioner_id}/qualifications")).json()["total"] == 0


async def test_add_practitioner_qualification_invalid_issuer_reference_rejected(client):
    practitioner_id = await create_practitioner(client)
    resp = await client.post(f"{BASE}/{practitioner_id}/qualifications", json={"code_text": "Bad Qual", "issuer": "BadReference"})
    assert_operation_outcome(resp.json(), expected_status=422, response_status=resp.status_code)


async def test_add_and_list_practitioner_communication(client):
    practitioner_id = await create_practitioner(client)
    resp = await client.post(
        f"{BASE}/{practitioner_id}/communications",
        json={
            "language_system": "urn:ietf:bcp:47",
            "language_code": "en",
            "language_display": "English",
            "language_text": "English",
            "preferred": True,
        },
    )
    assert resp.status_code == 200
    list_resp = await client.get(f"{BASE}/{practitioner_id}/communications")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total"] == 1
    assert data["data"][0]["language_code"] == "en"
    assert data["data"][0]["preferred"] is True


async def test_list_practitioner_communications_fhir(client):
    practitioner_id = await create_practitioner(client)
    await client.post(f"{BASE}/{practitioner_id}/communications", json={"language_code": "fr", "language_display": "French"})
    resp = await client.get(f"{BASE}/{practitioner_id}/communications", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["data"][0]["language"]["coding"][0]["code"] == "fr"


async def test_delete_practitioner_communication(client):
    practitioner_id = await create_practitioner(client)
    await client.post(f"{BASE}/{practitioner_id}/communications", json={"language_code": "de"})
    comm_id = await get_first_child_id(client, f"{BASE}/{practitioner_id}/communications")
    assert (await client.delete(f"{BASE}/{practitioner_id}/communications/{comm_id}")).status_code == 204
    assert (await client.get(f"{BASE}/{practitioner_id}/communications")).json()["total"] == 0
