"""Patient sub-resource coverage for the richer/complex child types."""

from tests.integration.patient.support import BASE, FHIR_ACCEPT, create_patient, get_first_child_id


async def test_add_and_list_photo(client):
    patient_id = await create_patient(client)
    resp = await client.post(
        f"{BASE}/{patient_id}/photos",
        json={
            "content_type": "image/png",
            "language": "en",
            "data": "ZmFrZS1pbWFnZS1kYXRh",
            "url": "https://example.com/photo.png",
            "size": 15,
            "hash": "ZmFrZS1oYXNo",
            "title": "Profile photo",
            "creation": "2025-01-02T03:04:05",
        },
    )
    assert resp.status_code == 200
    list_resp = await client.get(f"{BASE}/{patient_id}/photos")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total"] == 1
    assert data["data"][0]["content_type"] == "image/png"
    assert data["data"][0]["title"] == "Profile photo"


async def test_list_patient_photos_fhir(client):
    patient_id = await create_patient(client)
    await client.post(f"{BASE}/{patient_id}/photos", json={"content_type": "image/jpeg", "title": "FHIR photo"})
    resp = await client.get(f"{BASE}/{patient_id}/photos", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["data"][0]["contentType"] == "image/jpeg"
    assert data["data"][0]["title"] == "FHIR photo"


async def test_delete_patient_photo(client):
    patient_id = await create_patient(client)
    await client.post(f"{BASE}/{patient_id}/photos", json={"title": "Delete Me"})
    photo_id = await get_first_child_id(client, f"{BASE}/{patient_id}/photos")
    assert (await client.delete(f"{BASE}/{patient_id}/photos/{photo_id}")).status_code == 204
    assert (await client.get(f"{BASE}/{patient_id}/photos")).json()["total"] == 0


async def test_add_and_list_contact(client):
    patient_id = await create_patient(client)
    resp = await client.post(
        f"{BASE}/{patient_id}/contacts",
        json={
            "relationship": [
                {
                    "coding_system": "http://terminology.hl7.org/CodeSystem/v2-0131",
                    "coding_code": "N",
                    "coding_display": "Next-of-kin",
                    "text": "Next-of-kin",
                }
            ],
            "role": [
                {
                    "coding_system": "http://example.org/contact-role",
                    "coding_code": "guardian",
                    "coding_display": "Guardian",
                    "text": "Guardian",
                }
            ],
            "name_use": "official",
            "name_family": "Caregiver",
            "name_given": ["Casey"],
            "telecom": [{"system": "phone", "value": "+1-555-1111", "use": "mobile"}],
            "additional_name": [{"family": "Alias", "given": ["C"]}],
            "address_use": "home",
            "address_line": ["1 Contact St"],
            "address_city": "Seattle",
            "additional_address": [{"line": ["2 Backup Ave"], "city": "Tacoma"}],
            "gender": "female",
            "organization": "Organization/190001",
            "organization_display": "General Hospital",
        },
    )
    assert resp.status_code == 200
    list_resp = await client.get(f"{BASE}/{patient_id}/contacts")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total"] == 1
    contact = data["data"][0]
    assert contact["name_family"] == "Caregiver"
    assert contact["relationship"][0]["coding_code"] == "N"
    assert contact["role"][0]["coding_code"] == "guardian"
    assert contact["telecom"][0]["value"] == "+1-555-1111"
    assert contact["additional_name"][0]["family"] == "Alias"
    assert contact["additional_address"][0]["city"] == "Tacoma"
    assert contact["organization_type"] == "Organization"
    assert contact["organization_id"] == 190001


async def test_list_patient_contacts_fhir(client):
    patient_id = await create_patient(client)
    await client.post(f"{BASE}/{patient_id}/contacts", json={"name_family": "FHIRContact", "name_given": ["Taylor"], "organization": "Organization/190001"})
    resp = await client.get(f"{BASE}/{patient_id}/contacts", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["data"][0]["name"]["family"] == "FHIRContact"
    assert data["data"][0]["organization"]["reference"] == "Organization/190001"


async def test_delete_patient_contact(client):
    patient_id = await create_patient(client)
    await client.post(f"{BASE}/{patient_id}/contacts", json={"name_family": "Delete Contact"})
    contact_id = await get_first_child_id(client, f"{BASE}/{patient_id}/contacts")
    assert (await client.delete(f"{BASE}/{patient_id}/contacts/{contact_id}")).status_code == 204
    assert (await client.get(f"{BASE}/{patient_id}/contacts")).json()["total"] == 0


async def test_add_and_list_communication(client):
    patient_id = await create_patient(client)
    resp = await client.post(
        f"{BASE}/{patient_id}/communications",
        json={
            "language_system": "urn:ietf:bcp:47",
            "language_code": "en",
            "language_display": "English",
            "language_text": "English",
            "preferred": True,
        },
    )
    assert resp.status_code == 200
    list_resp = await client.get(f"{BASE}/{patient_id}/communications")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total"] == 1
    assert data["data"][0]["language_code"] == "en"
    assert data["data"][0]["preferred"] is True


async def test_list_patient_communications_fhir(client):
    patient_id = await create_patient(client)
    await client.post(f"{BASE}/{patient_id}/communications", json={"language_code": "fr", "language_display": "French"})
    resp = await client.get(f"{BASE}/{patient_id}/communications", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["data"][0]["language"]["coding"][0]["code"] == "fr"


async def test_delete_patient_communication(client):
    patient_id = await create_patient(client)
    await client.post(f"{BASE}/{patient_id}/communications", json={"language_code": "de"})
    comm_id = await get_first_child_id(client, f"{BASE}/{patient_id}/communications")
    assert (await client.delete(f"{BASE}/{patient_id}/communications/{comm_id}")).status_code == 204
    assert (await client.get(f"{BASE}/{patient_id}/communications")).json()["total"] == 0


async def test_add_and_list_general_practitioner(client):
    patient_id = await create_patient(client)
    resp = await client.post(
        f"{BASE}/{patient_id}/general-practitioners",
        json={"reference_type": "Practitioner", "reference_id": 30001, "reference_display": "Dr. Green"},
    )
    assert resp.status_code == 200
    list_resp = await client.get(f"{BASE}/{patient_id}/general-practitioners")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total"] == 1
    assert data["data"][0]["reference_type"] == "Practitioner"
    assert data["data"][0]["reference_id"] == 30001


async def test_list_patient_general_practitioners_fhir(client):
    patient_id = await create_patient(client)
    await client.post(f"{BASE}/{patient_id}/general-practitioners", json={"reference_type": "Organization", "reference_id": 190001})
    resp = await client.get(f"{BASE}/{patient_id}/general-practitioners", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["data"][0]["reference"] == "Organization/190001"


async def test_delete_patient_general_practitioner(client):
    patient_id = await create_patient(client)
    await client.post(f"{BASE}/{patient_id}/general-practitioners", json={"reference_type": "PractitionerRole", "reference_id": 140001})
    gp_id = await get_first_child_id(client, f"{BASE}/{patient_id}/general-practitioners")
    assert (await client.delete(f"{BASE}/{patient_id}/general-practitioners/{gp_id}")).status_code == 204
    assert (await client.get(f"{BASE}/{patient_id}/general-practitioners")).json()["total"] == 0


async def test_add_and_list_link(client):
    patient_id = await create_patient(client)
    resp = await client.post(
        f"{BASE}/{patient_id}/links",
        json={"other_type": "Patient", "other_id": 10099, "other_display": "Linked patient", "type": "seealso"},
    )
    assert resp.status_code == 200
    list_resp = await client.get(f"{BASE}/{patient_id}/links")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total"] == 1
    assert data["data"][0]["other_type"] == "Patient"
    assert data["data"][0]["other_id"] == 10099
    assert data["data"][0]["type"] == "seealso"


async def test_list_patient_links_fhir(client):
    patient_id = await create_patient(client)
    await client.post(f"{BASE}/{patient_id}/links", json={"other_type": "RelatedPerson", "other_id": 50001, "type": "refer"})
    resp = await client.get(f"{BASE}/{patient_id}/links", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["data"][0]["other"]["reference"] == "RelatedPerson/50001"
    assert data["data"][0]["type"] == "refer"


async def test_delete_patient_link(client):
    patient_id = await create_patient(client)
    await client.post(f"{BASE}/{patient_id}/links", json={"other_type": "Patient", "other_id": 10101, "type": "replaces"})
    link_id = await get_first_child_id(client, f"{BASE}/{patient_id}/links")
    assert (await client.delete(f"{BASE}/{patient_id}/links/{link_id}")).status_code == 204
    assert (await client.get(f"{BASE}/{patient_id}/links")).json()["total"] == 0
