"""Integration tests for /api/fhir/v1/provenances endpoints."""
import pytest

BASE = "/api/fhir/v1/provenances"
FHIR_ACCEPT = {"Accept": "application/fhir+json"}

MINIMAL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "recorded": "2024-01-15T10:30:00Z",
    "targets": [{"reference": "Patient/10001"}],
    "agents": [
        {
            "who": "Practitioner/30001",
        }
    ],
}

FULL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "recorded": "2024-01-15T10:30:00Z",
    "occurred_date_time": "2024-01-15T10:00:00Z",
    "targets": [
        {"reference": "Patient/10001", "reference_display": "John Doe"},
        {"reference": "Observation/160001"},
    ],
    "agents": [
        {
            "type_system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
            "type_code": "AUT",
            "type_display": "Author",
            "who": "Practitioner/30001",
            "who_display": "Dr. Smith",
            "on_behalf_of": "Organization/190001",
            "on_behalf_of_display": "General Hospital",
            "roles": [
                {
                    "coding_system": "http://terminology.hl7.org/CodeSystem/security-role-type",
                    "coding_code": "author",
                    "coding_display": "Author",
                }
            ],
        }
    ],
    "location": "Location/230001",
    "location_display": "Ward 3",
    "activity_system": "http://terminology.hl7.org/CodeSystem/v3-DataOperation",
    "activity_code": "CREATE",
    "activity_display": "create",
    "activity_text": "Create patient record",
    "policies": [{"uri": "http://hospital.example.org/policies/privacy"}],
    "reasons": [
        {
            "coding_system": "http://snomed.info/sct",
            "coding_code": "308646001",
            "coding_display": "Death certification",
            "text": "Patient death certificate",
        }
    ],
    "entities": [
        {
            "role": "source",
            "what": "DocumentReference/1",
            "what_display": "Source Document",
            "entity_agents": [
                {
                    "who": "Device/1",
                    "who_display": "Scanner",
                }
            ],
        }
    ],
    "signatures": [
        {
            "when": "2024-01-15T10:30:00Z",
            "who": "Practitioner/30001",
            "who_display": "Dr. Smith",
            "target_format": "application/fhir+json",
            "sig_format": "application/signature+xml",
            "data": "dGVzdA==",
            "signature_types": [
                {
                    "system": "urn:iso-astm:E1762-95:2013",
                    "code": "1.2.840.10065.1.12.1.1",
                    "display": "Author's Signature",
                }
            ],
        }
    ],
}


# ── Helpers ────────────────────────────────────────────────────────────────────


async def _create(client, payload=None) -> dict:
    resp = await client.post(BASE + "/", json=payload or MINIMAL)
    assert resp.status_code == 200
    return resp.json()


# ── Create minimal ─────────────────────────────────────────────────────────────


async def test_create_provenance_minimal(client):
    data = await _create(client)
    assert isinstance(data["id"], int)
    assert data["recorded"] is not None
    targets = data.get("targets", [])
    assert len(targets) == 1
    assert targets[0]["reference_type"] == "Patient"
    assert targets[0]["reference_id"] == 10001
    agents = data.get("agents", [])
    assert len(agents) == 1
    assert agents[0]["who_type"] == "Practitioner"
    assert agents[0]["who_id"] == 30001


async def test_create_provenance_minimal_fhir(client):
    resp = await client.post(BASE + "/", json=MINIMAL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Provenance"
    assert isinstance(data["id"], str)
    assert data["target"][0]["reference"] == "Patient/10001"
    assert data["agent"][0]["who"]["reference"] == "Practitioner/30001"


# ── Create full ────────────────────────────────────────────────────────────────


async def test_create_provenance_full(client):
    data = await _create(client, FULL)
    assert data["occurred_date_time"] is not None
    assert len(data["targets"]) == 2
    assert data["targets"][0]["reference_display"] == "John Doe"
    assert data["location_type"] == "Location"
    assert data["location_id"] == 230001
    assert data["activity_code"] == "CREATE"
    assert len(data["policies"]) == 1
    assert "privacy" in data["policies"][0]["uri"]
    assert len(data["reasons"]) == 1
    assert data["reasons"][0]["coding_code"] == "308646001"
    agents = data["agents"]
    assert len(agents) == 1
    assert agents[0]["type_code"] == "AUT"
    assert agents[0]["who_type"] == "Practitioner"
    assert agents[0]["on_behalf_of_type"] == "Organization"
    assert agents[0]["on_behalf_of_id"] == 190001
    roles = agents[0].get("roles", [])
    assert len(roles) == 1
    assert roles[0]["coding_code"] == "author"
    entities = data.get("entities", [])
    assert len(entities) == 1
    assert entities[0]["role"] == "source"
    assert entities[0]["what_type"] == "DocumentReference"
    assert entities[0]["what_id"] == 1
    ea = entities[0].get("entity_agents", [])
    assert len(ea) == 1
    assert ea[0]["who_type"] == "Device"
    sigs = data.get("signatures", [])
    assert len(sigs) == 1
    assert sigs[0]["data"] == "dGVzdA=="
    sig_types = sigs[0].get("signature_types", [])
    assert len(sig_types) == 1
    assert sig_types[0]["code"] == "1.2.840.10065.1.12.1.1"


async def test_create_provenance_full_fhir(client):
    resp = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Provenance"
    assert len(data["target"]) == 2
    assert data["target"][0]["reference"] == "Patient/10001"
    assert data["target"][0]["display"] == "John Doe"
    assert "occurredDateTime" in data
    assert data["location"]["reference"] == "Location/230001"
    assert data["activity"]["coding"][0]["code"] == "CREATE"
    assert len(data["policy"]) == 1
    assert len(data["reason"]) == 1
    assert data["reason"][0]["coding"][0]["code"] == "308646001"
    agent = data["agent"][0]
    assert agent["type"]["coding"][0]["code"] == "AUT"
    assert agent["who"]["reference"] == "Practitioner/30001"
    assert agent["onBehalfOf"]["reference"] == "Organization/190001"
    assert len(agent["role"]) == 1
    assert data["entity"][0]["role"] == "source"
    assert data["entity"][0]["what"]["reference"] == "DocumentReference/1"
    assert data["entity"][0]["agent"][0]["who"]["reference"] == "Device/1"
    sig = data["signature"][0]
    assert sig["when"] is not None
    assert sig["data"] == "dGVzdA=="
    assert sig["type"][0]["code"] == "1.2.840.10065.1.12.1.1"


# ── Validation ─────────────────────────────────────────────────────────────────


async def test_create_extra_field_rejected(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "bad_field": "x"})
    assert resp.status_code == 400


async def test_create_missing_recorded_rejected(client):
    payload = {**MINIMAL}
    payload.pop("recorded")
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code in (400, 422)


async def test_create_missing_targets_rejected(client):
    payload = {**MINIMAL}
    payload.pop("targets")
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code in (400, 422)


async def test_create_empty_targets_rejected(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "targets": []})
    assert resp.status_code in (400, 422)


async def test_create_missing_agents_rejected(client):
    payload = {**MINIMAL}
    payload.pop("agents")
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code in (400, 422)


async def test_create_empty_agents_rejected(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "agents": []})
    assert resp.status_code in (400, 422)


async def test_create_invalid_target_ref_format(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "targets": [{"reference": "NotARef"}]})
    assert resp.status_code == 422


async def test_create_invalid_agent_who_type(client):
    resp = await client.post(BASE + "/", json={
        **MINIMAL,
        "agents": [{"who": "Location/230001"}],
    })
    assert resp.status_code == 422


async def test_create_invalid_agent_who_format(client):
    resp = await client.post(BASE + "/", json={
        **MINIMAL,
        "agents": [{"who": "NoSlash"}],
    })
    assert resp.status_code == 422


async def test_create_invalid_location_type(client):
    resp = await client.post(BASE + "/", json={
        **MINIMAL,
        "location": "Patient/10001",
    })
    assert resp.status_code == 422


async def test_create_invalid_location_format(client):
    resp = await client.post(BASE + "/", json={
        **MINIMAL,
        "location": "bad-format",
    })
    assert resp.status_code == 422


async def test_create_signature_requires_signature_types(client):
    payload = {
        **MINIMAL,
        "signatures": [
            {"when": "2024-01-15T10:30:00Z", "signature_types": []}
        ],
    }
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code in (400, 422)


async def test_create_invalid_entity_role(client):
    payload = {
        **MINIMAL,
        "entities": [{"role": "bad-role", "what": "DocumentReference/1"}],
    }
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code in (400, 422)


# ── occurred[x] variants ───────────────────────────────────────────────────────


async def test_occurred_datetime(client):
    payload = {**MINIMAL, "occurred_date_time": "2024-01-10T08:00:00Z"}
    data = await _create(client, payload)
    assert data["occurred_date_time"] is not None


async def test_occurred_datetime_fhir(client):
    payload = {**MINIMAL, "occurred_date_time": "2024-01-10T08:00:00Z"}
    resp = await client.post(BASE + "/", json=payload, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert "occurredDateTime" in data
    assert "2024-01-10" in data["occurredDateTime"]


async def test_occurred_period(client):
    payload = {
        **MINIMAL,
        "occurred_period_start": "2024-01-01T00:00:00Z",
        "occurred_period_end": "2024-01-15T00:00:00Z",
    }
    data = await _create(client, payload)
    assert data["occurred_period_start"] is not None
    assert data["occurred_period_end"] is not None


async def test_occurred_period_fhir(client):
    payload = {
        **MINIMAL,
        "occurred_period_start": "2024-01-01T00:00:00Z",
        "occurred_period_end": "2024-01-15T00:00:00Z",
    }
    resp = await client.post(BASE + "/", json=payload, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert "occurredPeriod" in data
    assert "start" in data["occurredPeriod"]
    assert "end" in data["occurredPeriod"]


# ── Get by ID ──────────────────────────────────────────────────────────────────


async def test_get_by_id(client):
    created = await _create(client)
    resp = await client.get(f"{BASE}/{created['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == created["id"]
    assert len(data["targets"]) == 1
    assert len(data["agents"]) == 1


async def test_get_by_id_fhir(client):
    created = await _create(client)
    resp = await client.get(f"{BASE}/{created['id']}", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Provenance"
    assert data["id"] == str(created["id"])


async def test_get_nonexistent(client):
    resp = await client.get(f"{BASE}/9999999")
    assert resp.status_code == 404


# ── List ───────────────────────────────────────────────────────────────────────


async def test_list_empty(client):
    resp = await client.get(BASE + "/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["data"] == []


async def test_list_returns_created(client):
    await _create(client)
    await _create(client)
    resp = await client.get(BASE + "/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert len(data["data"]) == 2


async def test_list_fhir(client):
    await _create(client)
    resp = await client.get(BASE + "/", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Bundle"
    assert data["type"] == "searchset"
    assert data["total"] >= 1
    assert data["entry"][0]["resource"]["resourceType"] == "Provenance"


async def test_list_pagination(client):
    for _ in range(3):
        await _create(client)
    resp = await client.get(BASE + "/?limit=2&offset=0")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3
    assert len(data["data"]) == 2
    resp2 = await client.get(BASE + "/?limit=2&offset=2")
    assert resp2.status_code == 200
    assert len(resp2.json()["data"]) == 1


# ── /me endpoint ───────────────────────────────────────────────────────────────


async def test_me_returns_own_records(client):
    await _create(client)
    await _create(client)
    resp = await client.get(BASE + "/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert all(r["user_id"] == "u-test" for r in data["data"])


async def test_me_does_not_return_other_users(client, other_client):
    from app.auth.dependencies import get_current_user as _gcu
    from tests.conftest import make_test_user

    perms = ["provenance:create", "provenance:read", "provenance:update", "provenance:delete"]
    # Restore u-test with provenance permissions (other_client fixture may have overridden this)
    client._transport.app.dependency_overrides[_gcu] = make_test_user(permissions=perms)
    await _create(client)
    # Switch to u-other — should see zero records
    other_client._transport.app.dependency_overrides[_gcu] = make_test_user(
        sub="u-other", org_id="org-other", permissions=["provenance:read"]
    )
    resp = await other_client.get(BASE + "/me")
    assert resp.status_code == 200
    assert resp.json()["total"] == 0


async def test_me_fhir(client):
    await _create(client)
    resp = await client.get(BASE + "/me", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Bundle"
    assert data["total"] >= 1


# ── Patch ──────────────────────────────────────────────────────────────────────


async def test_patch_scalar_fields(client):
    created = await _create(client)
    prov_id = created["id"]
    resp = await client.patch(f"{BASE}/{prov_id}", json={
        "activity_code": "UPDATE",
        "activity_display": "update",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["activity_code"] == "UPDATE"
    assert data["activity_display"] == "update"


async def test_patch_scalar_fields_fhir(client):
    created = await _create(client)
    prov_id = created["id"]
    resp = await client.patch(f"{BASE}/{prov_id}", json={
        "activity_code": "DELETE",
        "activity_system": "http://terminology.hl7.org/CodeSystem/v3-DataOperation",
    }, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Provenance"
    assert data["activity"]["coding"][0]["code"] == "DELETE"


async def test_patch_targets(client):
    created = await _create(client)
    prov_id = created["id"]
    resp = await client.patch(f"{BASE}/{prov_id}", json={
        "targets": [{"reference": "Observation/160001"}],
    })
    assert resp.status_code == 200
    data = resp.json()
    targets = data["targets"]
    assert len(targets) == 1
    assert targets[0]["reference_type"] == "Observation"
    assert targets[0]["reference_id"] == 160001


async def test_patch_policies(client):
    created = await _create(client)
    prov_id = created["id"]
    resp = await client.patch(f"{BASE}/{prov_id}", json={
        "policies": [
            {"uri": "http://hospital.example.org/policies/p1"},
            {"uri": "http://hospital.example.org/policies/p2"},
        ],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["policies"]) == 2


async def test_patch_reasons(client):
    created = await _create(client)
    prov_id = created["id"]
    resp = await client.patch(f"{BASE}/{prov_id}", json={
        "reasons": [{"coding_code": "R-001", "text": "Routine update"}],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["reasons"]) == 1
    assert data["reasons"][0]["coding_code"] == "R-001"


async def test_patch_agents_replaces(client):
    created = await _create(client)
    prov_id = created["id"]
    resp = await client.patch(f"{BASE}/{prov_id}", json={
        "agents": [
            {
                "who": "Organization/190001",
                "roles": [{"coding_code": "reviewer"}],
            }
        ],
    })
    assert resp.status_code == 200
    data = resp.json()
    agents = data["agents"]
    assert len(agents) == 1
    assert agents[0]["who_type"] == "Organization"
    assert agents[0]["who_id"] == 190001
    assert len(agents[0].get("roles", [])) == 1


async def test_patch_entities(client):
    created = await _create(client)
    prov_id = created["id"]
    resp = await client.patch(f"{BASE}/{prov_id}", json={
        "entities": [
            {
                "role": "revision",
                "what": "Observation/160001",
            }
        ],
    })
    assert resp.status_code == 200
    data = resp.json()
    entities = data.get("entities", [])
    assert len(entities) == 1
    assert entities[0]["role"] == "revision"
    assert entities[0]["what_type"] == "Observation"


async def test_patch_signatures(client):
    created = await _create(client)
    prov_id = created["id"]
    resp = await client.patch(f"{BASE}/{prov_id}", json={
        "signatures": [
            {
                "when": "2024-02-01T00:00:00Z",
                "signature_types": [{"code": "1.2.3"}],
            }
        ],
    })
    assert resp.status_code == 200
    data = resp.json()
    sigs = data.get("signatures", [])
    assert len(sigs) == 1
    assert len(sigs[0].get("signature_types", [])) == 1
    assert sigs[0]["signature_types"][0]["code"] == "1.2.3"


async def test_patch_nonexistent(client):
    resp = await client.patch(f"{BASE}/9999999", json={"activity_code": "X"})
    assert resp.status_code == 404


async def test_patch_extra_field_rejected(client):
    created = await _create(client)
    resp = await client.patch(f"{BASE}/{created['id']}", json={"bad_field": "x"})
    assert resp.status_code == 400


# ── Delete ─────────────────────────────────────────────────────────────────────


async def test_delete_provenance(client):
    created = await _create(client)
    prov_id = created["id"]
    resp = await client.delete(f"{BASE}/{prov_id}")
    assert resp.status_code == 204
    resp2 = await client.get(f"{BASE}/{prov_id}")
    assert resp2.status_code == 404


async def test_delete_nonexistent(client):
    resp = await client.delete(f"{BASE}/9999999")
    assert resp.status_code == 404


# ── Agent roles (grandchild) ───────────────────────────────────────────────────


async def test_agent_with_multiple_roles(client):
    payload = {
        **MINIMAL,
        "agents": [
            {
                "who": "Practitioner/30001",
                "roles": [
                    {"coding_code": "author"},
                    {"coding_code": "custodian"},
                ],
            }
        ],
    }
    data = await _create(client, payload)
    agents = data["agents"]
    assert len(agents[0].get("roles", [])) == 2


async def test_agent_with_roles_fhir(client):
    payload = {
        **MINIMAL,
        "agents": [
            {
                "who": "Practitioner/30001",
                "roles": [{"coding_system": "http://example.org", "coding_code": "author"}],
            }
        ],
    }
    resp = await client.post(BASE + "/", json=payload, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert "role" in data["agent"][0]
    assert data["agent"][0]["role"][0]["coding"][0]["code"] == "author"


# ── Multiple agents ────────────────────────────────────────────────────────────


async def test_multiple_agents(client):
    payload = {
        **MINIMAL,
        "agents": [
            {"who": "Practitioner/30001"},
            {"who": "Device/1"},
        ],
    }
    data = await _create(client, payload)
    assert len(data["agents"]) == 2


# ── Entity with agents (grandchild) ───────────────────────────────────────────


async def test_entity_with_multiple_entity_agents(client):
    payload = {
        **MINIMAL,
        "entities": [
            {
                "role": "source",
                "what": "DocumentReference/1",
                "entity_agents": [
                    {"who": "Device/1"},
                    {"who": "Organization/190001"},
                ],
            }
        ],
    }
    data = await _create(client, payload)
    entities = data.get("entities", [])
    assert len(entities[0].get("entity_agents", [])) == 2


async def test_entity_fhir_agent(client):
    payload = {
        **MINIMAL,
        "entities": [
            {
                "role": "derivation",
                "what": "Observation/160001",
                "entity_agents": [{"who": "Patient/10001"}],
            }
        ],
    }
    resp = await client.post(BASE + "/", json=payload, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    entity = data["entity"][0]
    assert entity["role"] == "derivation"
    assert entity["what"]["reference"] == "Observation/160001"
    assert entity["agent"][0]["who"]["reference"] == "Patient/10001"


# ── Signature with types ───────────────────────────────────────────────────────


async def test_signature_with_multiple_types(client):
    payload = {
        **MINIMAL,
        "signatures": [
            {
                "when": "2024-01-15T10:30:00Z",
                "signature_types": [
                    {"code": "type-1"},
                    {"code": "type-2"},
                ],
            }
        ],
    }
    data = await _create(client, payload)
    sigs = data.get("signatures", [])
    assert len(sigs[0].get("signature_types", [])) == 2


async def test_signature_fhir(client):
    payload = {
        **MINIMAL,
        "signatures": [
            {
                "when": "2024-01-15T10:30:00Z",
                "who": "Practitioner/30001",
                "signature_types": [
                    {
                        "system": "urn:iso-astm:E1762-95:2013",
                        "code": "1.2.840.10065.1.12.1.1",
                    }
                ],
            }
        ],
    }
    resp = await client.post(BASE + "/", json=payload, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    sig = data["signature"][0]
    assert sig["who"]["reference"] == "Practitioner/30001"
    assert sig["type"][0]["code"] == "1.2.840.10065.1.12.1.1"


# ── All entity roles ───────────────────────────────────────────────────────────


@pytest.mark.parametrize("role", ["derivation", "revision", "quotation", "source", "removal"])
async def test_entity_all_roles(client, role):
    payload = {
        **MINIMAL,
        "entities": [{"role": role, "what": "DocumentReference/1"}],
    }
    data = await _create(client, payload)
    assert data["entities"][0]["role"] == role


# ── All agent who types ────────────────────────────────────────────────────────


@pytest.mark.parametrize("who_ref", [
    "Practitioner/30001",
    "PractitionerRole/140001",
    "RelatedPerson/1",
    "Patient/10001",
    "Device/1",
    "Organization/190001",
])
async def test_agent_all_who_types(client, who_ref):
    payload = {**MINIMAL, "agents": [{"who": who_ref}]}
    data = await _create(client, payload)
    ref_type, ref_id = who_ref.split("/")
    assert data["agents"][0]["who_type"] == ref_type
    assert data["agents"][0]["who_id"] == int(ref_id)
