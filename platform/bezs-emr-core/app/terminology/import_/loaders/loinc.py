"""LOINC CSV loader.

Download (free registration required):
  https://loinc.org/downloads/  ->  "LOINC Table Core (CSV)"

The download is a ZIP. Extract to get Loinc_2.XX.csv (or similar).

Run:
  just terminology-loinc
  # or
  uv run python -m app.terminology.import_.cli --source loinc --file terminology_data/LoincTableCore.csv

Key columns used:
  LOINC_NUM          -> code
  LONG_COMMON_NAME   -> display  (fallback: COMPONENT)
  DEFINITION_DESCRIPTION -> definition
  STATUS             -> ACTIVE / DEPRECATED / DISCOURAGED / TRIAL
  CLASS              -> stored as synonym for search
"""
import csv
import time

from app.terminology.import_.base import BaseLoader

LOINC_URL = "http://loinc.org"
ACTIVE_STATUSES = {"ACTIVE", "TRIAL"}


class LoincLoader(BaseLoader):
    source_name = "loinc"

    async def load(self, file_path: str) -> None:
        t0 = time.monotonic()
        self._log(f"Reading {file_path}")

        cs_id = await self.upsert_code_system(
            canonical_url=LOINC_URL,
            name="LOINC",
            title="Logical Observation Identifiers Names and Codes",
            publisher="Regenstrief Institute, Inc.",
        )
        self._log(f"CodeSystem id={cs_id}")

        records: list[tuple] = []
        skipped = 0

        with open(file_path, encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                status = (row.get("STATUS") or "").strip().upper()
                if status not in ACTIVE_STATUSES:
                    skipped += 1
                    continue
                code = (row.get("LOINC_NUM") or "").strip()
                if not code:
                    continue
                display = (
                    row.get("LONG_COMMON_NAME")
                    or row.get("COMPONENT")
                    or code
                ).strip()
                definition = (row.get("DEFINITION_DESCRIPTION") or "").strip() or None
                records.append((cs_id, code, display, definition))

        self._log(f"{len(records):,} active concepts to load ({skipped:,} skipped)")
        await self.bulk_insert_concepts(records, total_hint=len(records))
        self._log(f"Done in {time.monotonic() - t0:.1f}s")
