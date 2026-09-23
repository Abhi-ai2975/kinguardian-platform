"""Integration tests for /api/fhir/v1/coverages endpoints."""
import pytest

BASE = "/api/fhir/v1/coverages"
FHIR_ACCEPT = {"Accept": "application/fhir+json"}

MINIMAL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "status": "active",
    "beneficiary": "Patient/10001",
    "payor": [{"reference": "Organization/190001"}],
}

FULL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "status": "active",
    "type_system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
    "type_code": "EHCPOL",
    "type_display": "Extended Healthcare",
    "policy_holder": "Patient/10001",
    "policy_holder_display": "John Smith",
    "subscriber": "Patient/10001",
    "subscriber_display": "John Smith",
    "subscriber_id_value": "SUB-123456",
    "beneficiary": "Patient/10001",
    "beneficiary_display": "John Smith",
    "dependent": "01",
    "relationship_system": "http://terminology.hl7.org/CodeSystem/subscriber-relationship",
    "relationship_code": "self",
    "relationship_display": "Self",
    "period_start": "2024-01-01T00:00:00Z",
    "period_end": "2024-12-31T23:59:59Z",
    "payor": [
        {
            "reference": "Organization/190001",
            "reference_display": "General Hospital Insurance",
        }
    ],
    "order": 1,
    "network": "Gold Network",
    "subrogation": False,
    "identifiers": [
        {
            "use": "official",
            "type_system": "http://terminology.hl7.org/CodeSystem/v2-0203",
            "type_code": "MB",
            "type_display": "Member Number",
            "system": "http://example.org/fhir/coverage",
            "value": "MEM-001",
            "assigner": "General Hospital Insurance",
        }
    ],
    "classes": [
        {
            "type_system": "http://terminology.hl7.org/CodeSystem/coverage-class",
            "type_code": "group",
            "type_display": "Group",
            "value": "CB135",
            "name": "Corporate Baker's Inc. Plan",
        }
    ],
    "cost_to_beneficiary": [
        {
            "type_system": "http://terminology.hl7.org/CodeSystem/coverage-copay-type",
            "type_code": "gpvisit",
            "type_display": "GP Office Visit",
            "value_money_value": "20.00",
            "value_money_currency": "USD",
        }
    ],
    "contract": [
        {
            "reference": "Contract/1",
        }
    ],
}


# ── Create ─────────────────────────────────────────────────────────────────────


async def test_create_coverage_minimal(client):
    resp = await client.post(BASE + "/", json=MINIMAL)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("id") is not None
    assert isinstance(data["id"], int)
    assert data["status"] == "active"
    assert data["beneficiary_type"] == "Patient"
    assert data["beneficiary_id"] == 10001


async def test_create_coverage_full(client):
    resp = await client.post(BASE + "/", json=FULL)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "active"
    assert data["type_code"] == "EHCPOL"
    assert data["subscriber_id_value"] == "SUB-123456"
    assert data["policy_holder_type"] == "Patient"
    assert data["policy_holder_id"] == 10001
    assert data["subscriber_type"] == "Patient"
    assert data["subscriber_id"] == 10001
    assert data["dependent"] == "01"
    assert data["relationship_code"] == "self"
    assert data["order"] == 1
    assert data["network"] == "Gold Network"
    assert data["subrogation"] is False


async def test_create_coverage_fhir_format(client):
    resp = await client.post(BASE + "/", json=MINIMAL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Coverage"
    assert isinstance(data["id"], str)
    assert data["status"] == "active"
    assert data["beneficiary"]["reference"].startswith("Patient/")


async def test_create_coverage_fhir_full(client):
    resp = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Coverage"
    assert data["status"] == "active"
    assert data["type"]["coding"][0]["code"] == "EHCPOL"
    assert data["subscriberId"] == "SUB-123456"
    assert data["policyHolder"]["reference"] == "Patient/10001"
    assert data["subscriber"]["reference"] == "Patient/10001"
    assert data["beneficiary"]["reference"] == "Patient/10001"
    assert data["period"]["start"].startswith("2024-01-01")
    assert data["payor"][0]["reference"] == "Organization/190001"
    assert data["payor"][0]["display"] == "General Hospital Insurance"
    assert data["order"] == 1
    assert data["network"] == "Gold Network"
    assert data["subrogation"] is False


async def test_create_coverage_extra_field_rejected(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "bad_field": "x"})
    assert resp.status_code == 400


async def test_create_coverage_missing_beneficiary_rejected(client):
    payload = {
        "user_id": "u-test",
        "org_id": "org-test",
        "status": "active",
        "payor": [{"reference": "Organization/190001"}],
    }
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 400


async def test_create_coverage_missing_payor_rejected(client):
    payload = {
        "user_id": "u-test",
        "org_id": "org-test",
        "status": "active",
        "beneficiary": "Patient/10001",
        "payor": [],
    }
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code in (400, 422)


async def test_create_coverage_invalid_beneficiary_ref(client):
    payload = {**MINIMAL, "beneficiary": "NotARef"}
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 422


async def test_create_coverage_invalid_payor_ref_type(client):
    payload = {**MINIMAL, "payor": [{"reference": "Practitioner/30001"}]}
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 422


# ── Identifiers ────────────────────────────────────────────────────────────────


async def test_create_coverage_with_identifiers(client):
    resp = await client.post(BASE + "/", json=FULL)
    assert resp.status_code == 200
    data = resp.json()
    identifiers = data.get("identifier", [])
    assert len(identifiers) == 1
    assert identifiers[0]["use"] == "official"
    assert identifiers[0]["value"] == "MEM-001"
    assert identifiers[0]["assigner"] == "General Hospital Insurance"


async def test_create_coverage_fhir_with_identifiers(client):
    resp = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert "identifier" in data
    assert len(data["identifier"]) == 1
    assert data["identifier"][0]["value"] == "MEM-001"


# ── Classes ────────────────────────────────────────────────────────────────────


async def test_create_coverage_with_classes(client):
    resp = await client.post(BASE + "/", json=FULL)
    assert resp.status_code == 200
    data = resp.json()
    classes = data.get("classes", [])
    assert len(classes) == 1
    assert classes[0]["value"] == "CB135"
    assert classes[0]["name"] == "Corporate Baker's Inc. Plan"
    assert classes[0]["type_code"] == "group"


async def test_create_coverage_fhir_with_classes(client):
    resp = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert "class" in data
    assert len(data["class"]) == 1
    assert data["class"][0]["value"] == "CB135"
    assert data["class"][0]["name"] == "Corporate Baker's Inc. Plan"
    assert data["class"][0]["type"]["coding"][0]["code"] == "group"


# ── Cost to beneficiary ────────────────────────────────────────────────────────


async def test_create_coverage_with_cost_to_beneficiary(client):
    resp = await client.post(BASE + "/", json=FULL)
    assert resp.status_code == 200
    data = resp.json()
    ctb = data.get("cost_to_beneficiary", [])
    assert len(ctb) == 1
    assert ctb[0]["type_code"] == "gpvisit"
    assert float(ctb[0]["value_money_value"]) == pytest.approx(20.0)
    assert ctb[0]["value_money_currency"] == "USD"


async def test_create_coverage_fhir_with_cost_to_beneficiary(client):
    resp = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert "costToBeneficiary" in data
    ctb = data["costToBeneficiary"]
    assert len(ctb) == 1
    assert ctb[0]["type"]["coding"][0]["code"] == "gpvisit"
    assert float(ctb[0]["valueMoney"]["value"]) == pytest.approx(20.0)
    assert ctb[0]["valueMoney"]["currency"] == "USD"


async def test_create_coverage_with_quantity_cost(client):
    payload = {
        **MINIMAL,
        "cost_to_beneficiary": [
            {
                "type_code": "deductible",
                "value_quantity_value": "1000.00",
                "value_quantity_unit": "USD",
                "value_quantity_system": "urn:iso:std:iso:4217",
                "value_quantity_code": "USD",
            }
        ],
    }
    resp = await client.post(BASE + "/", json=payload, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    ctb = data["costToBeneficiary"]
    assert len(ctb) == 1
    assert "valueSimpleQuantity" in ctb[0]
    assert float(ctb[0]["valueSimpleQuantity"]["value"]) == pytest.approx(1000.0)
    assert ctb[0]["valueSimpleQuantity"]["unit"] == "USD"


async def test_create_coverage_with_cost_and_exception(client):
    payload = {
        **MINIMAL,
        "cost_to_beneficiary": [
            {
                "type_code": "gpvisit",
                "value_money_value": "20.00",
                "value_money_currency": "USD",
                "exceptions": [
                    {
                        "type_system": "http://example.org/fhir/exception",
                        "type_code": "retired",
                        "type_display": "Retired",
                        "period_start": "2024-01-01T00:00:00Z",
                        "period_end": "2024-12-31T23:59:59Z",
                    }
                ],
            }
        ],
    }
    resp = await client.post(BASE + "/", json=payload, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    ctb = data["costToBeneficiary"]
    assert len(ctb) == 1
    assert "exception" in ctb[0]
    exc = ctb[0]["exception"]
    assert len(exc) == 1
    assert exc[0]["type"]["coding"][0]["code"] == "retired"
    assert exc[0]["period"]["start"].startswith("2024-01-01")


# ── Contract ───────────────────────────────────────────────────────────────────


async def test_create_coverage_with_contract(client):
    resp = await client.post(BASE + "/", json=FULL)
    assert resp.status_code == 200
    data = resp.json()
    contracts = data.get("contract", [])
    assert len(contracts) == 1
    assert contracts[0]["reference_type"] == "Contract"
    assert contracts[0]["reference_id"] == 1


async def test_create_coverage_fhir_with_contract(client):
    resp = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert "contract" in data
    assert data["contract"][0]["reference"] == "Contract/1"


# ── Get ────────────────────────────────────────────────────────────────────────


async def test_get_coverage_by_id(client):
    create_resp = await client.post(BASE + "/", json=MINIMAL)
    cov_id = create_resp.json()["id"]
    resp = await client.get(f"{BASE}/{cov_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == cov_id
    assert data["status"] == "active"


async def test_get_coverage_fhir(client):
    create_resp = await client.post(BASE + "/", json=MINIMAL, headers=FHIR_ACCEPT)
    cov_id = create_resp.json()["id"]
    resp = await client.get(f"{BASE}/{cov_id}", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Coverage"
    assert data["id"] == cov_id


async def test_get_coverage_not_found(client):
    resp = await client.get(f"{BASE}/999999")
    assert resp.status_code == 404


# ── Patch ──────────────────────────────────────────────────────────────────────


async def test_patch_coverage_status(client):
    create_resp = await client.post(BASE + "/", json=MINIMAL)
    cov_id = create_resp.json()["id"]
    resp = await client.patch(f"{BASE}/{cov_id}", json={"status": "cancelled"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "cancelled"


async def test_patch_coverage_network(client):
    create_resp = await client.post(BASE + "/", json=MINIMAL)
    cov_id = create_resp.json()["id"]
    resp = await client.patch(f"{BASE}/{cov_id}", json={"network": "Platinum"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["network"] == "Platinum"


async def test_patch_coverage_subscriber_id_value(client):
    create_resp = await client.post(BASE + "/", json=MINIMAL)
    cov_id = create_resp.json()["id"]
    resp = await client.patch(f"{BASE}/{cov_id}", json={"subscriber_id_value": "NEW-SUB-99"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["subscriber_id_value"] == "NEW-SUB-99"


async def test_patch_coverage_not_found(client):
    resp = await client.patch(f"{BASE}/999999", json={"status": "draft"})
    assert resp.status_code == 404


async def test_patch_coverage_extra_field_rejected(client):
    create_resp = await client.post(BASE + "/", json=MINIMAL)
    cov_id = create_resp.json()["id"]
    resp = await client.patch(f"{BASE}/{cov_id}", json={"bad_field": "x"})
    assert resp.status_code == 400


# ── Delete ─────────────────────────────────────────────────────────────────────


async def test_delete_coverage(client):
    create_resp = await client.post(BASE + "/", json=MINIMAL)
    cov_id = create_resp.json()["id"]
    del_resp = await client.delete(f"{BASE}/{cov_id}")
    assert del_resp.status_code == 204
    get_resp = await client.get(f"{BASE}/{cov_id}")
    assert get_resp.status_code == 404


async def test_delete_coverage_not_found(client):
    resp = await client.delete(f"{BASE}/999999")
    assert resp.status_code == 404


# ── List ───────────────────────────────────────────────────────────────────────


async def test_list_coverages(client):
    await client.post(BASE + "/", json=MINIMAL)
    await client.post(BASE + "/", json=MINIMAL)
    resp = await client.get(BASE + "/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 2
    assert len(data["data"]) >= 2


async def test_list_coverages_fhir_bundle(client):
    await client.post(BASE + "/", json=MINIMAL)
    resp = await client.get(BASE + "/", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Bundle"
    assert data["type"] == "searchset"
    assert data["total"] >= 1


async def test_list_coverages_pagination(client):
    for _ in range(3):
        await client.post(BASE + "/", json=MINIMAL)
    resp = await client.get(BASE + "/?limit=2&offset=0")
    data = resp.json()
    assert data["limit"] == 2
    assert len(data["data"]) == 2
    assert data["total"] >= 3


async def test_list_coverages_filter_status(client):
    await client.post(BASE + "/", json={**MINIMAL, "status": "active"})
    await client.post(BASE + "/", json={**MINIMAL, "status": "draft"})
    resp = await client.get(BASE + "/?status=active")
    assert resp.status_code == 200
    data = resp.json()
    for cov in data["data"]:
        assert cov["status"] == "active"


async def test_list_coverages_empty(client):
    resp = await client.get(BASE + "/")
    data = resp.json()
    assert data["total"] == 0
    assert data["data"] == []


# ── /me ────────────────────────────────────────────────────────────────────────


async def test_get_my_coverages_found(client):
    await client.post(BASE + "/", json=MINIMAL)
    resp = await client.get(BASE + "/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1


async def test_get_my_coverages_org_isolation(client, other_client):
    from app.auth.dependencies import get_current_user as _gcu
    from tests.conftest import make_test_user

    other_client._transport.app.dependency_overrides[_gcu] = make_test_user(
        sub="u-other", org_id="org-other", permissions=["coverage:read"]
    )
    await client.post(BASE + "/", json=MINIMAL)
    resp = await other_client.get(BASE + "/me")
    assert resp.json()["total"] == 0


# ── Permissions ────────────────────────────────────────────────────────────────


async def test_create_coverage_no_permission(client):
    from app.auth.dependencies import get_current_user as _gcu
    from tests.conftest import make_test_user

    app_obj = client._transport.app
    app_obj.dependency_overrides[_gcu] = make_test_user(permissions=["coverage:read"])
    try:
        resp = await client.post(BASE + "/", json=MINIMAL)
        assert resp.status_code == 403
    finally:
        app_obj.dependency_overrides[_gcu] = make_test_user(
            permissions=["coverage:create", "coverage:read", "coverage:update", "coverage:delete"]
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
    assert data["resourceType"] == "Coverage"
    assert isinstance(data["id"], str)


# ── Multiple payors ────────────────────────────────────────────────────────────


async def test_create_coverage_multiple_payors(client):
    payload = {
        **MINIMAL,
        "payor": [
            {"reference": "Organization/190001", "reference_display": "Primary Insurer"},
            {"reference": "Patient/10001", "reference_display": "Self-pay"},
        ],
    }
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    payors = data.get("payor", [])
    assert len(payors) == 2


async def test_create_coverage_fhir_multiple_payors(client):
    payload = {
        **MINIMAL,
        "payor": [
            {"reference": "Organization/190001", "reference_display": "Primary Insurer"},
            {"reference": "Patient/10001", "reference_display": "Self-pay"},
        ],
    }
    resp = await client.post(BASE + "/", json=payload, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["payor"]) == 2
    refs = {p["reference"] for p in data["payor"]}
    assert "Organization/190001" in refs
    assert "Patient/10001" in refs
