# Security Policy

This project is an Identity & Access Management (IAM) server — it issues sessions, OAuth 2.1 / OIDC tokens, API keys, and agent credentials. Security reports are taken seriously and prioritized.

## Supported Versions

This project is pre-1.0 and does not yet maintain parallel release branches. Security fixes are applied to the latest commit on `main` only.

| Version | Supported |
| ------- | --------- |
| `main`  | ✅ |
| older commits / tags | ❌ |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Instead, report privately using one of the following channels:

1. **Preferred:** [GitHub Security Advisories](https://github.com/Yazhnimalan/bezs-iam/security/advisories/new) — private by default and lets us coordinate a fix before disclosure.
2. **Email:** [naveenraj.gnr2002@gmail.com](mailto:naveenraj.gnr2002@gmail.com) — include steps to reproduce, affected version/commit, and impact.

### What to include

- A clear description of the vulnerability and its impact (e.g. auth bypass, privilege escalation, token/secret leakage, SSRF, injection).
- Steps to reproduce, or a proof-of-concept if possible.
- The affected file(s)/endpoint(s), if known.

### What to expect

- **Acknowledgement:** within 3 business days.
- **Initial assessment:** within 7 days of acknowledgement — severity, whether it's accepted, and rough timeline.
- **Fix & disclosure:** coordinated with the reporter; credit given in the advisory unless anonymity is requested.

## Scope

In scope: authentication/session handling, OAuth 2.1 / OIDC flows, API key and agent-auth logic, RBAC/admin authorization checks, and anything that could leak credentials or PII.

Out of scope: issues requiring physical access, social engineering, or vulnerabilities in third-party dependencies (please report those upstream — feel free to also let us know so we can track the update).
