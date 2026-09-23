"""RxNorm loader — free from NLM, no account required.

Download:
  https://www.nlm.nih.gov/research/umls/rxnorm/docs/rxnormfiles.html
  -> "RxNorm Full Monthly Release" ZIP
  Extract: rrf/RXNCONSO.RRF

Format: pipe-delimited (|) — key columns:
  0   RXCUI   — RxNorm concept unique identifier (the code)
  1   LAT     — language (filter ENG)
  12  TTY     — term type (see INCLUDED_TTY below)
  14  STR     — string (the drug name)

TTY types included:
  IN    Ingredient (generic)
  PIN   Precise Ingredient
  MIN   Multiple Ingredients
  BN    Brand Name
  SCD   Semantic Clinical Drug  (e.g. "Metformin 500 MG Oral Tablet")
  SBD   Semantic Branded Drug
  GPCK  Generic Pack
  BPCK  Branded Pack

One display name per RXCUI is picked (first IN/BN/SCD encountered wins).

Run:
  just terminology-rxnorm
  # or
  uv run python -m app.terminology.import_.cli --source rxnorm --file terminology_data/rrf/RXNCONSO.RRF
"""
import time

from app.terminology.import_.base import BaseLoader

RXNORM_URL = "http://www.nlm.nih.gov/research/umls/rxnorm"

INCLUDED_TTY = {"IN", "PIN", "MIN", "BN", "SCD", "SBD", "GPCK", "BPCK"}
TTY_PRIORITY = {"IN": 0, "SCD": 1, "BN": 2, "PIN": 3, "MIN": 4, "SBD": 5, "GPCK": 6, "BPCK": 7}


class RxnormLoader(BaseLoader):
    source_name = "rxnorm"

    async def load(self, file_path: str) -> None:
        t0 = time.monotonic()
        self._log(f"Reading {file_path}")

        cs_id = await self.upsert_code_system(
            canonical_url=RXNORM_URL,
            name="RxNorm",
            title="RxNorm Drug Codes",
            publisher="National Library of Medicine",
            content_mode="complete",
        )
        self._log(f"CodeSystem id={cs_id}")

        best: dict[str, tuple[str, int]] = {}

        line_count = 0
        with open(file_path, encoding="utf-8") as f:
            for line in f:
                line_count += 1
                parts = line.split("|")
                if len(parts) < 15:
                    continue
                rxcui = parts[0].strip()
                lat = parts[1].strip()
                tty = parts[12].strip()
                name = parts[14].strip()

                if lat != "ENG" or tty not in INCLUDED_TTY or not rxcui or not name:
                    continue

                priority = TTY_PRIORITY.get(tty, 99)
                existing = best.get(rxcui)
                if existing is None or priority < existing[1]:
                    best[rxcui] = (name, priority)

        self._log(f"Scanned {line_count:,} lines → {len(best):,} unique RxCUI concepts")

        records = [
            (cs_id, rxcui, display, None)
            for rxcui, (display, _) in best.items()
        ]

        await self.bulk_insert_concepts(records, total_hint=len(records))
        self._log(f"Done in {time.monotonic() - t0:.1f}s")
