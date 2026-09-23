# Security Policy

## Supported Versions

Watcher24 is currently in active MVP development on the `mvp` branch. There are no
tagged releases yet — security fixes land on `mvp` and are not backported to older
commits. Once versioned releases begin, this section will list which versions
receive security updates.

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.** Public
issues are visible to everyone, including potential attackers, before a fix is
available.

Instead, report it privately using **GitHub's private vulnerability reporting**:

1. Go to the [Security tab](../../security) of this repository.
2. Click **"Report a vulnerability"**.
3. Fill in as much detail as you can (see below).

If private reporting isn't available for this repository for any reason, open a
regular issue that describes only "possible security issue found, requesting a
private contact" — without any exploit details — and a maintainer will follow up
with a private channel.

### What to include

To help us triage and fix the issue quickly, please include:

- A clear description of the vulnerability and its potential impact
- Steps to reproduce, or a proof-of-concept (request, payload, script, etc.)
- The affected app(s) or service(s) — e.g. `apps/gateway-go`, `apps/iam`, `sdk/js`
- Any suggested mitigation, if you have one

### What to expect

- We aim to acknowledge new reports within a few days.
- We'll keep you updated as we investigate and work on a fix.
- We'll credit reporters (if desired) once a fix ships, unless you'd prefer to
  remain anonymous.
- Please give us a reasonable amount of time to fix the issue before any public
  disclosure.

## Scope

This policy covers the services, SDKs, and infrastructure configuration in this
repository:

- `apps/gateway-go`, `apps/realtime-go`, `apps/notifier-go` — Go services
- `apps/analytics-python` — Python event processing worker
- `apps/console`, `apps/iam` — Next.js applications
- `sdk/js`, `sdk/python`, `sdk/go`, `sdk/rust` — client SDKs
- `infrastructure/` — database migrations and Docker configuration

Vulnerabilities of particular interest include (but aren't limited to):

- Authentication or authorization bypass (IAM sessions, OAuth flows, API keys,
  public tokens)
- Multi-tenant data isolation issues — one organization able to read or affect
  another organization's data
- Injection vulnerabilities (SQL, command, etc.)
- Secrets or credentials exposed in logs, responses, or client-side code
- Server-side request forgery, path traversal, or other request-handling flaws
  in the gateway or internal service-to-service APIs

### Out of scope

- Findings that require physical access to a user's device
- Denial-of-service reports based purely on volumetric traffic
- Issues in third-party dependencies — please report those upstream (though we'd
  still appreciate a heads-up if it affects us)
- Missing security headers or best-practice suggestions without a demonstrated
  exploit — feel free to open a regular issue or PR for these instead

Thank you for helping keep Watcher24 and its users safe.
