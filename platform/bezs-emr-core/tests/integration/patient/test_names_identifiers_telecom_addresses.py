"""Patient sub-resource coverage for the smaller flat child types."""

from tests.integration.patient.support import BASE, FHIR_ACCEPT, create_patient, get_first_child_id


async def test_add_and_list_patient_name(client):
    patient_id = await create_patient(client)
    resp = await client.post(
        f"{BASE}/{patient_id}/names",
        json={"use": "official", "family": "Smith", "given": ["John", "Paul"], "prefix": ["Mr."]},
    )
    assert resp.status_code == 200
    names = resp.json().get("name", [])
    found = next((name for name in names if name.get("family") == "Smith"), None)
    assert found is not None
    assert "John" in (found.get("given") or [])

    list_resp = await client.get(f"{BASE}/{patient_id}/names")
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] == 1


async def test_list_patient_names_fhir(client):
    patient_id = await create_patient(client)
    await client.post(f"{BASE}/{patient_id}/names", json={"use": "official", "family": "Doe", "given": ["Jane"]})
    resp = await client.get(f"{BASE}/{patient_id}/names", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["data"][0]["family"] == "Doe"
    assert data["data"][0]["given"] == ["Jane"]


async def test_delete_patient_name(client):
    patient_id = await create_patient(client)
    await client.post(f"{BASE}/{patient_id}/names", json={"use": "official", "family": "Temp"})
    name_id = await get_first_child_id(client, f"{BASE}/{patient_id}/names")
    assert (await client.delete(f"{BASE}/{patient_id}/names/{name_id}")).status_code == 204
    assert (await client.get(f"{BASE}/{patient_id}/names")).json()["total"] == 0


async def test_add_and_list_identifier(client):
    patient_id = await create_patient(client)
    resp = await client.post(
        f"{BASE}/{patient_id}/identifiers",
        json={
            "use": "official",
            "type_system": "http://terminology.hl7.org/CodeSystem/v2-0203",
            "type_code": "MR",
            "type_display": "Medical record number",
            "type_text": "MRN",
            "system": "http://hospital.example.org/mrn",
            "value": "MRN-001",
            "assigner": "Hospital A",
        },
    )
    assert resp.status_code == 200
    list_resp = await client.get(f"{BASE}/{patient_id}/identifiers")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total"] == 1
    assert data["data"][0]["value"] == "MRN-001"
    assert data["data"][0]["type_code"] == "MR"


async def test_list_patient_identifiers_fhir(client):
    patient_id = await create_patient(client)
    await client.post(f"{BASE}/{patient_id}/identifiers", json={"system": "http://hospital.example.org/mrn", "value": "MRN-XYZ"})
    resp = await client.get(f"{BASE}/{patient_id}/identifiers", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["data"][0]["system"] == "http://hospital.example.org/mrn"
    assert data["data"][0]["value"] == "MRN-XYZ"


async def test_delete_patient_identifier(client):
    patient_id = await create_patient(client)
    await client.post(f"{BASE}/{patient_id}/identifiers", json={"system": "http://hospital.example.org/mrn", "value": "MRN-DELETE"})
    identifier_id = await get_first_child_id(client, f"{BASE}/{patient_id}/identifiers")
    assert (await client.delete(f"{BASE}/{patient_id}/identifiers/{identifier_id}")).status_code == 204
    assert (await client.get(f"{BASE}/{patient_id}/identifiers")).json()["total"] == 0


async def test_add_and_list_telecom(client):
    patient_id = await create_patient(client)
    resp = await client.post(
        f"{BASE}/{patient_id}/telecom",
        json={"system": "email", "value": "test@example.com", "use": "home", "rank": 1},
    )
    assert resp.status_code == 200
    list_resp = await client.get(f"{BASE}/{patient_id}/telecom")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total"] == 1
    assert data["data"][0]["value"] == "test@example.com"
    assert data["data"][0]["rank"] == 1


async def test_list_patient_telecom_fhir(client):
    patient_id = await create_patient(client)
    await client.post(f"{BASE}/{patient_id}/telecom", json={"system": "phone", "value": "+1-555-0000", "use": "mobile", "rank": 1})
    resp = await client.get(f"{BASE}/{patient_id}/telecom", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["data"][0]["system"] == "phone"
    assert data["data"][0]["use"] == "mobile"


async def test_delete_patient_telecom(client):
    patient_id = await create_patient(client)
    await client.post(f"{BASE}/{patient_id}/telecom", json={"system": "email", "value": "delete@example.com"})
    telecom_id = await get_first_child_id(client, f"{BASE}/{patient_id}/telecom")
    assert (await client.delete(f"{BASE}/{patient_id}/telecom/{telecom_id}")).status_code == 204
    assert (await client.get(f"{BASE}/{patient_id}/telecom")).json()["total"] == 0


async def test_add_patient_telecom_invalid_rank_rejected(client):
    patient_id = await create_patient(client)
    resp = await client.post(f"{BASE}/{patient_id}/telecom", json={"system": "email", "value": "bad@example.com", "rank": 0})
    assert resp.status_code == 400


async def test_add_and_list_address(client):
    patient_id = await create_patient(client)
    resp = await client.post(
        f"{BASE}/{patient_id}/addresses",
        json={
            "use": "home",
            "type": "physical",
            "line": ["123 Main St", "Apt 4B"],
            "city": "Springfield",
            "state": "IL",
            "postal_code": "62701",
            "country": "US",
        },
    )
    assert resp.status_code == 200
    list_resp = await client.get(f"{BASE}/{patient_id}/addresses")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total"] == 1
    assert data["data"][0]["city"] == "Springfield"
    assert data["data"][0]["line"] == ["123 Main St", "Apt 4B"]


async def test_list_patient_addresses_fhir(client):
    patient_id = await create_patient(client)
    await client.post(f"{BASE}/{patient_id}/addresses", json={"use": "home", "type": "both", "line": ["456 River Rd"], "city": "Austin"})
    resp = await client.get(f"{BASE}/{patient_id}/addresses", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["data"][0]["use"] == "home"
    assert data["data"][0]["city"] == "Austin"


async def test_delete_patient_address(client):
    patient_id = await create_patient(client)
    await client.post(f"{BASE}/{patient_id}/addresses", json={"line": ["Delete Address"]})
    address_id = await get_first_child_id(client, f"{BASE}/{patient_id}/addresses")
    assert (await client.delete(f"{BASE}/{patient_id}/addresses/{address_id}")).status_code == 204
    assert (await client.get(f"{BASE}/{patient_id}/addresses")).json()["total"] == 0


async def test_list_patients_filter_family_name(client):
    patient_id = await create_patient(client)
    await client.post(f"{BASE}/{patient_id}/names", json={"use": "official", "family": "TargetFamily"})
    await client.post(BASE + "/", json={"user_id": "u-test-2", "org_id": "org-test", "active": True, "gender": "male"})
    other_id = await create_patient(client, {"user_id": "u-test-3", "org_id": "org-test", "active": True, "gender": "male"})
    await client.post(f"{BASE}/{other_id}/names", json={"use": "official", "family": "DifferentFamily"})

    resp = await client.get(BASE + "/?family_name=TargetFamily")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert all(item["id"] == patient_id for item in data["data"])


async def test_list_patients_filter_given_name(client):
    patient_id = await create_patient(client)
    await client.post(f"{BASE}/{patient_id}/names", json={"use": "official", "family": "Person", "given": ["UniqueGiven"]})
    other_id = await create_patient(client, {"user_id": "u-test-4", "org_id": "org-test", "active": True, "gender": "male"})
    await client.post(f"{BASE}/{other_id}/names", json={"use": "official", "family": "Person", "given": ["CommonGiven"]})

    resp = await client.get(BASE + "/?given_name=UniqueGiven")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert all(item["id"] == patient_id for item in data["data"])
