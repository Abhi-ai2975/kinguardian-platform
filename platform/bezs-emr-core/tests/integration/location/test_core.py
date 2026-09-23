"""Integration tests for /api/fhir/v1/locations endpoints."""
import pytest

BASE = "/api/fhir/v1/locations"
FHIR_ACCEPT = {"Accept": "application/fhir+json"}

MINIMAL = {
    "user_id": "u-test",
    "org_id": "org-test",
}

FULL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "status": "active",
    "operational_status_system": "http://terminology.hl7.org/CodeSystem/v2-0116",
    "operational_status_code": "O",
    "operational_status_display": "Occupied",
    "name": "Main Building",
    "description": "Primary hospital building",
    "mode": "instance",
    "address_use": "work",
    "address_type": "physical",
    "address_line": ["123 Main St", "Suite 100"],
    "address_city": "Springfield",
    "address_state": "IL",
    "address_postal_code": "62701",
    "address_country": "US",
    "physical_type_system": "http://terminology.hl7.org/CodeSystem/location-physical-type",
    "physical_type_code": "bu",
    "physical_type_display": "Building",
    "physical_type_text": "Building",
    "managing_organization": "Organization/190001",
    "managing_organization_display": "General Hospital",
    "availability_exceptions": "Closed on public holidays.",
    "position_longitude": -89.6501,
    "position_latitude": 39.7817,
    "position_altitude": 180.0,
}


# ── Create ─────────────────────────────────────────────────────────────────────


async def test_create_location_minimal(client):
    resp = await client.post(BASE + "/", json=MINIMAL)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("id") is not None
    assert isinstance(data["id"], int)


async def test_create_location_full(client):
    resp = await client.post(BASE + "/", json=FULL)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "active"
    assert data["name"] == "Main Building"
    assert data["mode"] == "instance"
    assert data["address_city"] == "Springfield"
    assert data["address_line"] == ["123 Main St", "Suite 100"]
    assert data["physical_type_code"] == "bu"
    assert data["managing_organization_type"] == "Organization"
    assert data["managing_organization_id"] == 190001
    assert data["position_longitude"] == pytest.approx(-89.6501, rel=1e-4)
    assert data["position_latitude"] == pytest.approx(39.7817, rel=1e-4)
    assert data["position_altitude"] == pytest.approx(180.0, rel=1e-4)


async def test_create_location_fhir_format(client):
    resp = await client.post(BASE + "/", json=MINIMAL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Location"
    assert isinstance(data["id"], str)


async def test_create_location_extra_field_rejected(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "bad_field": "x"})
    assert resp.status_code == 400


async def test_create_location_invalid_status_rejected(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "status": "not-a-status"})
    assert resp.status_code == 422


async def test_create_location_fhir_with_address(client):
    resp = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Location"
    assert data["address"]["city"] == "Springfield"
    assert "123 Main St" in data["address"]["line"]
    assert data["address"]["postalCode"] == "62701"


async def test_create_location_fhir_with_position(client):
    resp = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert "position" in data
    assert data["position"]["latitude"] == pytest.approx(39.7817, rel=1e-4)
    assert data["position"]["longitude"] == pytest.approx(-89.6501, rel=1e-4)
    assert data["position"]["altitude"] == pytest.approx(180.0, rel=1e-4)


async def test_create_location_fhir_managing_organization(client):
    resp = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["managingOrganization"]["reference"] == "Organization/190001"
    assert data["managingOrganization"]["display"] == "General Hospital"


async def test_create_location_with_aliases(client):
    payload = {**MINIMAL, "aliases": ["Old Building", "North Wing"]}
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    aliases = data.get("alias", [])
    assert len(aliases) == 2
    alias_values = [a["alias"] for a in aliases]
    assert "Old Building" in alias_values
    assert "North Wing" in alias_values


async def test_create_location_fhir_with_aliases(client):
    payload = {**MINIMAL, "aliases": ["Old Building", "North Wing"]}
    resp = await client.post(BASE + "/", json=payload, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert "alias" in data
    assert "Old Building" in data["alias"]
    assert "North Wing" in data["alias"]


async def test_create_location_with_types(client):
    payload = {
        **MINIMAL,
        "types": [
            {
                "coding_system": "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
                "coding_code": "HOSP",
                "coding_display": "Hospital",
                "text": "Hospital",
            }
        ],
    }
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    types = data.get("type", [])
    assert len(types) == 1
    assert types[0]["coding_code"] == "HOSP"


async def test_create_location_with_telecoms(client):
    payload = {
        **MINIMAL,
        "telecoms": [
            {"system": "phone", "value": "555-1234", "use": "work"}
        ],
    }
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    telecoms = data.get("telecom", [])
    assert len(telecoms) == 1
    assert telecoms[0]["value"] == "555-1234"
    assert telecoms[0]["system"] == "phone"


async def test_create_location_with_hours(client):
    payload = {
        **MINIMAL,
        "hours_of_operation": [
            {
                "days_of_week": ["mon", "tue", "wed", "thu", "fri"],
                "all_day": False,
                "opening_time": "08:00:00",
                "closing_time": "17:00:00",
            }
        ],
    }
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    hours = data.get("hours_of_operation", [])
    assert len(hours) == 1
    assert hours[0]["all_day"] is False
    assert "mon" in hours[0]["days_of_week"]
    assert hours[0]["opening_time"] == "08:00:00"


async def test_create_location_fhir_with_hours(client):
    payload = {
        **MINIMAL,
        "hours_of_operation": [
            {
                "days_of_week": ["mon", "fri"],
                "all_day": True,
            }
        ],
    }
    resp = await client.post(BASE + "/", json=payload, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    hours = data.get("hoursOfOperation", [])
    assert len(hours) == 1
    assert hours[0]["allDay"] is True
    assert "mon" in hours[0]["daysOfWeek"]


async def test_create_location_with_part_of(client):
    parent_id = (await client.post(BASE + "/", json={**MINIMAL, "name": "Parent"})).json()["id"]
    payload = {**MINIMAL, "part_of": f"Location/{parent_id}", "part_of_display": "Parent Location"}
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["part_of_type"] == "Location"
    assert data["part_of_id"] == parent_id


# ── Get by ID ──────────────────────────────────────────────────────────────────


async def test_get_location_by_id_plain(client):
    location_id = (await client.post(BASE + "/", json=MINIMAL)).json()["id"]
    resp = await client.get(f"{BASE}/{location_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == location_id


async def test_get_location_by_id_fhir(client):
    location_id = (await client.post(BASE + "/", json=MINIMAL)).json()["id"]
    resp = await client.get(f"{BASE}/{location_id}", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Location"
    assert data["id"] == str(location_id)


async def test_get_location_not_found(client):
    resp = await client.get(f"{BASE}/999999")
    assert resp.status_code == 404


# ── Patch ──────────────────────────────────────────────────────────────────────


async def test_patch_location_status(client):
    location_id = (await client.post(BASE + "/", json=MINIMAL)).json()["id"]
    resp = await client.patch(f"{BASE}/{location_id}", json={"status": "inactive"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "inactive"


async def test_patch_location_name(client):
    location_id = (await client.post(BASE + "/", json=MINIMAL)).json()["id"]
    resp = await client.patch(f"{BASE}/{location_id}", json={"name": "Updated Name"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Name"


async def test_patch_location_address(client):
    location_id = (await client.post(BASE + "/", json=FULL)).json()["id"]
    resp = await client.patch(
        f"{BASE}/{location_id}",
        json={"address_city": "Chicago", "address_line": ["456 Oak Ave"]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["address_city"] == "Chicago"
    assert data["address_line"] == ["456 Oak Ave"]


async def test_patch_location_not_found(client):
    resp = await client.patch(f"{BASE}/999999", json={"name": "X"})
    assert resp.status_code == 404


# ── Delete ─────────────────────────────────────────────────────────────────────


async def test_delete_location(client):
    location_id = (await client.post(BASE + "/", json=MINIMAL)).json()["id"]
    assert (await client.delete(f"{BASE}/{location_id}")).status_code == 204
    assert (await client.get(f"{BASE}/{location_id}")).status_code == 404


async def test_delete_location_not_found(client):
    assert (await client.delete(f"{BASE}/999999")).status_code == 404


# ── List ───────────────────────────────────────────────────────────────────────


async def test_list_locations_plain(client):
    await client.post(BASE + "/", json=MINIMAL)
    resp = await client.get(BASE + "/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert "data" in data
    assert "limit" in data
    assert "offset" in data


async def test_list_locations_fhir_bundle(client):
    await client.post(BASE + "/", json=MINIMAL)
    resp = await client.get(BASE + "/", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Bundle"
    assert data["type"] == "searchset"
    assert data["total"] >= 1


async def test_list_locations_pagination(client):
    for _ in range(3):
        await client.post(BASE + "/", json=MINIMAL)
    resp = await client.get(BASE + "/?limit=2&offset=0")
    data = resp.json()
    assert data["limit"] == 2
    assert len(data["data"]) == 2
    assert data["total"] >= 3


async def test_list_locations_filter_status(client):
    await client.post(BASE + "/", json={**MINIMAL, "status": "active"})
    await client.post(BASE + "/", json={**MINIMAL, "status": "inactive"})
    resp = await client.get(BASE + "/?status=active")
    assert resp.status_code == 200
    data = resp.json()
    for loc in data["data"]:
        assert loc["status"] == "active"


async def test_list_locations_empty(client):
    resp = await client.get(BASE + "/")
    data = resp.json()
    assert data["total"] == 0
    assert data["data"] == []


# ── /me ────────────────────────────────────────────────────────────────────────


async def test_get_my_locations_found(client):
    await client.post(BASE + "/", json=MINIMAL)
    resp = await client.get(BASE + "/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1


async def test_get_my_locations_org_isolation(client, other_client):
    from app.auth.dependencies import get_current_user as _gcu
    from tests.conftest import make_test_user

    other_client._transport.app.dependency_overrides[_gcu] = make_test_user(
        sub="u-other", org_id="org-other", permissions=["location:read"]
    )
    await client.post(BASE + "/", json=MINIMAL)
    resp = await other_client.get(BASE + "/me")
    assert resp.json()["total"] == 0


# ── Permissions ────────────────────────────────────────────────────────────────


async def test_create_location_no_permission(client):
    from app.auth.dependencies import get_current_user as _gcu
    from tests.conftest import make_test_user

    app_obj = client._transport.app
    app_obj.dependency_overrides[_gcu] = make_test_user(permissions=["location:read"])
    try:
        resp = await client.post(BASE + "/", json=MINIMAL)
        assert resp.status_code == 403
    finally:
        app_obj.dependency_overrides[_gcu] = make_test_user(
            permissions=["location:create", "location:read", "location:update", "location:delete"]
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
    assert data["resourceType"] == "Location"
    assert isinstance(data["id"], str)
