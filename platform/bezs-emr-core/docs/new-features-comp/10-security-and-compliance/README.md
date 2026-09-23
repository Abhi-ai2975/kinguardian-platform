# Security & Compliance

Healthcare data is the most valuable and most targeted category of personal data.  
HIPAA, HITECH, and state privacy laws impose strict requirements on any system storing PHI.

---

## Files in This Section

| File | Topic |
|---|---|
| [01-audit-logging.md](./01-audit-logging.md) | HIPAA-grade audit trail — who accessed what, when, from where |
| [02-hipaa-compliance.md](./02-hipaa-compliance.md) | HIPAA technical safeguards implementation checklist |
| [03-data-encryption.md](./03-data-encryption.md) | Encryption at rest and in transit |

---

## Current Security Gaps

| Requirement | Status |
|---|---|
| Audit log of all PHI access | Partial — AuditEvent resource exists, not auto-written |
| Automatic audit on every mutation | Missing — must be added as middleware |
| Audit on every read | Missing |
| Failed login tracking | Missing |
| Session timeout | Missing |
| Encryption at rest (DB) | Depends on PostgreSQL server config |
| Encryption in transit (TLS) | Depends on reverse proxy |
| Rate limiting | Missing |
| IP allowlisting | Missing |
| Automatic PHI leak detection | Missing |
| HIPAA BAA tracking | Missing |

---

## Compliance Frameworks

| Framework | Applicability |
|---|---|
| HIPAA Privacy Rule | Required for any US healthcare PHI |
| HIPAA Security Rule | Required for electronic PHI (ePHI) |
| HITECH Act | Breach notification requirements |
| 21st Century Cures Act | Information blocking prohibitions |
| GDPR | If serving EU patients |
| SOC 2 Type II | For enterprise healthcare customers |
| ONC Health IT Certification | Required for EHR certification |
