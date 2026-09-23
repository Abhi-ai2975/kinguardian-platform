# Security Policy

## Reporting a vulnerability

drgodly handles healthcare data. If you find a security vulnerability,
please **do not open a public GitHub issue**. Instead, report it privately
so we can fix it before it's disclosed.

- Email: security reports can be sent to the maintainer listed in the
  repository's GitHub profile.
- Alternatively, use [GitHub's private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability)
  on this repository (Security tab → "Report a vulnerability").

Please include:

- A description of the vulnerability and its potential impact
- Steps to reproduce (proof-of-concept code/requests, if applicable)
- The version/commit you tested against

We'll acknowledge your report as soon as we can and follow up once the
issue is triaged and fixed. Please give us reasonable time to address the
issue before any public disclosure.

## Supported versions

This project is under active development on `main`. Security fixes are
applied to `main` only; there are no maintained release branches at this
time.

## Scope

In scope:

- The Next.js application in this repository (`src/`)
- Docker build/deploy configuration (`Dockerfile`, `docker-compose*.yml`,
  `compose*.yml`)

Out of scope (report to the relevant repo/vendor instead):

- The external IAM/BetterAuth server, FHIR server, and AI agent services
  this app depends on — each is a separate codebase
- Third-party services (LiveKit, Vapi, FileNest, Groq, Google, Thesys,
  ABDM) — report to the vendor directly

## Handling secrets

Never commit real credentials, API keys, or `.env` files. This repo's
`.gitignore` excludes `.env*` and the local `agents/` directory (which may
contain hardcoded developer credentials for local-only agent containers)
— keep it that way. Use `.env.example` as the template for any new
environment variable and only ever commit placeholder values there.

If you accidentally commit a secret, rotate it immediately and let a
maintainer know — removing it from a later commit does not remove it from
git history.
