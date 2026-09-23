"""Practitioner sub-resource coverage for the smaller flat child types."""

from tests.integration.practitioner.support import BASE, FHIR_ACCEPT, create_practitioner, get_first_child_id


async def test_add_and_list_practitioner_name(client):
    practitioner_id = await create_practitioner(client)
    resp = await client.post(
        f"{BASE}/{practitioner_id}/names",
        json={"use": "official", "family": "Smith", "given": ["John", "Paul"], "prefix": ["Dr."]},
    )
    assert resp.status_code == 200
    names = resp.json().get("name", [])
    found = next((name for name in names if name.get("family") == "Smith"), None)
    assert found is not None
    assert "John" in (found.get("given") or [])

    list_resp = await client.get(f"{BASE}/{practitioner_id}/names")
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] == 1


async def test_list_practitioner_names_fhir(client):
    practitioner_id = await create_practitioner(client)
    await client.post(f"{BASE}/{practitioner_id}/names", json={"use": "official", "family": "Doe", "given": ["Jane"]})
    resp = await client.get(f"{BASE}/{practitioner_id}/names", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["data"][0]["family"] == "Doe"
    assert data["data"][0]["given"] == ["Jane"]


async def test_delete_practitioner_name(client):
    practitioner_id = await create_practitioner(client)
    await client.post(f"{BASE}/{practitioner_id}/names", json={"family": "Temp"})
    name_id = await get_first_child_id(client, f"{BASE}/{practitioner_id}/names")
    assert (await client.delete(f"{BASE}/{practitioner_id}/names/{name_id}")).status_code == 204
    assert (await client.get(f"{BASE}/{practitioner_id}/names")).json()["total"] == 0


async def test_add_and_list_practitioner_identifier(client):
    practitioner_id = await create_practitioner(client)
    resp = await client.post(
        f"{BASE}/{practitioner_id}/identifiers",
        json={
            "use": "official",
            "type_system": "http://terminology.hl7.org/CodeSystem/v2-0203",
            "type_code": "NPI",
            "type_display": "National provider identifier",
            "type_text": "NPI",
            "system": "http://hl7.org/fhir/sid/us-npi",
            "value": "1234567890",
            "assigner": "NPPES",
        },
    )
    assert resp.status_code == 200
    list_resp = await client.get(f"{BASE}/{practitioner_id}/identifiers")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total"] == 1
    assert data["data"][0]["value"] == "1234567890"
    assert data["data"][0]["type_code"] == "NPI"


async def test_list_practitioner_identifiers_fhir(client):
    practitioner_id = await create_practitioner(client)
    await client.post(f"{BASE}/{practitioner_id}/identifiers", json={"system": "http://hl7.org/fhir/sid/us-npi", "value": "9999999999"})
    resp = await client.get(f"{BASE}/{practitioner_id}/identifiers", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["data"][0]["system"] == "http://hl7.org/fhir/sid/us-npi"
    assert data["data"][0]["value"] == "9999999999"


async def test_delete_practitioner_identifier(client):
    practitioner_id = await create_practitioner(client)
    await client.post(f"{BASE}/{practitioner_id}/identifiers", json={"system": "http://hl7.org/fhir/sid/us-npi", "value": "5555555555"})
    identifier_id = await get_first_child_id(client, f"{BASE}/{practitioner_id}/identifiers")
    assert (await client.delete(f"{BASE}/{practitioner_id}/identifiers/{identifier_id}")).status_code == 204
    assert (await client.get(f"{BASE}/{practitioner_id}/identifiers")).json()["total"] == 0


async def test_add_and_list_practitioner_telecom(client):
    practitioner_id = await create_practitioner(client)
    resp = await client.post(f"{BASE}/{practitioner_id}/telecom", json={"system": "email", "value": "doctor@example.com", "use": "work", "rank": 1})
    assert resp.status_code == 200
    list_resp = await client.get(f"{BASE}/{practitioner_id}/telecom")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total"] == 1
    assert data["data"][0]["value"] == "doctor@example.com"
    assert data["data"][0]["rank"] == 1


async def test_list_practitioner_telecom_fhir(client):
    practitioner_id = await create_practitioner(client)
    await client.post(f"{BASE}/{practitioner_id}/telecom", json={"system": "phone", "value": "+1-555-2222", "use": "mobile"})
    resp = await client.get(f"{BASE}/{practitioner_id}/telecom", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["data"][0]["system"] == "phone"
    assert data["data"][0]["use"] == "mobile"


async def test_delete_practitioner_telecom(client):
    practitioner_id = await create_practitioner(client)
    await client.post(f"{BASE}/{practitioner_id}/telecom", json={"system": "email", "value": "delete@example.com"})
    telecom_id = await get_first_child_id(client, f"{BASE}/{practitioner_id}/telecom")
    assert (await client.delete(f"{BASE}/{practitioner_id}/telecom/{telecom_id}")).status_code == 204
    assert (await client.get(f"{BASE}/{practitioner_id}/telecom")).json()["total"] == 0


async def test_add_practitioner_telecom_invalid_rank_rejected(client):
    practitioner_id = await create_practitioner(client)
    resp = await client.post(f"{BASE}/{practitioner_id}/telecom", json={"system": "email", "value": "bad@example.com", "rank": 0})
    assert resp.status_code == 400


async def test_add_and_list_practitioner_address(client):
    practitioner_id = await create_practitioner(client)
    resp = await client.post(
        f"{BASE}/{practitioner_id}/addresses",
        json={
            "use": "work",
            "type": "physical",
            "line": ["100 Clinic Rd", "Suite 5"],
            "city": "Boston",
            "state": "MA",
            "postal_code": "02110",
            "country": "US",
        },
    )
    assert resp.status_code == 200
    list_resp = await client.get(f"{BASE}/{practitioner_id}/addresses")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total"] == 1
    assert data["data"][0]["city"] == "Boston"
    assert data["data"][0]["line"] == ["100 Clinic Rd", "Suite 5"]


async def test_list_practitioner_addresses_fhir(client):
    practitioner_id = await create_practitioner(client)
    await client.post(f"{BASE}/{practitioner_id}/addresses", json={"use": "work", "type": "both", "line": ["200 Main St"], "city": "Austin"})
    resp = await client.get(f"{BASE}/{practitioner_id}/addresses", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["data"][0]["use"] == "work"
    assert data["data"][0]["city"] == "Austin"


async def test_delete_practitioner_address(client):
    practitioner_id = await create_practitioner(client)
    await client.post(f"{BASE}/{practitioner_id}/addresses", json={"line": ["Delete Address"]})
    address_id = await get_first_child_id(client, f"{BASE}/{practitioner_id}/addresses")
    assert (await client.delete(f"{BASE}/{practitioner_id}/addresses/{address_id}")).status_code == 204
    assert (await client.get(f"{BASE}/{practitioner_id}/addresses")).json()["total"] == 0


async def test_list_practitioners_filter_family_name(client):
    practitioner_id = await create_practitioner(client)
    await client.post(f"{BASE}/{practitioner_id}/names", json={"use": "official", "family": "TargetFamily", "given": ["Alex"]})
    other_id = await create_practitioner(client, {"user_id": "u-name-other", "org_id": "org-test", "active": True, "gender": "female"})
    await client.post(f"{BASE}/{other_id}/names", json={"use": "official", "family": "DifferentFamily", "given": ["Jamie"]})

    resp = await client.get(BASE + "/?family_name=TargetFamily")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert all(item["id"] == practitioner_id for item in data["data"])


async def test_list_practitioners_filter_given_name(client):
    practitioner_id = await create_practitioner(client)
    await client.post(f"{BASE}/{practitioner_id}/names", json={"use": "official", "family": "Person", "given": ["UniqueGiven"]})
    other_id = await create_practitioner(client, {"user_id": "u-given-other", "org_id": "org-test", "active": True, "gender": "female"})
    await client.post(f"{BASE}/{other_id}/names", json={"use": "official", "family": "Person", "given": ["CommonGiven"]})

    resp = await client.get(BASE + "/?given_name=UniqueGiven")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert all(item["id"] == practitioner_id for item in data["data"])
