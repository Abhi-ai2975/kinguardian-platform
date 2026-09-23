"""Integration tests for /api/fhir/v1/invoices endpoints."""
import pytest

BASE = "/api/fhir/v1/invoices"
FHIR_ACCEPT = {"Accept": "application/fhir+json"}

MINIMAL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "status": "issued",
}

FULL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "status": "draft",
    "cancelled_reason": None,
    "type_system": "http://terminology.hl7.org/CodeSystem/invoice-type",
    "type_code": "patient-invoice",
    "type_display": "Patient Invoice",
    "subject": "Patient/10001",
    "subject_display": "John Smith",
    "recipient": "Organization/190001",
    "recipient_display": "General Hospital",
    "date": "2024-01-15T10:00:00Z",
    "issuer": "Organization/190001",
    "issuer_display": "General Hospital",
    "total_net_value": 100.00,
    "total_net_currency": "USD",
    "total_gross_value": 115.00,
    "total_gross_currency": "USD",
    "payment_terms": "Net 30 days",
}


# ── Create ─────────────────────────────────────────────────────────────────────


async def test_create_invoice_minimal(client):
    resp = await client.post(BASE + "/", json=MINIMAL)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("id") is not None
    assert data.get("status") == "issued"


async def test_create_invoice_full(client):
    resp = await client.post(BASE + "/", json=FULL)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "draft"
    assert data["type_code"] == "patient-invoice"
    assert data["subject_type"] == "Patient"
    assert data["subject_id"] == 10001
    assert data["total_gross_value"] == 115.0
    assert data["total_gross_currency"] == "USD"
    assert data["payment_terms"] == "Net 30 days"


async def test_create_invoice_fhir_format(client):
    resp = await client.post(BASE + "/", json=MINIMAL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Invoice"
    assert data["status"] == "issued"


async def test_create_invoice_extra_field_rejected(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "bad_field": "x"})
    assert resp.status_code == 400


async def test_create_invoice_invalid_status_rejected(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "status": "not-a-status"})
    assert resp.status_code == 422


async def test_create_invoice_with_participants(client):
    payload = {
        **MINIMAL,
        "participants": [
            {
                "actor": "Practitioner/30001",
                "actor_display": "Dr. Jane",
                "role_code": "doctor",
                "role_system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
            }
        ],
    }
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    participants = data.get("participant", [])
    assert len(participants) == 1
    assert participants[0]["reference_type"] == "Practitioner"
    assert participants[0]["reference_id"] == 30001


async def test_create_invoice_with_line_items(client):
    payload = {
        **MINIMAL,
        "line_items": [
            {
                "sequence": 1,
                "chargeitem_cc_code": "consultation",
                "chargeitem_cc_system": "http://example.org/charges",
                "chargeitem_cc_display": "Consultation",
                "price_components": [
                    {
                        "type": "base",
                        "amount_value": 100.0,
                        "amount_currency": "USD",
                    }
                ],
            }
        ],
        "total_price_components": [
            {
                "type": "base",
                "amount_value": 100.0,
                "amount_currency": "USD",
            }
        ],
    }
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    line_items = data.get("line_item", [])
    assert len(line_items) == 1
    assert line_items[0]["chargeitem_cc_code"] == "consultation"
    assert len(line_items[0].get("price_components", [])) == 1
    total_pcs = data.get("total_price_component", [])
    assert len(total_pcs) == 1


async def test_create_invoice_with_notes(client):
    payload = {
        **MINIMAL,
        "notes": [
            {
                "text": "Patient owes balance from prior visit.",
                "author_string": "Dr. Smith",
            }
        ],
    }
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    notes = data.get("note", [])
    assert len(notes) == 1
    assert notes[0]["text"] == "Patient owes balance from prior visit."
    assert notes[0]["author_string"] == "Dr. Smith"


async def test_create_invoice_fhir_with_money(client):
    payload = {**MINIMAL, "total_gross_value": 200.0, "total_gross_currency": "USD"}
    resp = await client.post(BASE + "/", json=payload, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Invoice"
    assert data["totalGross"]["value"] == 200.0
    assert data["totalGross"]["currency"] == "USD"


# ── Get by ID ──────────────────────────────────────────────────────────────────


async def test_get_invoice_by_id_plain(client):
    invoice_id = (await client.post(BASE + "/", json=MINIMAL)).json()["id"]
    resp = await client.get(f"{BASE}/{invoice_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == invoice_id
    assert data["status"] == "issued"


async def test_get_invoice_by_id_fhir(client):
    invoice_id = (await client.post(BASE + "/", json=MINIMAL)).json()["id"]
    resp = await client.get(f"{BASE}/{invoice_id}", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Invoice"
    assert data["id"] == str(invoice_id)


async def test_get_invoice_not_found(client):
    resp = await client.get(f"{BASE}/999999")
    assert resp.status_code == 404


# ── Patch ──────────────────────────────────────────────────────────────────────


async def test_patch_invoice_status(client):
    invoice_id = (await client.post(BASE + "/", json=MINIMAL)).json()["id"]
    resp = await client.patch(f"{BASE}/{invoice_id}", json={"status": "balanced"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "balanced"


async def test_patch_invoice_payment_terms(client):
    invoice_id = (await client.post(BASE + "/", json=MINIMAL)).json()["id"]
    resp = await client.patch(f"{BASE}/{invoice_id}", json={"payment_terms": "Due on receipt"})
    assert resp.status_code == 200
    assert resp.json()["payment_terms"] == "Due on receipt"


async def test_patch_invoice_money(client):
    invoice_id = (await client.post(BASE + "/", json=MINIMAL)).json()["id"]
    resp = await client.patch(
        f"{BASE}/{invoice_id}",
        json={"total_gross_value": 250.0, "total_gross_currency": "EUR"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_gross_value"] == 250.0
    assert data["total_gross_currency"] == "EUR"


async def test_patch_invoice_not_found(client):
    resp = await client.patch(f"{BASE}/999999", json={"status": "balanced"})
    assert resp.status_code == 404


# ── Delete ─────────────────────────────────────────────────────────────────────


async def test_delete_invoice(client):
    invoice_id = (await client.post(BASE + "/", json=MINIMAL)).json()["id"]
    assert (await client.delete(f"{BASE}/{invoice_id}")).status_code == 204
    assert (await client.get(f"{BASE}/{invoice_id}")).status_code == 404


async def test_delete_invoice_not_found(client):
    assert (await client.delete(f"{BASE}/999999")).status_code == 404


# ── List ───────────────────────────────────────────────────────────────────────


async def test_list_invoices_plain(client):
    await client.post(BASE + "/", json=MINIMAL)
    resp = await client.get(BASE + "/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert "data" in data
    assert "limit" in data
    assert "offset" in data


async def test_list_invoices_fhir_bundle(client):
    await client.post(BASE + "/", json=MINIMAL)
    resp = await client.get(BASE + "/", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Bundle"
    assert data["type"] == "searchset"
    assert data["total"] >= 1


async def test_list_invoices_pagination(client):
    for _ in range(3):
        await client.post(BASE + "/", json=MINIMAL)
    resp = await client.get(BASE + "/?limit=2&offset=0")
    data = resp.json()
    assert data["limit"] == 2
    assert len(data["data"]) == 2
    assert data["total"] >= 3


async def test_list_invoices_filter_status(client):
    await client.post(BASE + "/", json={**MINIMAL, "status": "issued"})
    await client.post(BASE + "/", json={**MINIMAL, "status": "draft"})
    resp = await client.get(BASE + "/?status=issued")
    assert resp.status_code == 200
    data = resp.json()
    for inv in data["data"]:
        assert inv["status"] == "issued"


async def test_list_invoices_empty(client):
    resp = await client.get(BASE + "/")
    data = resp.json()
    assert data["total"] == 0
    assert data["data"] == []


# ── /me ────────────────────────────────────────────────────────────────────────


async def test_get_my_invoices_found(client):
    await client.post(BASE + "/", json=MINIMAL)
    resp = await client.get(BASE + "/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1


async def test_get_my_invoices_org_isolation(client, other_client):
    from app.auth.dependencies import get_current_user as _gcu
    from tests.conftest import make_test_user

    # Give other_client invoice:read so it can reach /me (org isolation check)
    other_client._transport.app.dependency_overrides[_gcu] = make_test_user(
        sub="u-other", org_id="org-other", permissions=["invoice:read"]
    )
    await client.post(BASE + "/", json=MINIMAL)
    resp = await other_client.get(BASE + "/me")
    assert resp.json()["total"] == 0


# ── Permissions ────────────────────────────────────────────────────────────────


async def test_create_invoice_no_permission(client):
    from app.auth.dependencies import get_current_user as _gcu
    from tests.conftest import make_test_user

    app = client._transport.app
    app.dependency_overrides[_gcu] = make_test_user(permissions=["invoice:read"])
    try:
        resp = await client.post(BASE + "/", json=MINIMAL)
        assert resp.status_code == 403
    finally:
        app.dependency_overrides[_gcu] = make_test_user(
            permissions=["invoice:create", "invoice:read", "invoice:update", "invoice:delete"]
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
    assert data["resourceType"] == "Invoice"
    assert isinstance(data["id"], str)
