#!/bin/sh
# Seeds all terminology data into the FHIR server database.
# Run once after first deploy, or after a db-reset.
# All steps are idempotent — safe to re-run.
# Expects terminology_data/ to be mounted at /terminology_data inside the container.
set -e

DATA=/terminology_data

echo "=== Terminology seeding started ==="

echo "[1/8] FHIR R4 — v3-codesystems..."
python -m app.terminology.import_.cli --source fhir-r4 --file "$DATA/v3-codesystems.json"

echo "[2/8] FHIR R4 — v2-tables..."
python -m app.terminology.import_.cli --source fhir-r4 --file "$DATA/v2-tables.json"

echo "[3/8] FHIR R4 — valuesets..."
python -m app.terminology.import_.cli --source fhir-r4 --file "$DATA/valuesets.json"

echo "[4/8] ICD-10-CM..."
python -m app.terminology.import_.cli --source icd10cm --file "$DATA/icd10cm_codes_2026.txt"

echo "[5/8] RxNorm..."
python -m app.terminology.import_.cli --source rxnorm --file "$DATA/rrf/RXNCONSO.RRF"

echo "[6/8] LOINC..."
python -m app.terminology.import_.cli --source loinc --file "$DATA/LoincTableCore.csv"

echo "[7/8] SNOMED CT..."
python -m app.terminology.import_.cli --source snomed --dir "$DATA/SnomedCT_USEdition/Snapshot/Terminology"

echo "[8/8] FHIR R4 field bindings..."
python -m app.terminology.seed_field_bindings_r4 "$DATA/profiles-resources.json" "$DATA/profiles-types.json"

echo "=== Terminology seeding complete ==="
