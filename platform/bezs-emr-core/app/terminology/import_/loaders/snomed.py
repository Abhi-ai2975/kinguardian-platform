"""SNOMED CT RF2 loader.

Requires a UMLS account (free for US users):
  https://www.nlm.nih.gov/healthit/snomedct/us_edition.html

Download the RF2 "Snapshot" release ZIP and extract it.
Point --dir at the Terminology/ folder inside the Snapshot.

Expected files (filenames contain dates — matched via glob):
  sct2_Concept_Snapshot_*.txt        — active concept IDs
  sct2_Description_Snapshot-en_*.txt — FSN + synonyms
  sct2_Relationship_Snapshot_*.txt   — IS-A hierarchy

Run:
  just terminology-snomed
  # or
  uv run python -m app.terminology.import_.cli --source snomed --dir terminology_data/SnomedCT_USEdition/Snapshot/Terminology/
"""
import glob
import os
import time

from app.terminology.import_.base import BaseLoader

SNOMED_URL = "http://snomed.info/sct"

FSN_TYPE_ID = "900000000000003001"
SYNONYM_TYPE_ID = "900000000000013009"
IS_A_TYPE_ID = "116680003"


def _find_file(directory: str, pattern: str) -> str:
    matches = glob.glob(os.path.join(directory, pattern))
    if not matches:
        raise FileNotFoundError(
            f"No file matching {pattern!r} in {directory!r}. "
            "Make sure --dir points to the Terminology/ folder inside the RF2 Snapshot."
        )
    return sorted(matches)[-1]


class SnomedLoader(BaseLoader):
    source_name = "snomed"

    async def load(self, directory: str) -> None:
        t0 = time.monotonic()
        self._log(f"Loading from {directory}")

        concept_file = _find_file(directory, "sct2_Concept_Snapshot_*.txt")
        desc_file = _find_file(directory, "sct2_Description_Snapshot-en_*.txt")
        rel_file = _find_file(directory, "sct2_Relationship_Snapshot_*.txt")

        cs_id = await self.upsert_code_system(
            canonical_url=SNOMED_URL,
            name="SNOMED CT",
            title="Systematized Nomenclature of Medicine -- Clinical Terms",
            publisher="SNOMED International",
            content_mode="complete",
        )
        self._log(f"CodeSystem id={cs_id}")

        self._log("Reading active concept IDs...")
        active_ids: set[str] = set()
        with open(concept_file, encoding="utf-8") as f:
            next(f)
            for line in f:
                parts = line.rstrip("\n").split("\t")
                if len(parts) >= 3 and parts[2] == "1":
                    active_ids.add(parts[0])
        self._log(f"  {len(active_ids):,} active concepts")

        self._log("Reading descriptions...")
        fsn: dict[str, str] = {}
        synonyms: dict[str, list[str]] = {}

        with open(desc_file, encoding="utf-8") as f:
            next(f)
            for line in f:
                parts = line.rstrip("\n").split("\t")
                if len(parts) < 8:
                    continue
                active = parts[2]
                concept_id = parts[4]
                type_id = parts[6]
                term = parts[7].strip()

                if active != "1" or concept_id not in active_ids or not term:
                    continue

                if type_id == FSN_TYPE_ID:
                    display = term
                    if display.endswith(")") and "(" in display:
                        display = display[: display.rfind("(")].strip()
                    fsn[concept_id] = display
                elif type_id == SYNONYM_TYPE_ID:
                    synonyms.setdefault(concept_id, []).append(term)

        self._log(f"  {len(fsn):,} FSN terms, {sum(len(v) for v in synonyms.values()):,} synonyms")

        records = [
            (cs_id, concept_id, fsn[concept_id], None)
            for concept_id in active_ids
            if concept_id in fsn
        ]
        self._log(f"Inserting {len(records):,} concepts...")
        await self.bulk_insert_concepts(records, total_hint=len(records))

        self._log("Loading concept ID → DB id map for synonyms + relationships...")
        code_to_db = await self.fetch_concept_id_map(cs_id)

        self._log("Inserting synonyms...")
        syn_records: list[tuple] = []
        for concept_id, terms in synonyms.items():
            db_id = code_to_db.get(concept_id)
            if db_id is None:
                continue
            for term in terms:
                syn_records.append((db_id, term))
        await self.bulk_insert_synonyms(syn_records)
        self._log(f"  {len(syn_records):,} synonyms inserted")

        self._log("Reading IS-A relationships...")
        rel_records: list[tuple] = []
        with open(rel_file, encoding="utf-8") as f:
            next(f)
            for line in f:
                parts = line.rstrip("\n").split("\t")
                if len(parts) < 8:
                    continue
                active = parts[2]
                source_id = parts[4]
                dest_id = parts[5]
                type_id = parts[7]

                if active != "1" or type_id != IS_A_TYPE_ID:
                    continue

                parent_db = code_to_db.get(dest_id)
                child_db = code_to_db.get(source_id)
                if parent_db and child_db:
                    rel_records.append((parent_db, child_db, "is-a"))

        await self.bulk_insert_relationships(rel_records)
        self._log(f"  {len(rel_records):,} IS-A relationships inserted")
        self._log(f"Done in {time.monotonic() - t0:.1f}s")
