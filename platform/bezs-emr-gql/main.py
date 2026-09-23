"""
Root entry point for the fhir-gql package when invoked directly via `python -m fhir_gql`
or as a script. This is a development convenience stub — the actual application server
is started via `uvicorn app.main:app`. This file is intentionally minimal.
"""


def main():
    """
    Placeholder entry point printed during direct module execution.
    In production the application is launched by uvicorn targeting app.main:app,
    so this function is only reached during local development smoke tests.
    """
    print("Hello from fhir-gql!")


# Only execute main() when this script is run directly, not when imported as a module.
if __name__ == "__main__":
    main()
