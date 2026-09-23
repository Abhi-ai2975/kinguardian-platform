# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in bezs-agent, please report it privately rather than opening a public issue.

- Email: **naveenraj.gnr2002@gmail.com**
- Include: a description of the issue, steps to reproduce, and the potential impact.

We'll acknowledge your report within 5 business days and aim to provide a fix or mitigation plan within 30 days, depending on severity.

Please do not publicly disclose the issue until it has been addressed.

## Scope

This project handles clinical/patient-adjacent data (SOAP notes, patient summaries, voice transcripts). Reports involving any of the following are especially relevant:

- Authentication/authorization bypass (JWT validation, IAM integration)
- Exposure of patient data (e.g. via logs, `data/`, `patients/`, or `vault/` directories, or unauthenticated endpoints)
- Injection vulnerabilities in tool execution, shell/file tools, or the approval/safety layer
- Leakage of API keys or credentials

## Supported Versions

This project is pre-1.0 and does not yet maintain multiple release branches. Security fixes are applied to the `main`/`master` branch only.

## Handling Secrets

- Never commit `.env` files or API keys — use `.env.example` as a template.
- Runtime data directories (`data/`, `patients/`, `vault/`) are gitignored and must never contain real patient data in a shared or public environment.
- If you accidentally commit a secret, rotate it immediately and notify a maintainer so history can be scrubbed.
