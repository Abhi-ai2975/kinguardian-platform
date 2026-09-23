"""Auto-seed FHIR R4 field bindings from HL7 StructureDefinition files.

Two-pass approach:
  Pass 1 â€” profiles-types.json: extract bindings from datatype SDs
            (Address.use, ContactPoint.system, HumanName.use, Identifier.use, ...)
  Pass 2 â€” profiles-resources.json: extract direct element bindings, then
            expand each element's FHIR type to inherit sub-field bindings from pass 1
            -> produces Patient.address.use, Patient.telecom.system, etc.

Idempotent â€” safe to re-run.

Run:
  uv run python -m app.terminology.seed_field_bindings_r4
  # or
  just terminology-seed-bindings-r4
"""
import asyncio
import json
import os
import sys
import time

import asyncpg

_SKIP_RESOURCE_TYPES = {
    "Resource", "DomainResource", "Element", "BackboneElement",
    "Parameters", "OperationOutcome", "Bundle", "Binary",
    "CapabilityStatement", "StructureDefinition", "ImplementationGuide",
    "SearchParameter", "MessageDefinition", "OperationDefinition",
    "CompartmentDefinition", "StructureMap", "GraphDefinition", "ExampleScenario",
}

_PRIMITIVE_TYPES = {
    "boolean", "integer", "string", "decimal", "uri", "url", "canonical",
    "base64Binary", "instant", "date", "dateTime", "time", "code", "oid",
    "id", "markdown", "unsignedInt", "positiveInt", "uuid", "xhtml",
}


def _strip_version(url: str) -> str:
    return url.split("|")[0]


def _max_to_multiple(max_val: str) -> bool:
    return max_val == "*" or (max_val.lstrip("-").isdigit() and int(max_val) > 1)


def build_type_bindings(types_bundle: dict) -> dict[str, list[tuple]]:
    """Returns {type_name: [(sub_field, vs_url, strength, multiple_allowed), ...]}"""
    result: dict[str, list[tuple]] = {}

    for entry in types_bundle.get("entry", []):
        sd = entry.get("resource", {})
        if sd.get("resourceType") != "StructureDefinition":
            continue
        if sd.get("kind") not in ("complex-type",):
            continue
        if sd.get("derivation") != "specialization":
            continue

        type_name: str = sd.get("type") or sd.get("id") or ""
        if not type_name:
            continue

        prefix = type_name + "."
        bindings: list[tuple] = []

        for elem in sd.get("snapshot", {}).get("element", []):
            path: str = elem.get("path", "")
            if not path.startswith(prefix):
                continue

            binding = elem.get("binding")
            if not binding:
                continue

            vs_url: str = binding.get("valueSet") or ""
            if not vs_url:
                continue

            sub_field = path[len(prefix):]
            if not sub_field:
                continue

            bindings.append((
                sub_field,
                _strip_version(vs_url),
                binding.get("strength", "example"),
                _max_to_multiple(elem.get("max", "1")),
            ))

        if bindings:
            result[type_name] = bindings

    return result


def extract_bindings(
    resources_bundle: dict,
    type_bindings: dict[str, list[tuple]],
) -> list[tuple[str, str, str, str, bool]]:
    """Returns (resource_type, field_name, vs_url, binding_strength, multiple_allowed)."""
    results: list[tuple[str, str, str, str, bool]] = []

    for entry in resources_bundle.get("entry", []):
        sd = entry.get("resource", {})
        if sd.get("resourceType") != "StructureDefinition":
            continue
        if sd.get("kind") != "resource":
            continue
        if sd.get("derivation") != "specialization":
            continue
        if sd.get("abstract"):
            continue

        resource_type: str = sd.get("type") or sd.get("id") or ""
        if not resource_type or resource_type in _SKIP_RESOURCE_TYPES:
            continue

        prefix = resource_type + "."

        for elem in sd.get("snapshot", {}).get("element", []):
            path: str = elem.get("path", "")
            if not path.startswith(prefix):
                continue

            field_name = path[len(prefix):]
            if not field_name:
                continue

            multiple = _max_to_multiple(elem.get("max", "1"))

            binding = elem.get("binding")
            if binding:
                vs_url = binding.get("valueSet") or ""
                if vs_url:
                    results.append((
                        resource_type,
                        field_name,
                        _strip_version(vs_url),
                        binding.get("strength", "example"),
                        multiple,
                    ))

            for type_def in elem.get("type", []):
                type_code: str = type_def.get("code", "")
                if not type_code or type_code in _PRIMITIVE_TYPES:
                    continue
                for sub_field, vs_url, strength, sub_multiple in type_bindings.get(type_code, []):
                    results.append((
                        resource_type,
                        f"{field_name}.{sub_field}",
                        vs_url,
                        strength,
                        sub_multiple,
                    ))

    return results


async def seed(db_url: str, resources_path: str, types_path: str) -> None:
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

    print(f"[SEED-R4] Reading types:     {types_path}")
    with open(types_path, encoding="utf-8") as f:
        types_bundle = json.load(f)
    type_bindings = build_type_bindings(types_bundle)
    print(f"[SEED-R4] Type bindings loaded for: {sorted(type_bindings)}")

    print(f"[SEED-R4] Reading resources: {resources_path}")
    with open(resources_path, encoding="utf-8") as f:
        resources_bundle = json.load(f)
    bindings = extract_bindings(resources_bundle, type_bindings)

    seen: dict[tuple[str, str], tuple] = {}
    for r, f, v, s, m in bindings:
        seen[(r, f)] = (r, f, v, s, m)
    unique = list(seen.values())

    print(f"[SEED-R4] {len(bindings)} total â†’ {len(unique)} unique (resource, field) pairs")

    conn = await asyncpg.connect(db_url)
    t0 = time.monotonic()

    try:
        inserted = 0
        skipped = 0

        for resource_type, field_name, vs_url, strength, multiple_allowed in unique:
            vs_id = await conn.fetchval(
                "SELECT id FROM terminology_value_set WHERE canonical_url = $1", vs_url
            )
            if vs_id is None:
                skipped += 1
                continue

            await conn.execute(
                """
                INSERT INTO terminology_field_binding
                    (resource_type, field_name, value_set_id, binding_strength, multiple_allowed)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (resource_type, field_name) DO UPDATE SET
                    value_set_id     = EXCLUDED.value_set_id,
                    binding_strength = EXCLUDED.binding_strength,
                    multiple_allowed = EXCLUDED.multiple_allowed,
                    active           = TRUE
                """,
                resource_type, field_name, vs_id, strength, multiple_allowed,
            )
            inserted += 1

        print(
            f"[SEED-R4] Done â€” {inserted} upserted, "
            f"{skipped} skipped (ValueSet not in DB)"
        )
        print(f"[SEED-R4] Elapsed: {time.monotonic() - t0:.1f}s")
    finally:
        await conn.close()


_DEFAULT_RESOURCES = "terminology_data/profiles-resources.json"
_DEFAULT_TYPES = "terminology_data/profiles-types.json"


def main() -> None:
    from app.core.config import settings

    resources_path = sys.argv[1] if len(sys.argv) > 1 else _DEFAULT_RESOURCES
    types_path = sys.argv[2] if len(sys.argv) > 2 else _DEFAULT_TYPES

    for label, path in (("resources", resources_path), ("types", types_path)):
        if not os.path.exists(path):
            print(f"[SEED-R4] ERROR: {label} file not found: {path!r}")
            sys.exit(1)

    asyncio.run(seed(settings.FHIR_DATABASE_URL, resources_path, types_path))


if __name__ == "__main__":
    main()
