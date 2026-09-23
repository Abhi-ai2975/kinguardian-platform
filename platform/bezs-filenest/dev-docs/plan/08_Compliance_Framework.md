# FileNest v1.0 — Compliance Framework

**Version:** 1.0.0
**Status:** Approved for Engineering
**Last Updated:** 2026-06-15

---

## Table of Contents

1. [Compliance Philosophy](#1-compliance-philosophy)
2. [Compliance Profile Engine](#2-compliance-profile-engine)
3. [Policy Engine](#3-policy-engine)
4. [Retention Model](#4-retention-model)
5. [Legal Hold Model](#5-legal-hold-model)
6. [WORM Storage Model](#6-worm-storage-model)
7. [Audit Compliance Model](#7-audit-compliance-model)
8. [Industry Compliance Profiles](#8-industry-compliance-profiles)
9. [Compliance Reporting](#9-compliance-reporting)
10. [Data Residency Enforcement](#10-data-residency-enforcement)

---

## 1. Compliance Philosophy

FileNest's compliance engine is built on a single principle:

> Compliance controls are **configuration**, not code.

There is no "healthcare module" or "finance module" compiled into the binary. Instead, a project's configuration activates specific capabilities:

```
Project Configuration
  compliance:
    profile: healthcare
    hipaa_controls: true
    phi_detection: true
    audit_retention_years: 7
    worm: false
    legal_hold_enabled: true
    retention_days: 2555
    immutable_audit: true

Result:
  ✓ PHI detection runs on every upload
  ✓ Audit logs retained 7 years
  ✓ Legal hold operations available
  ✓ Deletions blocked during retention period
  ✗ WORM not enabled (configurable)
```

This means a project can have a custom compliance mix — e.g., healthcare PHI detection + finance retention + legal hold — without needing a separate industry product.

---

## 2. Compliance Profile Engine

### 2.1 Profile Presets

Profiles are named collections of default configuration values. They are applied at project creation and can be overridden per-field.

```python
# backend/app/services/compliance.py
COMPLIANCE_PROFILES = {
    "generic": ComplianceConfig(
        profile="generic",
        retention_days=365,
        audit_retention_years=1,
        immutable_audit=False,
        legal_hold_enabled=False,
        worm=False,
        hipaa_controls=False,
        phi_detection=False,
        pii_detection=False,
        encryption_required=True,
    ),

    "healthcare": ComplianceConfig(
        profile="healthcare",
        retention_days=2555,           # 7 years (HIPAA minimum)
        audit_retention_years=7,
        immutable_audit=True,
        legal_hold_enabled=True,
        worm=False,                    # Off by default, enable if needed
        hipaa_controls=True,
        phi_detection=True,
        pii_detection=False,
        encryption_required=True,
        baa_required=True,
        allowed_storage_providers=["s3", "azure_blob", "gcs"],  # No R2 (EU privacy)
    ),

    "finance": ComplianceConfig(
        profile="finance",
        retention_days=2555,           # 7 years (SEC, SOX)
        audit_retention_years=7,
        immutable_audit=True,
        legal_hold_enabled=True,
        worm=True,                     # Enabled by default for finance
        hipaa_controls=False,
        phi_detection=False,
        pii_detection=True,
        encryption_required=True,
    ),

    "legal": ComplianceConfig(
        profile="legal",
        retention_days=3650,           # 10 years
        audit_retention_years=10,
        immutable_audit=True,
        legal_hold_enabled=True,
        worm=False,
        chain_of_custody=True,
        phi_detection=False,
        pii_detection=True,
        encryption_required=True,
    ),

    "insurance": ComplianceConfig(
        profile="insurance",
        retention_days=2555,
        audit_retention_years=7,
        immutable_audit=True,
        legal_hold_enabled=True,
        worm=True,
        phi_detection=False,
        pii_detection=True,
        encryption_required=True,
    ),
}
```

### 2.2 Profile Application

```python
class ComplianceProfileService:
    def apply_profile(
        self,
        project_config: ProjectConfig,
        profile_name: str,
        overrides: dict | None = None,
    ) -> ProjectConfig:
        if profile_name not in COMPLIANCE_PROFILES:
            raise ValueError(f"Unknown compliance profile: {profile_name}")

        base_profile = COMPLIANCE_PROFILES[profile_name]

        # Apply profile defaults to project config
        merged = project_config.compliance.model_copy(update=base_profile.model_dump())

        # Apply explicit overrides
        if overrides:
            merged = merged.model_copy(update=overrides)

        return project_config.model_copy(update={"compliance": merged})

    def validate_profile_transition(
        self,
        current: ComplianceConfig,
        proposed: ComplianceConfig,
    ) -> list[str]:
        """Returns list of warnings for potentially dangerous profile transitions."""
        warnings = []

        if current.worm and not proposed.worm:
            warnings.append(
                "WARNING: Disabling WORM does not un-protect already-committed files. "
                "New files will not be WORM-protected."
            )

        if current.hipaa_controls and not proposed.hipaa_controls:
            warnings.append(
                "CRITICAL: Disabling HIPAA controls on a healthcare project may violate "
                "your Business Associate Agreement."
            )

        if current.audit_retention_years > proposed.audit_retention_years:
            warnings.append(
                f"WARNING: Reducing audit retention from {current.audit_retention_years} "
                f"to {proposed.audit_retention_years} years. Existing audit records are "
                f"not deleted but will not be extended."
            )

        return warnings
```

### 2.3 BAA (Business Associate Agreement) Enforcement

Healthcare projects require a signed BAA before activation:

```python
async def activate_healthcare_controls(
    project_id: str, auth: AuthContext, db: AsyncSession
) -> None:
    organization = await db.get(Organization, auth.organization_id)

    if not organization.baa_signed:
        raise ComplianceError(
            code="baa_required",
            message=(
                "Healthcare compliance controls require a signed Business Associate "
                "Agreement. Please contact sales@filenest.io to complete your BAA."
            ),
        )

    # BAA must be current (not expired — though we don't have expiry in v1)
    if organization.baa_signed_at < datetime.utcnow() - timedelta(days=1825):
        raise ComplianceError(
            code="baa_expired",
            message="Business Associate Agreement is more than 5 years old. Please renew.",
        )
```

---

## 3. Policy Engine

### 3.1 Policy Check Architecture

Every write operation goes through the policy engine before execution:

```
Request → Policy Engine → Allow / Deny / Allow with conditions

Write Operations checked:
  - File delete
  - File update (metadata, tags)
  - Legal hold release
  - WORM commit
  - Version rollback
  - Folder delete
  - Project config change
```

### 3.2 Policy Check Implementation

```python
# backend/app/services/compliance.py
from dataclasses import dataclass, field
from enum import Enum

class PolicyDecision(Enum):
    ALLOW = "allow"
    DENY = "deny"
    ALLOW_WITH_WARNING = "allow_with_warning"

@dataclass
class PolicyViolation:
    policy: str
    message: str
    reason: str | None = None
    severity: str = "error"  # 'error' | 'warning'

@dataclass
class PolicyCheckResult:
    decision: PolicyDecision
    violations: list[PolicyViolation] = field(default_factory=list)

    @property
    def allowed(self) -> bool:
        return self.decision in (PolicyDecision.ALLOW, PolicyDecision.ALLOW_WITH_WARNING)

    @property
    def warnings(self) -> list[PolicyViolation]:
        return [v for v in self.violations if v.severity == "warning"]

    @property
    def errors(self) -> list[PolicyViolation]:
        return [v for v in self.violations if v.severity == "error"]


class CompliancePolicyEngine:

    async def check_file_delete(
        self, file: File, project_config: ProjectConfig
    ) -> PolicyCheckResult:
        violations = []

        # 1. WORM check (hard block)
        if file.worm_committed:
            violations.append(PolicyViolation(
                policy="worm",
                message="WORM-committed files cannot be deleted by any operation",
                severity="error",
            ))

        # 2. Legal hold check (hard block)
        if file.legal_hold_active:
            violations.append(PolicyViolation(
                policy="legal_hold",
                reason=file.legal_hold_reason,
                message=f"File is under legal hold: {file.legal_hold_reason}",
                severity="error",
            ))

        # 3. Folder legal hold (propagated)
        if file.folder_id:
            folder = await self.folder_repo.get(file.folder_id)
            if folder and folder.legal_hold_active:
                violations.append(PolicyViolation(
                    policy="folder_legal_hold",
                    message=f"Parent folder '{folder.name}' is under legal hold",
                    severity="error",
                ))

        # 4. Retention period check
        if file.retain_until and file.retain_until > datetime.utcnow():
            days_remaining = (file.retain_until - datetime.utcnow()).days
            violations.append(PolicyViolation(
                policy="retention",
                message=(
                    f"File is within its retention period. "
                    f"{days_remaining} days remaining until {file.retain_until.date()}."
                ),
                severity="error",
            ))

        # 5. Compliance profile hard-delete restriction
        if project_config.compliance.profile == "healthcare":
            if project_config.compliance.hipaa_controls:
                violations.append(PolicyViolation(
                    policy="hipaa_no_permanent_delete",
                    message=(
                        "HIPAA-controlled projects do not allow permanent file deletion. "
                        "Files are archived after retention period."
                    ),
                    severity="warning",
                ))

        has_errors = any(v.severity == "error" for v in violations)
        decision = PolicyDecision.DENY if has_errors else (
            PolicyDecision.ALLOW_WITH_WARNING if violations else PolicyDecision.ALLOW
        )

        return PolicyCheckResult(decision=decision, violations=violations)

    async def check_config_change(
        self,
        current_config: ProjectConfig,
        proposed_config: ProjectConfig,
    ) -> PolicyCheckResult:
        violations = []

        # Cannot disable HIPAA controls if BAA is active
        if (current_config.compliance.hipaa_controls
                and not proposed_config.compliance.hipaa_controls):
            violations.append(PolicyViolation(
                policy="hipaa_downgrade_blocked",
                message=(
                    "Cannot disable HIPAA controls while a Business Associate Agreement "
                    "is active. Contact compliance@filenest.io."
                ),
                severity="error",
            ))

        # Cannot shorten retention below compliance minimum
        profile = proposed_config.compliance.profile
        min_retention = {
            "healthcare": 2555,
            "finance": 2555,
            "legal": 3650,
            "insurance": 2555,
        }.get(profile, 0)

        if proposed_config.compliance.retention_days < min_retention:
            violations.append(PolicyViolation(
                policy="retention_minimum",
                message=(
                    f"The '{profile}' compliance profile requires a minimum retention "
                    f"of {min_retention} days. Proposed: {proposed_config.compliance.retention_days}."
                ),
                severity="error",
            ))

        has_errors = any(v.severity == "error" for v in violations)
        decision = PolicyDecision.DENY if has_errors else PolicyDecision.ALLOW

        return PolicyCheckResult(decision=decision, violations=violations)
```

---

## 4. Retention Model

### 4.1 Retention Concepts

| Concept | Description |
|---------|-------------|
| `retention_days` | How long files must be kept before they can be deleted |
| `retain_until` | Absolute date computed at upload: `created_at + retention_days` |
| `delete_on_expiry` | Whether to auto-delete after retention period (default: false) |
| `archive_on_expiry` | Whether to move to cold storage after retention period |

### 4.2 Retention Assignment

Retention is assigned at upload time based on the project configuration:

```python
def compute_retain_until(
    created_at: datetime,
    project_config: ProjectConfig,
    metadata: dict,
) -> datetime | None:
    retention_days = project_config.compliance.retention_days

    if not retention_days:
        return None

    # Override retention based on document type (optional)
    if project_config.compliance.retention_overrides:
        doc_type = metadata.get("documentType")
        if doc_type in project_config.compliance.retention_overrides:
            retention_days = project_config.compliance.retention_overrides[doc_type]

    return created_at + timedelta(days=retention_days)
```

### 4.3 Retention Enforcement Background Job

```python
# Background job: runs daily
class RetentionEnforcementJob:
    async def run(self) -> None:
        logger.info("Starting retention enforcement job")

        # Find files past retention period
        async with get_db_session() as db:
            expired_files = await db.execute(
                select(File)
                .join(Project, File.project_id == Project.id)
                .where(
                    File.deleted_at.is_(None),
                    File.legal_hold_active.is_(False),
                    File.worm_committed.is_(False),
                    File.retain_until < datetime.utcnow(),
                )
                .limit(1000)
            )

            for file in expired_files.scalars():
                project_config = await get_project_config(file.project_id)

                if project_config.compliance.delete_on_expiry:
                    await self._soft_delete_expired(file, db)
                elif project_config.compliance.archive_on_expiry:
                    await self._archive_expired(file, db)
                # else: do nothing (file persists past retention — most common)

    async def _soft_delete_expired(self, file: File, db: AsyncSession) -> None:
        file.deleted_at = datetime.utcnow()
        file.status = FileStatus.DELETED

        await audit_logger.log(
            event_type="file.retention_expired_deleted",
            subject_id=file.id,
            payload={
                "retain_until": file.retain_until.isoformat(),
                "triggered_by": "retention_enforcement_job",
            },
            actor_type="system",
            db=db,
        )

    async def _archive_expired(self, file: File, db: AsyncSession) -> None:
        # Move to cold storage (S3 Glacier, Azure Archive)
        new_key = file.storage_key.replace("/production/", "/archive/")
        await storage_service.move_to_cold_storage(
            file.storage_key,
            new_key,
            storage_class="GLACIER",
        )
        file.storage_key = new_key
        file.status = FileStatus.ARCHIVED
```

### 4.4 Retention Override (Admin Only)

```python
async def extend_retention(
    file_id: str,
    new_retain_until: datetime,
    reason: str,
    auth: AuthContext,
) -> File:
    require_scope("compliance:manage", auth)

    file = await file_repo.get(file_id, auth)

    # Cannot shorten retention period
    if new_retain_until < file.retain_until:
        raise ComplianceError(
            "Cannot shorten retention period. "
            "New retain_until must be after current retain_until."
        )

    file.retain_until = new_retain_until

    await audit_logger.log(
        event_type="file.retention_extended",
        subject_id=file_id,
        payload={
            "old_retain_until": file.retain_until.isoformat(),
            "new_retain_until": new_retain_until.isoformat(),
            "reason": reason,
        },
        auth=auth,
    )

    return file
```

---

## 5. Legal Hold Model

### 5.1 Legal Hold Architecture

Legal hold is an absolute override that supersedes:
- Retention policy expiration
- WORM policy (paradoxically — legal hold prevents WORM commit too in some cases)
- User-initiated deletion
- Automated retention enforcement
- Archive on expiry jobs

### 5.2 Legal Hold Operations

```python
class LegalHoldService:

    async def set_file_legal_hold(
        self,
        file_id: str,
        hold_config: LegalHoldConfig,
        auth: AuthContext,
    ) -> LegalHoldResult:
        require_scope("compliance:manage", auth)

        file = await self.file_repo.get(file_id, auth)

        if file.legal_hold_active:
            raise ConflictError(
                f"File is already under legal hold: {file.legal_hold_reason}"
            )

        file.legal_hold_active = True
        file.legal_hold_reason = hold_config.reason
        file.legal_hold_set_by = auth.actor_id
        file.legal_hold_set_at = datetime.utcnow()

        await self.audit_logger.log(
            event_type="file.legal_hold_set",
            subject_id=file_id,
            payload={
                "reason": hold_config.reason,
                "indefinite": hold_config.indefinite,
                "releases_at": hold_config.releases_at.isoformat() if hold_config.releases_at else None,
            },
            auth=auth,
            phi_involved=file.phi_detected or False,
        )

        return LegalHoldResult(
            file_id=file_id,
            legal_hold_active=True,
            reason=hold_config.reason,
            set_at=file.legal_hold_set_at,
        )

    async def set_folder_legal_hold(
        self,
        folder_id: str,
        hold_config: LegalHoldConfig,
        auth: AuthContext,
    ) -> FolderLegalHoldResult:
        require_scope("compliance:manage", auth)

        # Get all files in folder (recursive)
        folder = await self.folder_repo.get(folder_id, auth)
        file_ids = await self.file_repo.get_all_in_folder_recursive(folder_id)

        folder.legal_hold_active = True
        folder.legal_hold_reason = hold_config.reason

        # Files don't need individual legal_hold_active flag if checking folder
        # But we set them for easier query performance
        await self.file_repo.bulk_set_legal_hold(file_ids, hold_config.reason)

        await self.audit_logger.log(
            event_type="folder.legal_hold_set",
            subject_id=folder_id,
            payload={
                "reason": hold_config.reason,
                "files_affected": len(file_ids),
            },
            auth=auth,
        )

        return FolderLegalHoldResult(
            folder_id=folder_id,
            files_affected=len(file_ids),
        )

    async def release_legal_hold(
        self,
        file_id: str,
        release_config: LegalHoldReleaseConfig,
        auth: AuthContext,
    ) -> None:
        require_scope("compliance:manage", auth)

        file = await self.file_repo.get(file_id, auth)

        if not file.legal_hold_active:
            raise ConflictError("File is not under legal hold")

        # For healthcare projects: require two-person approval
        project_config = await self.project_client.get_config(auth.project_id)
        if project_config.compliance.hipaa_controls:
            if not release_config.second_approver_id:
                raise ComplianceError(
                    "Releasing legal hold on a HIPAA-controlled file requires "
                    "a second approver. Provide second_approver_id in the request."
                )

        file.legal_hold_active = False
        file.legal_hold_reason = None

        await self.audit_logger.log(
            event_type="file.legal_hold_released",
            subject_id=file_id,
            payload={
                "release_reason": release_config.release_reason,
                "second_approver_id": release_config.second_approver_id,
            },
            auth=auth,
        )
```

### 5.3 Legal Hold at Storage Layer

For maximum security, legal hold is also enforced at the storage provider level:

```python
async def apply_storage_legal_hold(
    storage_key: str, project_config: ProjectConfig, file_id: str
) -> None:
    """Apply S3 Object Lock legal hold when storage is configured for it."""
    if not project_config.compliance.use_s3_object_lock:
        return  # Only file-level hold in DB

    async with s3_client() as client:
        await client.put_object_legal_hold(
            Bucket=project_config.storage.bucket_name,
            Key=storage_key,
            LegalHold={"Status": "ON"},
        )
```

---

## 6. WORM Storage Model

### 6.1 WORM Concepts

WORM (Write Once, Read Many) is an irreversible state applied to individual files:

- Once committed, a file **cannot be deleted, modified, or overwritten**
- Only **legal hold release** can interact with WORM files (reads are always allowed)
- WORM commit is recorded in the audit log with full actor information
- WORM is enforced at the FileNest database level AND optionally at the storage level

### 6.2 WORM at Storage Level

For maximum compliance, WORM projects use S3 Object Lock:

```python
# When creating a file in a WORM project
async def upload_with_worm(
    storage_key: str,
    data: BinaryIO,
    project_config: ProjectConfig,
) -> None:
    extra_args = {}

    if project_config.compliance.worm:
        # Object Lock with Compliance mode (even root cannot delete)
        retain_until = datetime.utcnow() + timedelta(
            days=project_config.compliance.retention_days
        )
        extra_args["ObjectLockMode"] = "COMPLIANCE"
        extra_args["ObjectLockRetainUntilDate"] = retain_until
        # Alternatively: "GOVERNANCE" mode (allows admin override)

    await s3_client.put_object(
        Bucket=bucket,
        Key=storage_key,
        Body=data,
        **extra_args,
    )
```

### 6.3 WORM Commit Flow

```
1. File uploaded to WORM-enabled project
   → File status: ready (but not yet WORM-committed)
   → WORM protection status: pending

2. Application (or scheduled job) calls POST /v1/files/{id}/worm-commit
   → Requires: compliance:manage scope
   → Requires: confirm: true in request body
   → Optional: reason field

3. FileNest sets:
   → file.worm_committed = true
   → file.worm_committed_at = now
   → Applies S3 Object Lock (if configured)

4. Audit log: file.worm_committed (immutable)

5. All subsequent delete/modify attempts:
   → Policy engine detects worm_committed = true
   → Returns 409 Conflict
   → Audit log: file.worm_violation_attempted
```

### 6.4 Auto-WORM on Upload

For projects where every file should be immediately WORM-committed:

```yaml
compliance:
  worm: true
  worm_auto_commit: true  # Commit WORM immediately after upload completes
  worm_mode: compliance   # 'compliance' (strict) or 'governance' (admin override)
```

```python
async def post_upload_worm_commit(file: File, project_config: ProjectConfig) -> None:
    if not project_config.compliance.worm_auto_commit:
        return

    file.worm_committed = True
    file.worm_committed_at = datetime.utcnow()
    file.retain_until = datetime.utcnow() + timedelta(
        days=project_config.compliance.retention_days
    )
```

---

## 7. Audit Compliance Model

### 7.1 Audit Log Immutability

The `audit_logs` table is:
- **Append-only** via PostgreSQL RLS (no UPDATE or DELETE permissions)
- **Partitioned** by month (old partitions can be archived, not deleted)
- **Exported** to immutable S3 storage (Object Lock) before archival
- **Checksummed** — each day's audit log batch has a SHA-256 hash stored separately

```sql
-- Only INSERT allowed on audit_logs
-- No UPDATE policy = UPDATE blocked
-- No DELETE policy = DELETE blocked
CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT WITH CHECK (TRUE);
CREATE POLICY audit_logs_select ON audit_logs FOR SELECT
    USING (organization_id::TEXT = current_setting('app.current_organization_id'));
```

### 7.2 Audit Log Checksum Chain

For maximum tamper-evidence, each audit log entry references the previous entry's hash:

```python
async def write_audit_log(
    event: AuditLogEntry, db: AsyncSession
) -> AuditLog:
    # Get hash of previous audit record for this org
    prev_hash = await get_previous_audit_hash(event.organization_id, db)

    # Compute this entry's hash
    entry_content = json.dumps({
        "event_type": event.event_type,
        "subject_id": str(event.subject_id),
        "actor_id": str(event.actor_id),
        "payload": event.payload,
        "occurred_at": event.occurred_at.isoformat(),
        "previous_hash": prev_hash,
    }, sort_keys=True)

    entry_hash = hashlib.sha256(entry_content.encode()).hexdigest()

    audit_record = AuditLog(
        **event.model_dump(),
        previous_hash=prev_hash,
        entry_hash=entry_hash,
    )
    db.add(audit_record)
    return audit_record
```

### 7.3 Audit Retention Enforcement

```python
class AuditRetentionJob:
    """
    Audit logs are NEVER deleted within retention period.
    After retention period, they are ARCHIVED to cold storage, then dropped from hot DB.
    """

    async def archive_old_partitions(self) -> None:
        projects = await self.project_repo.get_all_with_compliance()

        for project in projects:
            retention_years = project.config["compliance"]["audit_retention_years"]
            archive_before = datetime.utcnow() - timedelta(days=365 * retention_years)

            # Find partitions older than retention period
            old_partitions = await self.get_old_audit_partitions(
                project.id, archive_before
            )

            for partition_name, month in old_partitions:
                await self._archive_partition(partition_name, month, project)

    async def _archive_partition(
        self, partition_name: str, month: str, project: Project
    ) -> None:
        # Export to S3 with Object Lock
        export_key = (
            f"audit-archives/{project.organization_id}/"
            f"{project.id}/{month}.parquet"
        )

        await self.exporter.export_partition_to_s3(
            partition_name=partition_name,
            s3_key=export_key,
            format="parquet",
            compress=True,
        )

        # Apply Object Lock (immutable archive)
        await self.storage.apply_object_lock(
            key=export_key,
            mode="COMPLIANCE",
            retain_years=project.config["compliance"]["audit_retention_years"],
        )

        # Drop hot DB partition ONLY after confirmed S3 write
        await self.db.execute(f"DROP TABLE IF EXISTS {partition_name}")

        logger.info(
            "audit_partition_archived",
            partition=partition_name,
            s3_key=export_key,
        )
```

---

## 8. Industry Compliance Profiles

### 8.1 Healthcare (HIPAA)

**Required controls when profile=healthcare:**

| Control | Implementation |
|---------|---------------|
| Access Controls | RBAC, API key scopes, signed URLs |
| Audit Controls | Immutable audit logs, 7-year retention |
| Integrity Controls | SHA-256 checksum, version history |
| Transmission Security | TLS 1.3 |
| PHI Detection | Presidio-based entity detection on all uploads |
| Minimum Necessary | Audit log justification field (v2) |
| Business Associate Agreement | BAA check at project creation |

**PHI Entity Types Detected:**

```python
PHI_ENTITIES = [
    "PERSON",           # Patient name
    "DATE_TIME",        # DOB, admission date (if contextual)
    "US_SSN",           # Social Security Number
    "US_DRIVER_LICENSE",
    "US_PASSPORT",
    "PHONE_NUMBER",
    "EMAIL_ADDRESS",
    "LOCATION",         # Home address
    "MEDICAL_LICENSE",  # NPI number
    "URL",              # Embedded PHI in URLs
    "IP_ADDRESS",
    "CRYPTO",           # Account numbers (in financial health contexts)
    "IN_PAN",           # Indian PAN (for international health)
]
```

### 8.2 Finance (SOX, SEC Rule 17a-4)

**SEC Rule 17a-4 requirements:**

| Requirement | Implementation |
|-------------|---------------|
| WORM storage | S3 Object Lock in COMPLIANCE mode |
| Non-erasable | WORM commit blocks all delete paths |
| Non-rewritable | Version history (not overwrite) |
| Serialized | Sequential version numbers |
| Downloadable | Audit export API |
| 6-year retention | retention_days=2190 (6 years) |
| 2-year accessible | Hot storage for 2 years, archive after |

### 8.3 Legal (Evidence Handling)

**Chain of custody requirements:**

```python
class ChainOfCustodyRecord:
    file_id: str
    event_type: str  # 'received', 'transferred', 'accessed', 'sealed', 'unsealed'
    actor_id: str
    actor_name: str
    timestamp: datetime
    digital_signature: str  # SHA-256 of (file_hash + actor_id + timestamp)
    notes: str | None
    previous_hash: str  # Chain linking

def create_chain_of_custody_entry(
    file: File, event_type: str, actor: str
) -> ChainOfCustodyRecord:
    content = f"{file.checksum_sha256}:{actor}:{datetime.utcnow().isoformat()}"
    signature = hashlib.sha256(content.encode()).hexdigest()

    return ChainOfCustodyRecord(
        file_id=file.id,
        event_type=event_type,
        actor_id=actor,
        timestamp=datetime.utcnow(),
        digital_signature=signature,
    )
```

### 8.4 Insurance (State Regulations)

Insurance compliance varies by state and line of business:

```yaml
insurance_defaults:
  retention_days: 2555           # 7 years (common requirement)
  audit_retention_years: 7
  worm: true
  pii_detection: true            # Customer PII protection
  classification: true           # Auto-classify policy types
  metadata_required_fields:
    - policyNumber
    - claimNumber
    - lineOfBusiness
```

---

## 9. Compliance Reporting

### 9.1 Compliance Dashboard Data

```python
@router.get("/v1/compliance/report")
async def get_compliance_report(auth: AuthContext = Depends(require_scope("audit:read"))):
    return ComplianceReport(
        project_id=auth.project_id,
        generated_at=datetime.utcnow(),

        # File statistics
        total_files=await file_repo.count(auth.project_id),
        files_under_legal_hold=await file_repo.count_legal_hold(auth.project_id),
        worm_committed_files=await file_repo.count_worm(auth.project_id),
        files_past_retention=await file_repo.count_past_retention(auth.project_id),
        quarantined_files=await file_repo.count_quarantined(auth.project_id),

        # Processing stats
        phi_detections_last_30_days=await processing_repo.count_phi(auth.project_id),
        virus_detections_last_30_days=await processing_repo.count_virus(auth.project_id),

        # Audit stats
        audit_events_last_30_days=await audit_repo.count_recent(auth.project_id),
        failed_access_attempts_last_30_days=await audit_repo.count_failed_auth(auth.project_id),

        # Compliance controls
        controls=project_config.compliance,

        # Upcoming expirations
        files_expiring_in_30_days=await file_repo.count_expiring_soon(auth.project_id, 30),
    )
```

### 9.2 Compliance Evidence Package

For regulatory submissions, export a compliance evidence package:

```
POST /v1/compliance/evidence-package

Returns:
  - Audit log export (full period)
  - File retention report
  - Legal hold history
  - Access control configuration
  - Encryption configuration certificate
  - Processing results summary
  - BAA status
```

---

## 10. Data Residency Enforcement

### 10.1 Residency Enforcement at Upload

```python
async def enforce_data_residency(
    project: Project, request_region: str
) -> None:
    required_region = project.config["compliance"].get("data_residency")

    if not required_region or required_region == "any":
        return  # No restriction

    if not is_region_compliant(request_region, required_region):
        raise ComplianceError(
            code="data_residency_violation",
            message=(
                f"This project requires data to be stored in {required_region}. "
                f"Request origin region '{request_region}' is not compliant."
            ),
        )

REGION_MAPPING = {
    "us": ["us-east-1", "us-east-2", "us-west-1", "us-west-2"],
    "eu": ["eu-west-1", "eu-west-2", "eu-central-1", "eu-north-1"],
    "india": ["ap-south-1"],
    "middle_east": ["me-south-1", "me-central-1"],
}
```

### 10.2 Storage Provider Region Enforcement

```python
def validate_storage_config_region(
    storage_config: StorageConfig,
    required_residency: str,
) -> None:
    if required_residency == "any":
        return

    allowed_regions = REGION_MAPPING.get(required_residency, [])

    if storage_config.region not in allowed_regions:
        raise ValidationError(
            f"Storage region '{storage_config.region}' is not in the allowed regions "
            f"for data residency '{required_residency}': {allowed_regions}"
        )
```

---

## 11. Compliance Profile Immutability

### 11.1 Why Domain Selection Locks at First Upload

A project's compliance profile (`healthcare`, `finance`, `legal`, `insurance`, `generic`) is **immutable once the project has uploaded files**. This is a deliberate product constraint, not a technical limitation.

**The problem with domain switching post-upload:** If a project migrates from `generic` to `healthcare` after files exist:

- Existing files were never scanned for PHI
- Audit logs for prior downloads do not meet HIPAA §164.312(b) standards
- `retain_until` was never set — retroactive retention policy application on existing files is unreliable
- Chain of custody for existing files is broken — there is no proof they were handled under HIPAA controls

Allowing domain upgrades after file uploads creates a false compliance state that would fail an audit.

### 11.2 Immutability Enforcement

```python
class ComplianceProfileService:

    async def validate_profile_change(
        self,
        project_id: str,
        current_profile: str,
        requested_profile: str,
        db: AsyncSession,
    ) -> None:
        # Same profile — no-op
        if current_profile == requested_profile:
            return

        # Check if any files exist
        file_count = await db.scalar(
            select(func.count(File.id))
            .where(
                File.project_id == project_id,
                File.deleted_at.is_(None),
            )
        )

        if file_count > 0:
            raise ComplianceError(
                code="profile_locked",
                message=(
                    f"Cannot change compliance profile from '{current_profile}' "
                    f"to '{requested_profile}': {file_count} files already exist "
                    f"under the current profile. Create a new project with the "
                    f"desired profile and migrate files via the migration API."
                ),
                http_status=422,
            )

        # If no files exist, allow the change but log it
        logger.warning(
            "compliance_profile_changed",
            project_id=project_id,
            from_profile=current_profile,
            to_profile=requested_profile,
        )
```

### 11.3 Config Dependency Validation

For Generic projects where customers manually enable individual compliance features, `ProjectConfigValidator` checks that required companion settings are also enabled. Violations produce warnings (not errors) to preserve flexibility, but are prominently surfaced.

```python
CONFIG_DEPENDENCIES = [
    ConfigDependency(
        trigger=lambda c: c.get("processing", {}).get("phi_detection"),
        required=[
            ("compliance.immutable_audit", True),
            ("compliance.audit_retention_years", lambda v: v is not None and v >= 6),
        ],
        warning_code="phi_detection_without_hipaa_audit",
        severity="high",
        message=(
            "PHI detection is enabled but audit logs are not configured to HIPAA "
            "standards (immutable audit + 6-year minimum retention). This configuration "
            "does not satisfy HIPAA §164.312(b). Apply the Healthcare preset or manually "
            "enable both immutable_audit and audit_retention_years >= 6."
        ),
        suggested_fix={
            "compliance": {
                "immutable_audit": True,
                "audit_retention_years": 7,
            }
        },
    ),
    ConfigDependency(
        trigger=lambda c: c.get("compliance", {}).get("worm"),
        required=[
            ("compliance.retention_days", lambda v: v is not None),
        ],
        warning_code="worm_without_retention",
        severity="high",
        message=(
            "WORM is enabled but no retention period is configured. "
            "Files will be write-protected with no defined expiry."
        ),
    ),
    ConfigDependency(
        trigger=lambda c: c.get("compliance", {}).get("legal_hold"),
        required=[
            ("compliance.immutable_audit", True),
        ],
        warning_code="legal_hold_without_immutable_audit",
        severity="medium",
        message=(
            "Legal hold is enabled but audit logs are not immutable. "
            "This may not satisfy evidentiary requirements in litigation."
        ),
    ),
]


class ProjectConfigValidator:

    def validate_with_warnings(self, config: dict) -> list[ConfigWarning]:
        warnings = []
        for dep in CONFIG_DEPENDENCIES:
            if dep.trigger(config):
                for path, expected in dep.required:
                    actual = get_nested(config, path)
                    satisfied = (
                        actual == expected
                        if not callable(expected)
                        else expected(actual)
                    )
                    if not satisfied:
                        warnings.append(
                            ConfigWarning(
                                code=dep.warning_code,
                                severity=dep.severity,
                                message=dep.message,
                                suggested_fix=dep.suggested_fix,
                            )
                        )
                        break
        return warnings
```

These warnings are returned on every `PATCH /v1/projects/{id}/config` response in a top-level `warnings[]` array and are also displayed in the dashboard config editor before the customer saves.
