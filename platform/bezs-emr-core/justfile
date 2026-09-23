dev:
    uv run uvicorn app.main:app --port 8001 --reload

# ── Tests ─────────────────────────────────────────────────────────────────────

# Run all tests
test:
    uv run pytest tests/ -v

# Run all tests with quiet output
test-q:
    uv run pytest tests/ -q

# Run tests with verbose output
test-v:
    uv run pytest tests/ -v

# Run a specific test file or test by keyword
# Usage: just test-k patient
test-k K:
    uv run pytest tests/ -k "{{K}}" -v

start:
    uv run uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 2

# ── Terminology ───────────────────────────────────────────────────────────────

# ICD-10-CM — free, no account, ~72k codes, ~2 min
# Download: https://www.cms.gov/medicare/coding-billing/icd-10-codes
#   -> "FY2025 Code Descriptions in Tabular Order" ZIP -> extract icd10cm_codes_2025.txt
terminology-icd10cm FILE="terminology_data/icd10cm_codes_2026.txt":
    uv run python -m app.terminology.import_.cli --source icd10cm --file {{FILE}}

# RxNorm — free, no account, ~100k drugs, ~3 min
# Download: https://www.nlm.nih.gov/research/umls/rxnorm/docs/rxnormfiles.html
# You can download the RxNorm data here: https://uts.nlm.nih.gov/uts/login
#   -> "RxNorm Full Monthly Release" ZIP -> extract rrf/ folder
terminology-rxnorm FILE="terminology_data/rrf/RXNCONSO.RRF":
    uv run python -m app.terminology.import_.cli --source rxnorm --file {{FILE}}

# LOINC — free registration at loinc.org, ~100k codes, ~3 min
# Download: https://loinc.org/downloads/ -> "LOINC Table Core (CSV)"
terminology-loinc FILE="terminology_data/LoincTableCore.csv":
    uv run python -m app.terminology.import_.cli --source loinc --file {{FILE}}

# SNOMED CT — free UMLS account required, ~350k concepts + IS-A hierarchy, ~15 min
# Download: https://www.nlm.nih.gov/healthit/snomedct/us_edition.html
#   -> Register for UMLS -> download US Edition RF2 ZIP -> extract SnomedCT_*/ folder
terminology-snomed DIR="terminology_data/SnomedCT_USEdition/Snapshot/Terminology":
    uv run python -m app.terminology.import_.cli --source snomed --dir {{DIR}}

# FHIR R4 built-in code systems (already loaded — re-run to pick up HL7 spec updates)
# Download: curl -L https://hl7.org/fhir/R4/definitions.json.zip -o fhir-r4.zip
#   unzip fhir-r4.zip valuesets.json v3-codesystems.json v2-tables.json
# Load order matters:
#   1. v3-codesystems — loads http://terminology.hl7.org/ CodeSystems
#   2. v2-tables      — loads HL7 v2 CodeSystems (e.g. v2-0131 for patient-contactrelationship)
#   3. valuesets      — references both v3 and v2 systems in compose.include
terminology-fhir-r4:
    uv run python -m app.terminology.import_.cli --source fhir-r4 --file terminology_data/v3-codesystems.json
    uv run python -m app.terminology.import_.cli --source fhir-r4 --file terminology_data/v2-tables.json
    uv run python -m app.terminology.import_.cli --source fhir-r4 --file terminology_data/valuesets.json

# Seed FHIR R4 field bindings — maps resource.field → ValueSet (run after terminology-fhir-r4)
terminology-seed-bindings:
    uv run python -m app.terminology.seed_field_bindings

# Auto-seed ALL FHIR R4 field bindings from HL7 StructureDefinitions (preferred over manual seed)
# Requires: terminology_data/profiles-resources.json + terminology_data/profiles-types.json
terminology-seed-bindings-r4:
    uv run python -m app.terminology.seed_field_bindings_r4

# Load all terminologies in order (each is idempotent — safe to re-run)
terminology-all: terminology-fhir-r4 terminology-icd10cm terminology-rxnorm terminology-loinc terminology-snomed terminology-seed-bindings-r4

# ── VPS / Production ──────────────────────────────────────────────────────────

IMAGE := "ghcr.io/naveenraj-g/fhir-server-v1"
TAG   := "latest"

# Authenticate with ghcr.io (run once per machine — requires GITHUB_TOKEN env var)
# export GITHUB_TOKEN=<your PAT with write:packages scope>
vps-login:
    echo $GITHUB_TOKEN | docker login ghcr.io -u naveenraj-g --password-stdin

# Build the production image locally
vps-build:
    docker build -t {{IMAGE}}:{{TAG}} .

# Push the locally-built image to ghcr.io
vps-push:
    docker push {{IMAGE}}:{{TAG}}

# Build + push in one step
vps-release: vps-build vps-push

# Pull latest image and start the stack (app + postgres + redis)
vps-up:
    docker compose -f docker-compose.prod.yml pull
    docker compose -f docker-compose.prod.yml up -d

# Restart the app container only (after a new image push)
vps-redeploy:
    docker compose -f docker-compose.prod.yml pull api
    docker compose -f docker-compose.prod.yml up -d --no-deps api

# Stop the VPS stack
vps-down:
    docker compose -f docker-compose.prod.yml down

# Stream logs from all VPS services
vps-logs:
    docker compose -f docker-compose.prod.yml logs -f

# Stream logs from the app only
vps-logs-app:
    docker compose -f docker-compose.prod.yml logs -f api

# Seed all terminology data into the VPS database (one-shot, idempotent)
# Requires: ./terminology_data/ populated with source files on the VPS host
vps-seed:
    docker compose -f docker-compose.prod.yml run --rm fhir-seeder

# ── Migrations ────────────────────────────────────────────────────────────────

# Apply all pending migrations
migrate:
    uv run alembic upgrade head

# Roll back the most recent migration
migrate-down:
    uv run alembic downgrade -1

# Show current migration state
migrate-status:
    uv run alembic current

# Show pending migrations
migrate-history:
    uv run alembic history --verbose

# Generate a new autogenerated migration (requires DB to be running)
# Usage: just migrate-generate "add_observation_table"
migrate-generate NAME:
    uv run alembic revision --autogenerate -m "{{NAME}}"

# Mark an existing DB as up-to-date without running migrations (use after first deploy)
migrate-stamp:
    uv run alembic stamp head
