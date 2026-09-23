"""Integration tests for /api/fhir/v1/medications endpoints."""
import pytest

BASE = "/api/fhir/v1/medications"
FHIR_ACCEPT = {"Accept": "application/fhir+json"}

MINIMAL = {
    "user_id": "u-test",
    "org_id": "org-test",
}

FULL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "code_system": "http://www.nlm.nih.gov/research/umls/rxnorm",
    "code_code": "1049502",
    "code_display": "12 HR Oxycodone Hydrochloride 80 MG Extended Release Oral Tablet",
    "code_text": "Oxycodone ER 80mg",
    "status": "active",
    "manufacturer": "Organization/190001",
    "manufacturer_display": "Purdue Pharma",
    "form_system": "http://snomed.info/sct",
    "form_code": "385055001",
    "form_display": "Tablet",
    "form_text": "Tablet dose form",
    "amount_numerator_value": "10",
    "amount_numerator_unit": "mg",
    "amount_numerator_system": "http://unitsofmeasure.org",
    "amount_numerator_code": "mg",
    "amount_denominator_value": "1",
    "amount_denominator_unit": "tablet",
    "batch_lot_number": "LOT-2024-001",
    "batch_expiration_date": "2026-12-31T00:00:00Z",
    "identifiers": [
        {
            "use": "official",
            "system": "http://hl7.org/fhir/sid/ndc",
            "value": "0591-0405-05",
            "assigner": "FDA",
        }
    ],
    "ingredients": [
        {
            "item_codeable_concept_system": "http://www.nlm.nih.gov/research/umls/rxnorm",
            "item_codeable_concept_code": "7804",
            "item_codeable_concept_display": "Oxycodone",
            "is_active": True,
            "strength_numerator_value": "80",
            "strength_numerator_unit": "mg",
            "strength_numerator_system": "http://unitsofmeasure.org",
            "strength_numerator_code": "mg",
            "strength_denominator_value": "1",
            "strength_denominator_unit": "tablet",
            "strength_denominator_system": "http://unitsofmeasure.org",
            "strength_denominator_code": "{tablet}",
        }
    ],
}


# ── Create ─────────────────────────────────────────────────────────────────────


async def test_create_medication_minimal(client):
    resp = await client.post(BASE + "/", json=MINIMAL)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("id") is not None
    assert isinstance(data["id"], int)


async def test_create_medication_full(client):
    resp = await client.post(BASE + "/", json=FULL)
    assert resp.status_code == 200
    data = resp.json()
    assert data["code_code"] == "1049502"
    assert data["status"] == "active"
    assert data["manufacturer_type"] == "Organization"
    assert data["manufacturer_id"] == 190001
    assert data["manufacturer_display"] == "Purdue Pharma"
    assert data["form_code"] == "385055001"
    assert float(data["amount_numerator_value"]) == pytest.approx(10.0)
    assert data["amount_numerator_unit"] == "mg"
    assert float(data["amount_denominator_value"]) == pytest.approx(1.0)
    assert data["batch_lot_number"] == "LOT-2024-001"


async def test_create_medication_fhir_format(client):
    resp = await client.post(BASE + "/", json=MINIMAL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Medication"
    assert isinstance(data["id"], str)


async def test_create_medication_fhir_full(client):
    resp = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Medication"
    assert data["code"]["coding"][0]["code"] == "1049502"
    assert data["status"] == "active"
    assert data["manufacturer"]["reference"] == "Organization/190001"
    assert data["manufacturer"]["display"] == "Purdue Pharma"
    assert data["form"]["coding"][0]["code"] == "385055001"
    assert float(data["amount"]["numerator"]["value"]) == pytest.approx(10.0)
    assert data["amount"]["numerator"]["unit"] == "mg"
    assert float(data["amount"]["denominator"]["value"]) == pytest.approx(1.0)
    assert data["batch"]["lotNumber"] == "LOT-2024-001"
    assert "2026-12-31" in data["batch"]["expirationDate"]


async def test_create_medication_extra_field_rejected(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "bad_field": "x"})
    assert resp.status_code == 400


async def test_create_medication_invalid_status(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "status": "not-a-status"})
    assert resp.status_code == 422


async def test_create_medication_invalid_manufacturer_ref(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "manufacturer": "NotARef"})
    assert resp.status_code == 422


async def test_create_medication_invalid_manufacturer_type(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "manufacturer": "Patient/10001"})
    assert resp.status_code == 422


# ── Identifiers ────────────────────────────────────────────────────────────────


async def test_create_medication_with_identifiers(client):
    resp = await client.post(BASE + "/", json=FULL)
    assert resp.status_code == 200
    data = resp.json()
    identifiers = data.get("identifier", [])
    assert len(identifiers) == 1
    assert identifiers[0]["use"] == "official"
    assert identifiers[0]["value"] == "0591-0405-05"
    assert identifiers[0]["assigner"] == "FDA"


async def test_create_medication_fhir_with_identifiers(client):
    resp = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert "identifier" in data
    assert len(data["identifier"]) == 1
    assert data["identifier"][0]["value"] == "0591-0405-05"
    assert data["identifier"][0]["assigner"]["display"] == "FDA"


# ── Ingredients ────────────────────────────────────────────────────────────────


async def test_create_medication_with_ingredients(client):
    resp = await client.post(BASE + "/", json=FULL)
    assert resp.status_code == 200
    data = resp.json()
    ingredients = data.get("ingredient", [])
    assert len(ingredients) == 1
    ing = ingredients[0]
    assert ing["item_codeable_concept_code"] == "7804"
    assert ing["is_active"] is True
    assert float(ing["strength_numerator_value"]) == pytest.approx(80.0)
    assert ing["strength_numerator_unit"] == "mg"
    assert float(ing["strength_denominator_value"]) == pytest.approx(1.0)


async def test_create_medication_fhir_with_ingredients(client):
    resp = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert "ingredient" in data
    ingredients = data["ingredient"]
    assert len(ingredients) == 1
    ing = ingredients[0]
    assert "itemCodeableConcept" in ing
    assert ing["itemCodeableConcept"]["coding"][0]["code"] == "7804"
    assert ing["isActive"] is True
    assert float(ing["strength"]["numerator"]["value"]) == pytest.approx(80.0)
    assert ing["strength"]["numerator"]["unit"] == "mg"
    assert float(ing["strength"]["denominator"]["value"]) == pytest.approx(1.0)


async def test_create_medication_ingredient_with_reference(client):
    payload = {
        **MINIMAL,
        "ingredients": [
            {
                "item_reference": "Substance/1",
                "item_reference_display": "Aspirin Substance",
                "is_active": True,
                "strength_numerator_value": "500",
                "strength_numerator_unit": "mg",
                "strength_denominator_value": "1",
                "strength_denominator_unit": "tablet",
            }
        ],
    }
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    ingredients = data.get("ingredient", [])
    assert len(ingredients) == 1
    assert ingredients[0]["item_reference_type"] == "Substance"
    assert ingredients[0]["item_reference_id"] == 1


async def test_create_medication_fhir_ingredient_with_reference(client):
    payload = {
        **MINIMAL,
        "ingredients": [
            {
                "item_reference": "Substance/1",
                "item_reference_display": "Aspirin Substance",
                "is_active": False,
            }
        ],
    }
    resp = await client.post(BASE + "/", json=payload, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    ingredients = data["ingredient"]
    assert len(ingredients) == 1
    assert "itemReference" in ingredients[0]
    assert ingredients[0]["itemReference"]["reference"] == "Substance/1"
    assert ingredients[0]["isActive"] is False


async def test_create_medication_ingredient_invalid_ref_type(client):
    payload = {
        **MINIMAL,
        "ingredients": [{"item_reference": "Practitioner/30001"}],
    }
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 422


# ── Batch ──────────────────────────────────────────────────────────────────────


async def test_create_medication_batch_only(client):
    payload = {
        **MINIMAL,
        "batch_lot_number": "LOT-XYZ",
        "batch_expiration_date": "2027-06-30T00:00:00Z",
    }
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["batch_lot_number"] == "LOT-XYZ"


async def test_create_medication_fhir_batch_only(client):
    payload = {
        **MINIMAL,
        "batch_lot_number": "LOT-XYZ",
        "batch_expiration_date": "2027-06-30T00:00:00Z",
    }
    resp = await client.post(BASE + "/", json=payload, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert "batch" in data
    assert data["batch"]["lotNumber"] == "LOT-XYZ"
    assert "2027-06-30" in data["batch"]["expirationDate"]


# ── Get ────────────────────────────────────────────────────────────────────────


async def test_get_medication_by_id(client):
    create_resp = await client.post(BASE + "/", json=MINIMAL)
    med_id = create_resp.json()["id"]
    resp = await client.get(f"{BASE}/{med_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == med_id


async def test_get_medication_fhir(client):
    create_resp = await client.post(BASE + "/", json=MINIMAL, headers=FHIR_ACCEPT)
    med_id = create_resp.json()["id"]
    resp = await client.get(f"{BASE}/{med_id}", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Medication"
    assert data["id"] == med_id


async def test_get_medication_not_found(client):
    resp = await client.get(f"{BASE}/999999")
    assert resp.status_code == 404


# ── Patch ──────────────────────────────────────────────────────────────────────


async def test_patch_medication_status(client):
    create_resp = await client.post(BASE + "/", json={**MINIMAL, "status": "active"})
    med_id = create_resp.json()["id"]
    resp = await client.patch(f"{BASE}/{med_id}", json={"status": "inactive"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "inactive"


async def test_patch_medication_code(client):
    create_resp = await client.post(BASE + "/", json=MINIMAL)
    med_id = create_resp.json()["id"]
    resp = await client.patch(f"{BASE}/{med_id}", json={"code_code": "NEW-123", "code_display": "New Drug"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["code_code"] == "NEW-123"
    assert data["code_display"] == "New Drug"


async def test_patch_medication_batch(client):
    create_resp = await client.post(BASE + "/", json=MINIMAL)
    med_id = create_resp.json()["id"]
    resp = await client.patch(f"{BASE}/{med_id}", json={"batch_lot_number": "NEW-LOT"})
    assert resp.status_code == 200
    assert resp.json()["batch_lot_number"] == "NEW-LOT"


async def test_patch_medication_manufacturer(client):
    create_resp = await client.post(BASE + "/", json=MINIMAL)
    med_id = create_resp.json()["id"]
    resp = await client.patch(f"{BASE}/{med_id}", json={"manufacturer": "Organization/190002"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["manufacturer_type"] == "Organization"
    assert data["manufacturer_id"] == 190002


async def test_patch_medication_not_found(client):
    resp = await client.patch(f"{BASE}/999999", json={"status": "inactive"})
    assert resp.status_code == 404


async def test_patch_medication_extra_field_rejected(client):
    create_resp = await client.post(BASE + "/", json=MINIMAL)
    med_id = create_resp.json()["id"]
    resp = await client.patch(f"{BASE}/{med_id}", json={"bad_field": "x"})
    assert resp.status_code == 400


# ── Delete ─────────────────────────────────────────────────────────────────────


async def test_delete_medication(client):
    create_resp = await client.post(BASE + "/", json=MINIMAL)
    med_id = create_resp.json()["id"]
    del_resp = await client.delete(f"{BASE}/{med_id}")
    assert del_resp.status_code == 204
    get_resp = await client.get(f"{BASE}/{med_id}")
    assert get_resp.status_code == 404


async def test_delete_medication_not_found(client):
    resp = await client.delete(f"{BASE}/999999")
    assert resp.status_code == 404


# ── List ───────────────────────────────────────────────────────────────────────


async def test_list_medications(client):
    await client.post(BASE + "/", json=MINIMAL)
    await client.post(BASE + "/", json=MINIMAL)
    resp = await client.get(BASE + "/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 2
    assert len(data["data"]) >= 2


async def test_list_medications_fhir_bundle(client):
    await client.post(BASE + "/", json=MINIMAL)
    resp = await client.get(BASE + "/", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Bundle"
    assert data["type"] == "searchset"
    assert data["total"] >= 1


async def test_list_medications_pagination(client):
    for _ in range(3):
        await client.post(BASE + "/", json=MINIMAL)
    resp = await client.get(BASE + "/?limit=2&offset=0")
    data = resp.json()
    assert data["limit"] == 2
    assert len(data["data"]) == 2
    assert data["total"] >= 3


async def test_list_medications_filter_status(client):
    await client.post(BASE + "/", json={**MINIMAL, "status": "active"})
    await client.post(BASE + "/", json={**MINIMAL, "status": "inactive"})
    resp = await client.get(BASE + "/?status=active")
    assert resp.status_code == 200
    data = resp.json()
    for med in data["data"]:
        assert med["status"] == "active"


async def test_list_medications_empty(client):
    resp = await client.get(BASE + "/")
    data = resp.json()
    assert data["total"] == 0
    assert data["data"] == []


# ── /me ────────────────────────────────────────────────────────────────────────


async def test_get_my_medications_found(client):
    await client.post(BASE + "/", json=MINIMAL)
    resp = await client.get(BASE + "/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1


async def test_get_my_medications_org_isolation(client, other_client):
    from app.auth.dependencies import get_current_user as _gcu
    from tests.conftest import make_test_user

    other_client._transport.app.dependency_overrides[_gcu] = make_test_user(
        sub="u-other", org_id="org-other", permissions=["medication:read"]
    )
    await client.post(BASE + "/", json=MINIMAL)
    resp = await other_client.get(BASE + "/me")
    assert resp.json()["total"] == 0


# ── Permissions ────────────────────────────────────────────────────────────────


async def test_create_medication_no_permission(client):
    from app.auth.dependencies import get_current_user as _gcu
    from tests.conftest import make_test_user

    app_obj = client._transport.app
    app_obj.dependency_overrides[_gcu] = make_test_user(permissions=["medication:read"])
    try:
        resp = await client.post(BASE + "/", json=MINIMAL)
        assert resp.status_code == 403
    finally:
        app_obj.dependency_overrides[_gcu] = make_test_user(
            permissions=["medication:create", "medication:read", "medication:update", "medication:delete"]
        )


# ── Content negotiation ────────────────────────────────────────────────────────


async def test_content_negotiation_defaults_to_plain(client):
    resp = await client.post(BASE + "/", json=MINIMAL)
    assert resp.status_code == 200
    data = resp.json()
    assert "resourceType" not in data
    assert isinstance(data["id"], int)


async def test_content_negotiation_fhir_accept(client):
    resp = await client.post(BASE + "/", json=MINIMAL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Medication"
    assert isinstance(data["id"], str)


# ── Multiple ingredients ───────────────────────────────────────────────────────


async def test_create_medication_multiple_ingredients(client):
    payload = {
        **MINIMAL,
        "ingredients": [
            {
                "item_codeable_concept_code": "7804",
                "item_codeable_concept_display": "Oxycodone",
                "is_active": True,
                "strength_numerator_value": "80",
                "strength_numerator_unit": "mg",
            },
            {
                "item_codeable_concept_code": "INACTIVE-001",
                "item_codeable_concept_display": "Inactive Filler",
                "is_active": False,
            },
        ],
    }
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    ingredients = data.get("ingredient", [])
    assert len(ingredients) == 2
    active = [i for i in ingredients if i.get("is_active") is True]
    assert len(active) == 1
    assert active[0]["item_codeable_concept_code"] == "7804"
