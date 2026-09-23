"""FHIR R4 built-in CodeSystem + ValueSet loader.

Accepts three input forms:
  1. A Bundle JSON file (valuesets.json or v3-codesystems.json from hl7.org/fhir/R4/definitions.json.zip)
  2. A single CodeSystem or ValueSet JSON file
  3. A directory containing CodeSystem-*.json / ValueSet-*.json files (FHIR NPM package)

Download:
  curl -L https://hl7.org/fhir/R4/definitions.json.zip -o fhir-r4.zip
  unzip fhir-r4.zip valuesets.json v3-codesystems.json v2-tables.json

Run:
  uv run python -m app.terminology.import_.cli --source fhir-r4 --file terminology_data/v3-codesystems.json
  uv run python -m app.terminology.import_.cli --source fhir-r4 --file terminology_data/v2-tables.json
  uv run python -m app.terminology.import_.cli --source fhir-r4 --file terminology_data/valuesets.json
"""
import glob
import json
import os
import time
from typing import Any

from app.terminology.import_.base import BaseLoader


class FhirR4Loader(BaseLoader):
    source_name = "fhir-r4"

    async def load(self, path: str) -> None:
        t0 = time.monotonic()
        resources = self._read_input(path)

        code_systems = [r for r in resources if r.get("resourceType") == "CodeSystem"]
        value_sets = [r for r in resources if r.get("resourceType") == "ValueSet"]
        self._log(f"Found {len(code_systems)} CodeSystems + {len(value_sets)} ValueSets")

        total_concepts = 0
        for cs in code_systems:
            count = await self._load_code_system(cs)
            total_concepts += count
        self._log(f"CodeSystems done — {total_concepts:,} total concepts")

        if value_sets:
            self._log("Loading ValueSets...")
            loaded_vs = 0
            skipped_vs = 0
            for vs in value_sets:
                ok = await self._load_value_set(vs)
                if ok:
                    loaded_vs += 1
                else:
                    skipped_vs += 1
            self._log(
                f"ValueSets done — {loaded_vs} loaded, {skipped_vs} skipped "
                "(filter/compose-only sets are skipped)"
            )

        self._log(f"Total time: {time.monotonic() - t0:.1f}s")

    def _read_input(self, path: str) -> list[dict]:
        if os.path.isdir(path):
            return self._read_directory(path)
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        if data.get("resourceType") == "Bundle":
            return [e["resource"] for e in data.get("entry", []) if "resource" in e]
        if data.get("resourceType") in ("CodeSystem", "ValueSet"):
            return [data]
        raise ValueError(f"Unrecognised FHIR input at {path!r}")

    def _read_directory(self, directory: str) -> list[dict]:
        result = []
        for pattern in ("CodeSystem-*.json", "ValueSet-*.json"):
            for filepath in glob.glob(os.path.join(directory, pattern)):
                with open(filepath, encoding="utf-8") as f:
                    try:
                        data = json.load(f)
                        if data.get("resourceType") in ("CodeSystem", "ValueSet"):
                            result.append(data)
                    except json.JSONDecodeError:
                        pass
        return result

    async def _load_code_system(self, cs: dict[str, Any]) -> int:
        url = cs.get("url") or cs.get("id")
        if not url:
            return 0
        name = cs.get("name") or url.split("/")[-1]

        cs_id = await self.upsert_code_system(
            canonical_url=url,
            name=name,
            title=cs.get("title"),
            version=cs.get("version"),
            publisher=cs.get("publisher"),
            content_mode=cs.get("content"),
        )

        concepts: list[dict] = cs.get("concept", [])
        if not concepts:
            return 0

        records: list[tuple] = []
        parent_links: list[tuple[str, str]] = []
        self._flatten_concepts(concepts, cs_id, records, parent_links)
        await self.bulk_insert_concepts(records)
        if parent_links:
            await self._set_parent_concept_ids(cs_id, parent_links)
        return len(records)

    def _flatten_concepts(
        self,
        concepts: list[dict],
        cs_id: int,
        out: list,
        parent_links: list,
        parent_code: str | None = None,
    ) -> None:
        for c in concepts:
            code = (c.get("code") or "").strip()
            display = (c.get("display") or code).strip()
            definition = (c.get("definition") or "").strip() or None
            if code:
                out.append((cs_id, code, display, definition))
                if parent_code:
                    parent_links.append((code, parent_code))
            for child in c.get("concept", []):
                self._flatten_concepts([child], cs_id, out, parent_links, parent_code=code or parent_code)

    async def _set_parent_concept_ids(
        self, cs_id: int, parent_links: list[tuple[str, str]]
    ) -> None:
        child_codes = [link[0] for link in parent_links]
        parent_codes = [link[1] for link in parent_links]
        await self.conn.execute(
            """
            UPDATE terminology_concept child
            SET parent_concept_id = parent.id
            FROM (
                SELECT unnest($1::text[]) AS child_code,
                       unnest($2::text[]) AS parent_code
            ) lnk
            JOIN terminology_concept parent
              ON parent.code_system_id = $3
             AND parent.code = lnk.parent_code
             AND parent.org_id IS NULL
            WHERE child.code_system_id = $3
              AND child.code = lnk.child_code
              AND child.org_id IS NULL
            """,
            child_codes, parent_codes, cs_id,
        )

    async def _load_value_set(self, vs: dict[str, Any]) -> bool:
        url = vs.get("url") or vs.get("id")
        if not url:
            return False

        name = vs.get("name") or url.split("/")[-1]
        binding_strength = "required" if vs.get("immutable") else "extensible"

        vs_id: int = await self.conn.fetchval(
            """
            INSERT INTO terminology_value_set
                (canonical_url, name, title, description, version, fhir_version, binding_strength)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (canonical_url) DO UPDATE SET
                name           = EXCLUDED.name,
                title          = COALESCE(EXCLUDED.title, terminology_value_set.title),
                updated_at     = NOW()
            RETURNING id
            """,
            url, name, vs.get("title"), vs.get("description"),
            vs.get("version"), "4.0.1", binding_strength,
        )

        compose = vs.get("compose") or {}
        includes = compose.get("include", [])

        concept_db_ids: list[int] = []
        for inc in includes:
            system_url = inc.get("system")
            codes = inc.get("concept", [])
            filters = inc.get("filter", [])

            if not system_url:
                continue
            if filters:
                for f in filters:
                    op = f.get("op")
                    value = f.get("value", "")
                    if op == "is-a":
                        rows = await self.conn.fetch(
                            """
                            WITH RECURSIVE subtree AS (
                                SELECT tc.id
                                FROM terminology_concept tc
                                JOIN terminology_code_system cs ON cs.id = tc.code_system_id
                                WHERE cs.canonical_url = $1
                                  AND tc.code = $2
                                  AND tc.org_id IS NULL
                                UNION ALL
                                SELECT child.id
                                FROM terminology_concept child
                                JOIN subtree s ON child.parent_concept_id = s.id
                                WHERE child.org_id IS NULL
                            )
                            SELECT id FROM subtree
                            """,
                            system_url, value,
                        )
                        concept_db_ids.extend(r["id"] for r in rows)
                    elif op == "is-not-a":
                        rows = await self.conn.fetch(
                            """
                            SELECT tc.id FROM terminology_concept tc
                            JOIN terminology_code_system cs ON cs.id = tc.code_system_id
                            WHERE cs.canonical_url = $1 AND tc.org_id IS NULL
                            """,
                            system_url,
                        )
                        concept_db_ids.extend(r["id"] for r in rows)
                continue

            if codes:
                cs_id = await self.conn.fetchval(
                    "SELECT id FROM terminology_code_system WHERE canonical_url = $1",
                    system_url,
                )
                if cs_id is None:
                    cs_id = await self.upsert_code_system(
                        canonical_url=system_url,
                        name=system_url.split("/")[-1].split(":")[-1],
                    )
                    records = [
                        (cs_id, c["code"], c.get("display") or c["code"], None)
                        for c in codes if c.get("code")
                    ]
                    await self.bulk_insert_concepts(records)

                rows = await self.conn.fetch(
                    """
                    SELECT tc.id FROM terminology_concept tc
                    WHERE tc.code_system_id = $1 AND tc.code = ANY($2::text[])
                      AND tc.org_id IS NULL
                    """,
                    cs_id, [c["code"] for c in codes],
                )
            else:
                rows = await self.conn.fetch(
                    """
                    SELECT tc.id FROM terminology_concept tc
                    JOIN terminology_code_system cs ON cs.id = tc.code_system_id
                    WHERE cs.canonical_url = $1 AND tc.org_id IS NULL
                    """,
                    system_url,
                )
            concept_db_ids.extend(r["id"] for r in rows)

        if not concept_db_ids:
            return False

        await self.conn.execute(
            """
            INSERT INTO terminology_value_set_concept (value_set_id, concept_id)
            SELECT $1, unnest($2::bigint[])
            ON CONFLICT DO NOTHING
            """,
            vs_id, concept_db_ids,
        )
        return True
