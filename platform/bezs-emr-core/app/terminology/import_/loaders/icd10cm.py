"""ICD-10-CM loader — free from CMS/CDC, no account required.

Download:
  https://www.cms.gov/medicare/coding-billing/icd-10-codes
  -> "FY2025 Code Descriptions in Tabular Order" ZIP
  Extract: icd10cm_codes_2025.txt  (or similar name)

Format: tab-delimited, two columns: CODE <TAB> DESCRIPTION
Some older releases use fixed-width (first 7 chars = code, rest = description).
This loader detects the format automatically.

Run:
  just terminology-icd10cm
  # or
  uv run python -m app.terminology.import_.cli --source icd10cm --file terminology_data/icd10cm_codes_2026.txt
"""
import time

from app.terminology.import_.base import BaseLoader

ICD10CM_URL = "http://hl7.org/fhir/sid/icd-10-cm"


class Icd10cmLoader(BaseLoader):
    source_name = "icd10cm"

    async def load(self, file_path: str) -> None:
        t0 = time.monotonic()
        self._log(f"Reading {file_path}")

        cs_id = await self.upsert_code_system(
            canonical_url=ICD10CM_URL,
            name="ICD-10-CM",
            title="International Classification of Diseases, 10th Revision, Clinical Modification",
            publisher="Centers for Medicare & Medicaid Services",
            content_mode="complete",
        )
        self._log(f"CodeSystem id={cs_id}")

        records: list[tuple] = []
        use_tab = None

        with open(file_path, encoding="utf-8-sig") as f:
            for line in f:
                line = line.rstrip("\n\r")
                if not line.strip():
                    continue

                if use_tab is None:
                    use_tab = "\t" in line

                if use_tab:
                    parts = line.split("\t", 1)
                    if len(parts) < 2:
                        continue
                    code, display = parts[0].strip(), parts[1].strip()
                else:
                    code = line[:7].strip()
                    display = line[7:].strip()

                if code and display:
                    records.append((cs_id, code, display, None))

        self._log(f"{len(records):,} codes to load")
        await self.bulk_insert_concepts(records, total_hint=len(records))
        self._log(f"Done in {time.monotonic() - t0:.1f}s")
