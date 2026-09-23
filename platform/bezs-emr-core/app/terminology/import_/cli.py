"""Terminology import CLI.

Usage examples:
  uv run python -m app.terminology.import_.cli --source fhir-r4 --file terminology_data/valuesets.json
  uv run python -m app.terminology.import_.cli --source icd10cm --file terminology_data/icd10cm_codes_2026.txt
  uv run python -m app.terminology.import_.cli --source rxnorm --file terminology_data/rrf/RXNCONSO.RRF
  uv run python -m app.terminology.import_.cli --source loinc --file terminology_data/LoincTableCore.csv
  uv run python -m app.terminology.import_.cli --source snomed --dir terminology_data/SnomedCT_USEdition/Snapshot/Terminology/
"""
import argparse
import asyncio
import sys
import time


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Terminology Import CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument(
        "--source",
        required=True,
        choices=["fhir-r4", "loinc", "icd10cm", "rxnorm", "snomed", "all"],
        help="Which terminology to import",
    )
    p.add_argument("--file", help="Input file path (fhir-r4 / loinc / icd10cm / rxnorm)")
    p.add_argument("--dir", help="Input directory path (snomed RF2 Terminology/)")

    # --all mode individual paths
    p.add_argument("--fhir-r4-file", help="codesystems.json  [for --source all]")
    p.add_argument("--icd10cm-file", help="icd10cm_codes.txt [for --source all]")
    p.add_argument("--rxnorm-file", help="RXNCONSO.RRF       [for --source all]")
    p.add_argument("--loinc-file", help="Loinc_x.xx.csv     [for --source all]")
    p.add_argument("--snomed-dir", help="RF2 Terminology/   [for --source all]")
    return p


async def run(args: argparse.Namespace) -> None:
    from app.core.config import settings

    db_url = settings.FHIR_DATABASE_URL
    source = args.source

    tasks: list[tuple] = []  # (loader_class, path_or_dir)

    if source == "fhir-r4":
        _require(args.file, "--file", source)
        from app.terminology.import_.loaders.fhir_r4 import FhirR4Loader
        tasks.append((FhirR4Loader, args.file))

    elif source == "loinc":
        _require(args.file, "--file", source)
        from app.terminology.import_.loaders.loinc import LoincLoader
        tasks.append((LoincLoader, args.file))

    elif source == "icd10cm":
        _require(args.file, "--file", source)
        from app.terminology.import_.loaders.icd10cm import Icd10cmLoader
        tasks.append((Icd10cmLoader, args.file))

    elif source == "rxnorm":
        _require(args.file, "--file", source)
        from app.terminology.import_.loaders.rxnorm import RxnormLoader
        tasks.append((RxnormLoader, args.file))

    elif source == "snomed":
        _require(args.dir, "--dir", source)
        from app.terminology.import_.loaders.snomed import SnomedLoader
        tasks.append((SnomedLoader, args.dir))

    elif source == "all":
        if args.fhir_r4_file:
            from app.terminology.import_.loaders.fhir_r4 import FhirR4Loader
            tasks.append((FhirR4Loader, args.fhir_r4_file))
        if args.icd10cm_file:
            from app.terminology.import_.loaders.icd10cm import Icd10cmLoader
            tasks.append((Icd10cmLoader, args.icd10cm_file))
        if args.rxnorm_file:
            from app.terminology.import_.loaders.rxnorm import RxnormLoader
            tasks.append((RxnormLoader, args.rxnorm_file))
        if args.loinc_file:
            from app.terminology.import_.loaders.loinc import LoincLoader
            tasks.append((LoincLoader, args.loinc_file))
        if args.snomed_dir:
            from app.terminology.import_.loaders.snomed import SnomedLoader
            tasks.append((SnomedLoader, args.snomed_dir))
        if not tasks:
            print("ERROR: --source all requires at least one file/dir argument.", file=sys.stderr)
            sys.exit(1)

    for loader_cls, path in tasks:
        async with loader_cls(db_url) as loader:
            await loader.load(path)


def _require(value: str | None, flag: str, source: str) -> None:
    if not value:
        print(f"ERROR: --source {source} requires {flag}", file=sys.stderr)
        sys.exit(1)


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    t0 = time.monotonic()
    asyncio.run(run(args))
    print(f"\nTotal elapsed: {time.monotonic() - t0:.1f}s")


if __name__ == "__main__":
    main()
