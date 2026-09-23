# Security Policy

## Reporting a Vulnerability

If you believe you've found a security vulnerability in `fhir-gql`, please report it privately — **do not open a public GitHub issue**.

Use [GitHub's private vulnerability reporting](../../security/advisories/new) for this repository (Security tab → "Report a vulnerability"). This opens a private advisory visible only to maintainers until a fix is ready.

Please include:

- A description of the vulnerability and its potential impact
- Steps to reproduce, or a proof-of-concept
- Any affected endpoints, versions, or configuration

We'll acknowledge your report as soon as possible and keep you updated as we investigate and fix the issue. Once a fix is released, we'll credit you in the advisory unless you'd prefer to stay anonymous.

## Scope

This service authenticates requests and proxies healthcare (FHIR) data to/from [`fhir-server`](../fhir-server). When testing:

- Use only synthetic/test data — never submit real patient information (PHI) in a report or a reproduction case
- Auth bypass, JWT validation flaws, and rate-limit bypass reports are especially in scope, given this service's role as the auth/RBAC boundary in front of `fhir-server`
- Avoid testing against any deployment you don't own or have explicit permission to test
- Denial-of-service testing against shared/hosted instances is out of scope

## Supported Versions

This project is under active development on `main`. Security fixes are applied to `main` and released from there — there is currently no separate long-term-support branch.
