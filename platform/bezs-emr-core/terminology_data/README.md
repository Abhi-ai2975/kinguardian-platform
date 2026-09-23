# Terminology Data

This folder holds large medical terminology files that are **not committed to git**.
Download each file manually using the instructions below, then run the loaders.

---

## Files expected in this folder

```
terminology_data/
  valuesets.json              ← FHIR R4 built-in ValueSets
  v3-codesystems.json         ← FHIR R4 v3 code systems
  v2-tables.json              ← HL7 v2 code tables (424 code systems, ~6k concepts)
  icd10cm_codes_2026.txt      ← ICD-10-CM diagnosis codes
  LoincTableCore.csv          ← LOINC lab & clinical codes
  rrf/
    RXNCONSO.RRF              ← RxNorm drug concepts
  SnomedCT_USEdition/
    Snapshot/
      Terminology/            ← SNOMED CT concepts + hierarchy
```

---

## Download Instructions

### 1. FHIR R4 Built-in Code Systems
Already loaded. Re-run anytime to pick up HL7 spec updates.

```powershell
curl -L https://hl7.org/fhir/R4/definitions.json.zip -o fhir-r4.zip
# Extract valuesets.json, v3-codesystems.json, and v2-tables.json into this folder
```

### 2. ICD-10-CM — ~72k diagnosis codes
Free, no account required.

1. Go to https://www.cms.gov/medicare/coding-billing/icd-10-codes
2. Download **"FY2026 Code Descriptions in Tabular Order"** ZIP
3. Extract `icd10cm_codes_2026.txt` into this folder

### 3. LOINC — ~100k lab & clinical codes
Free, requires registration at loinc.org.

1. Go to https://loinc.org/downloads/
2. Create a free account and log in
3. Download **"LOINC Table Core (CSV)"**
4. Extract `LoincTableCore.csv` into this folder

### 4. RxNorm — ~100k drug concepts
Free, requires a UMLS account (NLM — free to register, approved within 3 business days).

1. Register at https://uts.nlm.nih.gov/uts/signup-login
2. After approval, go to https://www.nlm.nih.gov/research/umls/rxnorm/docs/rxnormfiles.html
3. Download **"RxNorm Full Monthly Release"** ZIP
4. Extract the `rrf/` folder into this folder (you only need `rrf/RXNCONSO.RRF`)

### 5. SNOMED CT — ~350k clinical concepts + IS-A hierarchy
Free for US users via NLM UMLS account (same account as RxNorm).

1. After UMLS approval, go to https://www.nlm.nih.gov/healthit/snomedct/us_edition.html
2. Download the **US Edition RF2** ZIP
3. Extract the `SnomedCT_*/` folder into this folder
4. The loader expects: `SnomedCT_USEdition/Snapshot/Terminology/`

---

## Running the Loaders

All loaders are idempotent — safe to re-run at any time.

### Using `just` (recommended)

```powershell
# Run a single loader
just terminology-fhir-r4
just terminology-icd10cm
just terminology-loinc
just terminology-rxnorm
just terminology-snomed

# Run all loaders in order
just terminology-all
```

### Using the PowerShell script

```powershell
.\scripts\load_terminology.ps1
```

### Using the CLI directly

```powershell
uv run python -m app.terminology.import_.cli --source fhir-r4  --file terminology_data/valuesets.json
uv run python -m app.terminology.import_.cli --source fhir-r4  --file terminology_data/v3-codesystems.json
uv run python -m app.terminology.import_.cli --source icd10cm  --file terminology_data/icd10cm_codes_2026.txt
uv run python -m app.terminology.import_.cli --source loinc    --file terminology_data/LoincTableCore.csv
uv run python -m app.terminology.import_.cli --source rxnorm   --file terminology_data/rrf/RXNCONSO.RRF
uv run python -m app.terminology.import_.cli --source snomed   --dir  terminology_data/SnomedCT_USEdition/Snapshot/Terminology
```

---

## Verify loaded counts

```sql
SELECT cs.name, COUNT(tc.id) AS concepts
FROM terminology_code_system cs
JOIN terminology_concept tc ON tc.code_system_id = cs.id
GROUP BY cs.name
ORDER BY concepts DESC;
```

Expected after full load:

| Code System | Concepts  |
|-------------|-----------|
| SNOMED CT   | ~350,000  |
| LOINC       | ~100,000  |
| RxNorm      | ~100,000  |
| ICD-10-CM   | ~72,000   |
| FHIR R4     | ~14,000   |
