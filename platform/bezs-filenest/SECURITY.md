# Security Policy

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues, pull requests, or discussions.**

Report vulnerabilities privately by emailing **security@filenest.io**. Include as much detail as possible so we can reproduce and assess the impact quickly.

A good report includes:

- A clear description of the vulnerability and its potential impact
- Steps to reproduce (proof-of-concept code or request/response examples)
- The affected component (`iam/`, `backend/`, `frontend/`, SDK name and version)
- Any suggested remediation if you have one

We will acknowledge your report within **48 hours** and aim to provide an initial assessment within **5 business days**. Critical vulnerabilities (remote code execution, authentication bypass, tenant data leakage) are treated as P0 and triaged immediately.

---

## Disclosure Policy

We follow **coordinated disclosure**:

1. You report the vulnerability privately.
2. We confirm the issue and work on a fix.
3. We release the fix and credit you in the release notes (unless you prefer to remain anonymous).
4. You may publish your findings after the fix is released, or after 90 days from initial report — whichever comes first.

---

## Scope

### In scope

| Area | Examples |
|---|---|
| Authentication & authorization | Token forgery, scope bypass, tenant data leakage across `organization_id` boundaries |
| API key security | Key exposure in logs, insufficient entropy, bypass of `require_scope` checks |
| Upload token abuse | Token reuse beyond expiry, constraint bypass (`allowed_mime_types`, `max_size`) |
| File access control | Accessing another tenant's files or versions without authorization |
| Webhook security | Forged webhook delivery, HMAC bypass |
| Injection | SQL injection in repository queries, path traversal in storage keys |
| Dependency vulnerabilities | Critical CVEs in direct dependencies with a practical exploit path |

### Out of scope

- Vulnerabilities requiring physical access to infrastructure
- Denial-of-service attacks (rate limiting is a Phase 6 feature — not yet implemented)
- Social engineering of maintainers or contributors
- Issues in third-party services (AWS S3, Cloudflare R2, ClamAV) that are not caused by how FileNest uses them
- Scanner output without a demonstrated exploit path
- Missing security headers on the local dev server

---

## Safe Harbor

We will not pursue legal action against researchers who:

- Report vulnerabilities in good faith through this process
- Do not access, modify, or exfiltrate data beyond what is needed to demonstrate the issue
- Do not disrupt production systems or other users
- Do not publicly disclose before a fix is available

---

## Supported Versions

Security fixes are applied to the **latest release only**. We do not backport fixes to older versions.

---

## Known Security Assumptions

These are intentional design choices, not vulnerabilities:

- **Storage keys are guessable by design.** The pattern `{org_id}/{project_id}/{file_id}` is not a secret. Access control is enforced at the API layer via bearer token verification, not by key obscurity. Direct access to the storage bucket is controlled by bucket policies on the storage provider.
- **Upload tokens are single-project scoped.** A token issued for project A cannot be used to upload to project B.
- **`fn_upload_token_` credentials are short-lived.** Default TTL is 1 hour; minimum is 60 seconds. They are stored in Redis and invalidated on use or expiry.
- **ClamAV is a best-effort layer.** Virus scanning is asynchronous and does not block file storage. Files are accessible with `status: processing` before the scan completes. Projects requiring strict blocking can configure their webhook handler to gate access on `file.ready`.
