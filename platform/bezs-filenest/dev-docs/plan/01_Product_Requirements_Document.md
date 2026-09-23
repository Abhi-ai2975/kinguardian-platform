# FileNest v1.0 — Product Requirements Document

**Version:** 1.0.0
**Status:** Approved for Engineering
**Authors:** Product, Architecture, Engineering Leadership
**Last Updated:** 2026-06-15

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Business Goals](#2-business-goals)
3. [Market Positioning](#3-market-positioning)
4. [Personas](#4-personas)
5. [User Journeys](#5-user-journeys)
6. [Functional Requirements](#6-functional-requirements)
7. [Enterprise Requirements](#7-enterprise-requirements)
8. [Healthcare Requirements](#8-healthcare-requirements)
9. [Compliance Requirements](#9-compliance-requirements)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [SaaS & Multi-Tenant Model](#11-saas--multi-tenant-model)
12. [Project Model](#12-project-model)
13. [Storage Model](#13-storage-model)
14. [Capability Packs](#14-capability-packs)
15. [Pricing Model Concepts](#15-pricing-model-concepts)
16. [Out of Scope for v1](#16-out-of-scope-for-v1)

---

## 1. Product Vision

### 1.1 The Problem

Every team that builds a product eventually builds a file management system. The result is always the same:

- Ad-hoc upload endpoints bolted onto application services
- Direct S3 integrations with hard-coded credentials
- No standardized metadata, search, or governance
- No audit trail for compliance
- No processing pipeline for OCR, virus scanning, or classification
- No healthcare or legal-specific handling

Each team re-solves the same problems independently, poorly, and expensively.

### 1.2 The Solution

FileNest is the infrastructure layer between applications and storage providers.

> FileNest is to files what Stripe is to payments and Clerk is to authentication.

FileNest provides:

- **A single API** for all file operations regardless of the underlying storage provider
- **A metadata engine** with project-defined schemas and validation
- **A governance layer** with RBAC, audit trails, compliance profiles, and retention policies
- **A processing engine** for OCR, virus scanning, PII detection, classification, and AI embeddings
- **A search engine** over filenames, metadata, tags, and OCR-extracted text
- **Healthcare-grade capabilities** through configuration, not hardcoded industry logic
- **SDKs and React components** so frontend teams can ship file experiences in hours

### 1.3 Design Philosophy

The system must be **configuration-driven, not industry-driven**.

FileNest does not have a "Healthcare Mode" compiled into the binary. Instead, a project is configured with:

```yaml
compliance:
  profile: healthcare
  hipaa_controls: true
  phi_detection: true
  audit_retention_years: 7

processing:
  ocr: true
  phi_redaction: false
  classification: true

metadata:
  schema: healthcare_v1

storage:
  provider: s3
  region: us-east-1
  encryption: aws_kms
  worm: false
```

The healthcare, finance, legal, and insurance capability packs are **preset configurations** layered on top of the same core engine. This design means:

1. A single codebase serves all industries
2. Enterprises can mix capabilities (e.g., healthcare + legal hold)
3. New industries can be added as configuration presets without code changes

---

## 2. Business Goals

### 2.1 Primary Goals (v1.0)

| Goal | Success Metric |
|------|----------------|
| Launch a working file infrastructure API | 100% of core CRUD endpoints functional |
| Enable first 10 enterprise customers | Signed contracts and live integrations |
| Support healthcare use cases | HIPAA controls passing third-party audit |
| Enable developer self-service | Time-to-first-upload under 15 minutes |
| Achieve 99.9% uptime SLA | Measured monthly across all regions |

### 2.2 Secondary Goals (v1.x)

| Goal | Target |
|------|--------|
| Marketplace for capability packs | 5+ packs available |
| SDK adoption | 1,000+ npm downloads/week |
| Enterprise annual contract value | $50K–$500K range |
| Healthcare customer base | 5+ signed healthcare organizations |

### 2.3 Strategic Goals

- Become the default file infrastructure layer for B2B SaaS
- Win healthcare and insurance verticals on compliance and integrations
- Build the standard SDK/component library so file UIs are not custom-built
- Enable AI platforms to use FileNest as their document ingestion pipeline

---

## 3. Market Positioning

### 3.1 Competitive Landscape

| Product | What it does | Why it's not enough |
|---------|--------------|---------------------|
| AWS S3 | Object storage | No metadata, governance, or SDKs |
| Cloudflare R2 | Object storage | Same as S3 — raw storage only |
| Box | Enterprise file sharing | UI-centric, not API-first for developers |
| Dropbox Business | Enterprise file sync | Consumer product, not infrastructure |
| Filestack | Upload widget + CDN | No metadata, compliance, or healthcare |
| Uploadcare | Upload widget | No enterprise features |

### 3.2 Differentiators

1. **Configuration-driven capability model** — industries get presets, not a different product
2. **Healthcare-native** — FHIR, XDS, DICOM, PHI detection out of the box
3. **SDK-first** — React components and hooks that teams can drop in
4. **Processing pipeline** — OCR, virus scan, PII detection, AI embeddings as first-class features
5. **Bring Your Own Bucket (BYOB)** — enterprise customers keep data in their own S3 accounts

---

## 4. Personas

### 4.1 Persona 1 — The Backend Developer (Primary)

**Name:** Alex Chen
**Role:** Senior Backend Engineer at a SaaS startup
**Goals:**
- Implement file uploads without building the infrastructure from scratch
- Get audit logs and signed URL generation for free
- Integrate with the company's existing metadata model

**Pain Points:**
- Spent 2 weeks last quarter building an ad-hoc upload service
- Compliance team keeps asking for audit trails he doesn't have
- Healthcare customer asking for HIPAA compliance — doesn't know where to start

**Success Criteria:**
- First upload working in under 30 minutes via SDK
- Zero direct S3 SDK calls in their codebase
- Metadata schema defined and validated automatically

---

### 4.2 Persona 2 — The Frontend Developer

**Name:** Maria Santos
**Role:** Senior Frontend Developer at a healthcare SaaS company
**Goals:**
- Build a polished file upload UI with drag-and-drop, progress, and preview
- Not have to worry about signed URLs or chunked upload logic
- Reuse components across multiple product features

**Pain Points:**
- Every project starts with a new custom file upload implementation
- Inconsistent UX across products
- No prebuilt components for healthcare document workflows

**Success Criteria:**
- Drop in `<FileUpload />` and it works
- React hooks for file listing and search
- Preview generation handled automatically

---

### 4.3 Persona 3 — The Platform/DevOps Engineer

**Name:** Jordan Kim
**Role:** Platform Engineer at a mid-size insurance company
**Goals:**
- Deploy FileNest on-premise or in a private cloud
- Control all data residency within the EU region
- Set up monitoring and alerting for SLA tracking

**Pain Points:**
- Vendor lock-in to a specific cloud provider
- Data sovereignty requirements in regulated markets
- No ability to inspect or audit vendor infrastructure

**Success Criteria:**
- Deploy via Helm on their own Kubernetes cluster
- Configure MinIO as storage provider (no AWS dependency)
- Full OpenTelemetry integration with their existing Grafana stack

---

### 4.4 Persona 4 — The Healthcare IT Architect

**Name:** Dr. Priya Mehta
**Role:** Director of Health IT at a regional hospital system
**Goals:**
- Store clinical documents with FHIR-compliant metadata
- Meet HIPAA audit trail requirements
- Integrate with their existing EHR via XDS

**Pain Points:**
- Custom document management systems are expensive to maintain
- FHIR servers don't handle binary file storage well
- Audit logs don't meet HIPAA minimum necessary standard

**Success Criteria:**
- Upload clinical documents and retrieve as FHIR DocumentReference
- PHI detection enabled on all uploaded files
- 7-year audit retention enforced automatically

---

### 4.5 Persona 5 — The Compliance Officer

**Name:** Sandra Okonkwo
**Role:** Chief Compliance Officer at a financial services firm
**Goals:**
- Enforce retention policies (7 years for financial records)
- Enable legal hold on documents under litigation
- Export complete audit trails for regulators

**Pain Points:**
- Developers routinely delete files that should be retained
- No chain of custody for sensitive documents
- Audit exports are manual and inconsistent

**Success Criteria:**
- Retention policies configured at the project level and enforced automatically
- Legal hold prevents deletion via any path
- Audit export API returns structured, verifiable records

---

### 4.6 Persona 6 — The Enterprise CTO / Decision Maker

**Name:** Michael Torres
**Role:** CTO at a 500-person B2B SaaS company
**Goals:**
- Eliminate custom file infrastructure debt across 5 engineering teams
- Pass enterprise security reviews from Fortune 500 customers
- Move fast on healthcare and insurance verticals

**Pain Points:**
- Each team built their own file service — 5 different implementations
- SOC 2 audit found gaps in file-level audit logging
- No standardized metadata model across products

**Success Criteria:**
- All teams migrated to FileNest within one quarter
- SOC 2 Type II certification supported
- Single pane of glass for all file operations across projects

---

## 5. User Journeys

### 5.1 Journey 1 — Developer Onboarding and First Upload

**Actor:** Backend Developer (Alex)
**Precondition:** Alex has signed up for FileNest SaaS

```
Step 1: Sign Up
  Alex creates an account at app.filenest.io
  System creates: Organization, default Project, default Environment

Step 2: Create a Project
  Alex creates a project called "patient-records"
  Selects compliance profile: healthcare
  System activates: HIPAA controls, PHI detection, 7-year audit retention

Step 3: Get API Key
  Alex creates an API key with scope: [upload, download, search]
  Downloads the SDK: npm install @filenest/node

Step 4: Upload a File
  const filenest = new FileNest({ apiKey: 'fn_live_...' });
  const file = await filenest.upload(fileBuffer, {
    filename: 'lab-report.pdf',
    metadata: { patientId: 'P-12345', documentType: 'LabReport' }
  });

Step 5: Receive Result
  {
    "fileId": "file_xyz",
    "status": "processing",
    "processingPipeline": ["virus_scan", "phi_detection", "ocr", "indexing"]
  }

Step 6: Get Signed Download URL
  const url = await filenest.getDownloadUrl('file_xyz', { expiresIn: 3600 });
  // Returns: https://cdn.filenest.io/download/...?token=...&expires=...

Step 7: Search Files
  const results = await filenest.search('lab report', {
    filters: { metadata: { patientId: 'P-12345' } }
  });
```

**Outcome:** Alex has file upload, metadata, and search working in under 30 minutes.

---

### 5.2 Journey 2 — Frontend File Upload Experience

**Actor:** Frontend Developer (Maria)

```
Step 1: Install React SDK
  npm install @filenest/react

Step 2: Wrap Application
  <FileNestProvider projectId="proj_abc" tokenEndpoint="/api/filenest-token">
    <App />
  </FileNestProvider>

Step 3: Drop in Upload Component
  <FileUpload
    accept={['application/pdf', 'image/*']}
    maxSize="50MB"
    multiple={true}
    metadata={{ documentType: 'LabReport' }}
    onComplete={(files) => console.log(files)}
  />

Step 4: Token Endpoint (Backend)
  // Next.js route handler
  export async function POST(req) {
    const token = await filenest.createUploadToken({
      projectId: 'proj_abc',
      maxSize: 52428800,
      allowedTypes: ['application/pdf'],
      metadata: { uploadedBy: session.userId }
    });
    return Response.json({ token });
  }

Step 5: Component Handles
  - Drag and drop
  - File type validation
  - Size validation
  - Chunked upload for large files
  - Progress tracking
  - Retry on failure
  - Preview generation
```

**Outcome:** Maria ships a production-grade upload UI in 2 hours.

---

### 5.3 Journey 3 — Healthcare Document Workflow

**Actor:** Healthcare IT Architect (Dr. Priya)

```
Step 1: Configure Healthcare Project
  POST /v1/projects
  {
    "name": "clinical-documents",
    "compliance": {
      "profile": "healthcare",
      "hipaaControls": true,
      "phiDetection": true,
      "auditRetentionYears": 7
    },
    "metadata": {
      "schema": {
        "patientId": { "type": "string", "required": true },
        "encounterId": { "type": "string" },
        "documentType": {
          "type": "enum",
          "values": ["LabReport", "Discharge", "Consent", "Imaging"]
        }
      }
    }
  }

Step 2: Upload Clinical Document with FHIR Metadata
  POST /v1/files/upload
  {
    "filename": "discharge-summary.pdf",
    "metadata": {
      "patientId": "P-98765",
      "encounterId": "E-12345",
      "documentType": "Discharge"
    },
    "fhir": {
      "resourceType": "DocumentReference",
      "subject": { "reference": "Patient/P-98765" },
      "context": { "encounter": [{ "reference": "Encounter/E-12345" }] }
    }
  }

Step 3: System Automatically
  - Runs PHI detection scan
  - Extracts text via OCR
  - Creates FHIR DocumentReference resource
  - Indexes document for search
  - Records immutable audit log entry

Step 4: Retrieve as FHIR Resource
  GET /v1/fhir/DocumentReference/file_xyz
  // Returns valid FHIR R4 DocumentReference with Binary URL

Step 5: XDS Integration
  POST /v1/xds/provide-and-register
  // Registers document in connected XDS registry

Step 6: PHI Detection Result
  {
    "phiDetected": true,
    "entities": ["PatientName", "DateOfBirth", "MRN"],
    "action": "logged",
    "recommendation": "review_before_sharing"
  }
```

**Outcome:** Dr. Priya's team has a HIPAA-compliant document management system with FHIR integration.

---

### 5.4 Journey 4 — Compliance Officer Audit Export

**Actor:** Compliance Officer (Sandra)

```
Step 1: Request Audit Export
  GET /v1/audit/export?
    dateFrom=2026-01-01&
    dateTo=2026-03-31&
    events=file.uploaded,file.downloaded,file.deleted&
    format=csv

Step 2: Receive Signed Download URL
  {
    "exportId": "exp_abc123",
    "status": "generating",
    "estimatedSeconds": 30
  }

Step 3: Download Export
  GET /v1/audit/export/exp_abc123/download
  // Returns: CSV with columns:
  // timestamp, actor_id, actor_type, event_type, file_id,
  // file_name, ip_address, user_agent, metadata_snapshot

Step 4: Apply Legal Hold
  POST /v1/files/file_xyz/legal-hold
  {
    "reason": "SEC investigation 2026-CV-1234",
    "heldBy": "Sandra Okonkwo",
    "indefinite": true
  }
  // File cannot be deleted by any API call or retention policy

Step 5: Verify Retention Policy
  GET /v1/projects/proj_abc/policies/retention
  {
    "defaultRetentionDays": 2555,
    "deleteAfterExpiry": false,
    "archiveAfterDays": 365,
    "legalHoldOverridesRetention": true
  }
```

**Outcome:** Sandra has complete audit visibility and legal hold capability within the existing system.

---

## 6. Functional Requirements

### 6.1 File Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FM-01 | Upload files up to 5GB via chunked upload | P0 |
| FM-02 | Download files via time-limited signed URLs | P0 |
| FM-03 | Soft delete with configurable retention period | P0 |
| FM-04 | Hard delete after retention period expires | P0 |
| FM-05 | File versioning with full version history | P1 |
| FM-06 | Version rollback to any previous version | P1 |
| FM-07 | Folder creation and hierarchical organization | P1 |
| FM-08 | File move and copy across folders | P1 |
| FM-09 | Resumable uploads for network interruptions | P1 |
| FM-10 | Direct browser upload (bypass backend) | P2 |
| FM-11 | Multipart upload for parallel chunk processing | P1 |
| FM-12 | File preview generation (PDF, images) | P2 |
| FM-13 | Thumbnail generation for images | P2 |

### 6.2 Metadata Management

| ID | Requirement | Priority |
|----|-------------|----------|
| MD-01 | System metadata auto-extracted on upload | P0 |
| MD-02 | Custom metadata schema per project | P0 |
| MD-03 | Metadata validation against schema | P0 |
| MD-04 | Schema versioning and migration | P1 |
| MD-05 | Required field enforcement | P0 |
| MD-06 | Regex validation on string fields | P1 |
| MD-07 | Unique constraint enforcement | P1 |
| MD-08 | Default value support | P1 |
| MD-09 | Nested object support in schemas | P2 |
| MD-10 | Array field support | P2 |

### 6.3 Search

| ID | Requirement | Priority |
|----|-------------|----------|
| SR-01 | Full-text search across filenames | P0 |
| SR-02 | Metadata field search with filters | P0 |
| SR-03 | Tag-based search | P1 |
| SR-04 | OCR content search | P1 |
| SR-05 | Faceted search with aggregations | P1 |
| SR-06 | Pagination with cursor support | P0 |
| SR-07 | Sort by any indexed field | P1 |
| SR-08 | Saved search queries | P2 |
| SR-09 | Semantic search via embeddings | P3 |
| SR-10 | Cross-project search for admins | P2 |

### 6.4 Processing Pipelines

| ID | Requirement | Priority |
|----|-------------|----------|
| PP-01 | Virus/malware scanning on all uploads | P0 |
| PP-02 | MIME type validation and correction | P0 |
| PP-03 | Checksum generation and verification | P0 |
| PP-04 | OCR text extraction | P1 |
| PP-05 | PII detection and flagging | P1 |
| PP-06 | PHI detection (healthcare) | P1 |
| PP-07 | Document classification | P2 |
| PP-08 | AI embedding generation | P2 |
| PP-09 | Knowledge graph export | P3 |
| PP-10 | Preview and thumbnail generation | P2 |

### 6.5 Security

| ID | Requirement | Priority |
|----|-------------|----------|
| SEC-01 | API key authentication | P0 |
| SEC-02 | Service account authentication | P0 |
| SEC-03 | RBAC with 5 standard roles | P0 |
| SEC-04 | Project-scoped API keys | P0 |
| SEC-05 | API key expiration and rotation | P1 |
| SEC-06 | IP allowlist per project | P1 |
| SEC-07 | Allowed origins (CORS) configuration | P1 |
| SEC-08 | Signed URL generation with TTL | P0 |
| SEC-09 | Domain verification for trusted origins | P2 |
| SEC-10 | Encryption at rest (AES-256) | P0 |
| SEC-11 | TLS 1.3 in transit | P0 |
| SEC-12 | OAuth 2.0 support | P2 |

### 6.6 Audit and Compliance

| ID | Requirement | Priority |
|----|-------------|----------|
| AC-01 | Immutable audit log for all file operations | P0 |
| AC-02 | Audit log export (CSV, JSON) | P1 |
| AC-03 | Legal hold on individual files or folders | P1 |
| AC-04 | Configurable retention policies | P1 |
| AC-05 | WORM (Write Once Read Many) support | P2 |
| AC-06 | Audit log retention (configurable, up to 10 years) | P1 |
| AC-07 | Compliance profile presets | P1 |

### 6.7 Webhooks and Events

| ID | Requirement | Priority |
|----|-------------|----------|
| WH-01 | Webhook delivery for all file events | P0 |
| WH-02 | Webhook signature verification (HMAC-SHA256) | P0 |
| WH-03 | Automatic retries with exponential backoff | P1 |
| WH-04 | Dead letter queue for failed deliveries | P1 |
| WH-05 | Event subscription filtering | P1 |
| WH-06 | NATS message streaming | P1 |
| WH-07 | SQS event delivery | P2 |

---

## 7. Enterprise Requirements

### 7.1 Multi-Tenant Isolation

Every enterprise customer (Organization) must have complete isolation:

- **Logical isolation**: All database queries scoped by `organization_id` and `project_id`
- **Storage isolation**: Separate storage paths or separate buckets per organization
- **Search isolation**: Separate OpenSearch indexes per project
- **API isolation**: API keys are project-scoped and cannot cross project boundaries
- **Audit isolation**: Audit logs are scoped to organization and cannot be cross-read

### 7.2 BYOB — Bring Your Own Bucket

Enterprise customers may not be willing to store data in FileNest-managed storage. Requirements:

- Configure any S3-compatible bucket as the storage target for a project
- FileNest manages metadata, processing, and search — not raw storage
- FileNest rotates its own service credentials used to write to customer buckets
- Customer can revoke FileNest access at any time
- FileNest operations (signed URLs) are proxied so bucket details are never exposed to end-users

### 7.3 Data Residency

| Region | Requirement |
|--------|-------------|
| US | All data stored and processed in US-East or US-West only |
| EU | All data stored and processed in EU regions (GDPR) |
| India | All data stored within India (data localization laws) |
| Middle East | All data stored in UAE or Saudi Arabia regions |

Implementation:
- Project-level `data_residency_region` configuration
- Storage provider configured per region
- Processing workers co-located in the same region
- OpenSearch cluster in the same region
- Cross-region replication disabled by default, opt-in for DR only

### 7.4 SSO and Enterprise Identity

- SAML 2.0 integration for enterprise identity providers (Okta, Azure AD, Google Workspace)
- SCIM provisioning for user lifecycle management
- Just-in-time (JIT) user provisioning
- Role mapping from IdP groups to FileNest roles

### 7.5 SLA Requirements

| Tier | Uptime | Support Response |
|------|--------|------------------|
| Startup | 99.5% | 24 hours |
| Professional | 99.9% | 4 hours |
| Enterprise | 99.95% | 1 hour with dedicated CSM |
| Healthcare Enterprise | 99.99% | 30 minutes with on-call |

---

## 8. Healthcare Requirements

### 8.1 HIPAA Compliance Controls

When the healthcare capability pack is activated:

- All PHI fields must be identified and tagged
- PHI access must be logged with minimum necessary justification
- Audit retention minimum: 6 years from creation or last use
- Encryption key management via dedicated KMS (not shared keys)
- Business Associate Agreement (BAA) signed before access is granted

### 8.2 FHIR Integration

- FileNest files must be representable as FHIR R4 Binary, DocumentReference, and Media resources
- FHIR API endpoints expose read-only views of FileNest files as FHIR resources
- FHIR metadata mappings are configurable per project
- FileNest does not replace a FHIR server — it integrates with one

### 8.3 XDS Integration

- FileNest can act as an XDS Document Repository
- Supports `ProvideAndRegisterDocumentSet` operation
- Metadata fields map to XDS ebRIM metadata format
- Integration with external XDS registries via configuration

### 8.4 PHI Detection

- Automatic scanning of uploaded text documents for PHI entities
- Entity types detected: Name, DOB, SSN, MRN, Address, Phone, Email, NPI
- Actions on detection: `log`, `flag`, `quarantine`, `block` (configurable per project)
- PHI detection does not modify files — detection results are stored as metadata

### 8.5 DICOM Support

- Store DICOM files as binary blobs
- Extract DICOM header metadata (modality, patient ID, study UID)
- Associate DICOM studies with FileNest patient metadata
- Future: DICOM viewer integration, WADO-RS endpoint

---

## 9. Compliance Requirements

### 9.1 SOC 2 Type II

FileNest must support customer SOC 2 Type II certification by providing:

- Immutable audit trails covering all data operations
- Access control logs (who accessed what, when, from where)
- Change management logging (configuration changes)
- Encryption in transit and at rest
- Vulnerability scanning documentation

### 9.2 GDPR

- Right to erasure: File deletion triggered by data subject request
- Data portability: Export all files and metadata for an organization
- Data residency: EU data stays in EU (see Section 7.3)
- Consent tracking: Metadata fields for consent references
- Breach notification: Audit events available for breach detection

### 9.3 HIPAA

See Section 8.1. Additionally:

- Access controls limiting file access to authorized personnel
- Automatic logoff / session expiration
- Audit controls — hardware, software, procedural
- Transmission security for all PHI in transit

### 9.4 PCI DSS (Finance Mode)

- Files containing payment card data must be detected via PII engine
- Strict access logging for financial documents
- Retention policies aligned with PCI requirement 10.7 (12 months audit log)

---

## 10. Non-Functional Requirements

### 10.1 Performance

| Metric | Target |
|--------|--------|
| Upload API response time (session creation) | < 200ms p99 |
| Download signed URL generation | < 100ms p99 |
| Search query response time | < 500ms p99 |
| File metadata retrieval | < 50ms p99 |
| Upload throughput (per project) | 1 GB/s aggregate |
| Concurrent uploads (per project) | 10,000 simultaneous |

### 10.2 Scalability

| Dimension | Target |
|-----------|--------|
| Files per project | 500 million |
| Total platform files | 50 billion |
| Organizations | 100,000 |
| Projects per organization | 1,000 |
| API requests per second | 500,000 |
| Storage per project | 100 TB+ |

### 10.3 Availability

- Multi-region active-active for API layer
- Multi-AZ PostgreSQL with automatic failover
- Redis Cluster for distributed caching
- OpenSearch multi-node with replica shards
- RPO (Recovery Point Objective): 5 minutes
- RTO (Recovery Time Objective): 15 minutes

### 10.4 Durability

- File durability: 99.999999999% (11 nines) — inherited from S3/Azure/GCS
- Metadata durability: PostgreSQL with synchronous replication
- Audit log durability: Write-once S3 bucket with Object Lock

---

## 11. SaaS & Multi-Tenant Model

### 11.1 Tenant Hierarchy

```
Platform (FileNest)
└── Organization (Customer)
    ├── Projects
    │   ├── Environments (dev, staging, prod)
    │   ├── Files
    │   ├── Folders
    │   ├── Metadata Schemas
    │   ├── Processing Pipelines
    │   ├── Search Indexes
    │   ├── Compliance Profiles
    │   ├── API Keys
    │   ├── Service Accounts
    │   └── Webhooks
    ├── Users
    ├── Roles
    └── Billing
```

### 11.2 Isolation Strategy

**Database Level:**
- `organization_id` on all tenant-owned tables
- Row-level security (RLS) enforced in PostgreSQL
- Application-level tenant verification before every query
- No cross-tenant queries allowed at the ORM layer

**Storage Level:**
- Path prefix: `/{organization_id}/{project_id}/{environment_id}/{file_id}`
- Signed URLs generated with organization-specific keys
- BYOB uses completely separate buckets

**Search Level:**
- OpenSearch index name: `filenest-{project_id}`
- No cross-index queries in normal operation
- Admin-only multi-index search with explicit authorization

**API Level:**
- Every API key is scoped to exactly one project
- Bearer token carries `organization_id` and `project_id` claims
- Every middleware layer validates tenant context

### 11.3 Environments

Projects support three environments:

| Environment | Purpose | Notes |
|-------------|---------|-------|
| development | Local development and testing | Relaxed rate limits, no compliance enforcement |
| staging | Pre-production testing | Same rules as production, test data only |
| production | Live customer data | Full compliance, audit, retention enforced |

Each environment has separate:
- API keys
- Storage paths (or separate buckets)
- Search indexes
- Processing pipeline configurations
- Retention policies

---

## 12. Project Model

### 12.1 Project Configuration Schema

A Project is the fundamental unit of configuration in FileNest.

```json
{
  "projectId": "proj_abc123",
  "name": "patient-records",
  "organizationId": "org_xyz",
  "environment": "production",
  "config": {
    "storage": {
      "provider": "s3",
      "region": "us-east-1",
      "bucketName": "acme-patient-records",
      "byob": false,
      "encryption": "aws_kms",
      "keyId": "arn:aws:kms:..."
    },
    "security": {
      "allowedOrigins": ["https://app.acme.com"],
      "allowedIPs": [],
      "signedUrlTtlSeconds": 3600,
      "requireDomainVerification": true
    },
    "compliance": {
      "profile": "healthcare",
      "hipaaControls": true,
      "auditRetentionYears": 7,
      "legalHoldEnabled": true,
      "worm": false
    },
    "processing": {
      "virusScan": true,
      "ocr": true,
      "phiDetection": true,
      "piiDetection": false,
      "classification": true,
      "embeddingGeneration": false,
      "thumbnailGeneration": true
    },
    "metadata": {
      "schemaId": "schema_healthcare_v1",
      "enforceSchema": true
    },
    "search": {
      "enabled": true,
      "indexOcrContent": true,
      "facets": ["documentType", "patientId"]
    },
    "versioning": {
      "enabled": true,
      "maxVersions": 50,
      "retainAllVersions": false
    },
    "retention": {
      "defaultDays": 2555,
      "deleteOnExpiry": false,
      "archiveOnExpiry": true
    }
  }
}
```

### 12.2 Configuration Validation

All project configurations are validated against a JSON Schema before persistence. Invalid configurations are rejected with a detailed error response.

### 12.3 Configuration Change Management

- All configuration changes are versioned
- Audit log entry created for every change
- Changes to compliance settings require elevated permissions (admin role)
- Some changes (e.g., disabling WORM on a WORM-enabled project) are **irreversible by design**

### 12.4 Domain Selection Is Immutable After Project Creation

**Decision:** The compliance profile (domain) selected at project creation — `healthcare`, `finance`, `legal`, `insurance`, or `generic` — is locked once the project is created and any files have been uploaded.

**Rationale:** Switching domains after files exist creates an unresolvable data migration problem. Example: a project transitions from `generic` to `healthcare`. All previously uploaded files never had PHI detection run, were never audit-logged to HIPAA standards, and have no `retain_until` set. Retroactively applying HIPAA controls to existing files is not reliable — PHI may have already been exposed through unaudited downloads. Locking the domain at creation prevents this entire class of compliance gap.

**Implementation rules:**

| State | Allowed |
|-------|---------|
| Project created, no files uploaded | Domain change allowed |
| Project created, files exist | Domain change **blocked** |
| Any domain → same domain (no-op) | Allowed |
| Upgrading a compliance setting within the same domain (e.g., enabling WORM on healthcare) | Allowed |
| Downgrading a compliance setting within a domain (e.g., disabling audit retention) | Blocked for regulated profiles |

**API behavior:** `PATCH /v1/projects/{id}/config` returns `HTTP 422` with `error_code: profile_locked` if a domain change is attempted after files exist.

**Migration path for customers who need to change domain:** Create a new project with the desired domain and migrate files via the storage migration API. Document this in the dashboard with a clear warning when the customer first uploads a file.

---

## 13. Storage Model

### 13.1 Storage Providers

| Provider | Status | Notes |
|----------|--------|-------|
| AWS S3 | GA | Primary provider |
| Azure Blob Storage | GA | Full feature parity |
| Google Cloud Storage | GA | Full feature parity |
| MinIO | GA | Self-hosted / on-premise |
| Cloudflare R2 | GA | S3-compatible, no egress fees |

### 13.2 File Storage Path

```
/{organization_id}/{project_id}/{environment}/{year}/{month}/{file_id}/{version_id}/{original_filename}
```

Example:
```
/org_abc/proj_xyz/production/2026/06/file_abc123/v1/discharge-summary.pdf
```

### 13.3 Signed URL Strategy

FileNest **never** exposes permanent storage URLs. All downloads go through:

```
Client → FileNest API → Permission Check → Storage Provider → Signed URL → Client
```

Signed URLs:
- Time-limited (default 1 hour, configurable 1 min – 7 days)
- Single-use option for high-security environments
- IP-pinned option (signed URL only works from specific IP)
- Download count tracking
- Logged in audit trail on every access

### 13.4 BYOB Architecture

When `byob: true` on a project:

1. Customer provides their bucket ARN and grants FileNest a cross-account IAM role
2. FileNest stores `storage_external_config` in the project settings (encrypted)
3. All writes go to the customer bucket using the cross-account role
4. FileNest metadata and processing results are still stored in FileNest infrastructure
5. Signed URL generation uses customer's credentials, proxied through FileNest

---

## 14. Capability Packs

### 14.1 Pack Model

A capability pack is a **named configuration preset** that activates a set of features when applied to a project. Packs are not separate products — they are configuration templates.

### 14.2 Healthcare Pack

```yaml
name: healthcare
description: HIPAA-compliant document management with FHIR and XDS support
activates:
  compliance:
    hipaa_controls: true
    phi_detection: true
    audit_retention_years: 7
    immutable_audit: true
  processing:
    phi_detection: true
    ocr: true
    virus_scan: true
    classification: true
  metadata:
    required_fields: [patientId, documentType]
    schema_template: healthcare_v1
  integrations:
    fhir: true
    xds: false
    dicom: false
```

### 14.3 Finance Pack

```yaml
name: finance
description: Financial document management with retention and legal hold
activates:
  compliance:
    worm: true
    legal_hold: true
    retention_years: 7
    pci_controls: true
  processing:
    pii_detection: true
    classification: true
    virus_scan: true
  metadata:
    schema_template: finance_v1
```

### 14.4 Legal Pack

```yaml
name: legal
description: Legal document management with chain of custody
activates:
  compliance:
    legal_hold: true
    chain_of_custody: true
    immutable_audit: true
    retention_years: 10
  processing:
    ocr: true
    classification: true
  metadata:
    schema_template: legal_v1
```

### 14.5 Insurance Pack

```yaml
name: insurance
description: Insurance document management with compliance
activates:
  compliance:
    worm: true
    retention_years: 7
    immutable_audit: true
  processing:
    ocr: true
    pii_detection: true
    classification: true
  metadata:
    schema_template: insurance_v1
```

### 14.6 Generic Pack (Default)

```yaml
name: generic
description: Standard file management with no industry-specific controls
activates:
  compliance:
    retention_days: 365
  processing:
    virus_scan: true
  metadata:
    schema: {}
```

### 14.7 Config Dependency Validation (Generic Mode)

In Generic mode, all capabilities are available but must be manually enabled. Because Generic customers are self-configuring, partially enabling compliance features creates a false sense of security. FileNest must validate configuration dependencies and surface warnings when a feature is enabled without its required companions.

**Dependency map:**

| Feature Enabled | Required Companions | Warning Message if Missing |
|----------------|---------------------|-----------------------------|
| `phi_detection: true` | `audit_retention_years >= 6`, `immutable_audit: true` | "PHI detection is enabled but audit logs are not immutable and may not meet HIPAA §164.312(b). Enable Healthcare preset or manually configure audit controls." |
| `worm: true` | `retention_days` set, `legal_hold: true` | "WORM is enabled but no retention period is configured. Files will be write-protected indefinitely." |
| `legal_hold: true` | `immutable_audit: true` | "Legal hold is enabled but audit logs are not immutable, which may not satisfy evidentiary requirements." |
| `pii_detection: true` | No hard requirement, but warn if `audit_retention_years < 3` | "PII detection is active but audit records expire in less than 3 years." |

**Implementation:** The `ProjectConfigValidator` runs dependency checks on every `PATCH /v1/projects/{id}/config` call. Violations return `HTTP 200` with a `warnings[]` array in the response (not a blocking error, since Generic mode is intentionally flexible). Warnings are also surfaced in the dashboard UI before the customer saves.

```json
{
  "project": { "...": "..." },
  "warnings": [
    {
      "code": "phi_detection_without_hipaa_audit",
      "severity": "high",
      "message": "PHI detection is enabled but audit logs are not configured to HIPAA standards. Consider applying the Healthcare preset.",
      "suggested_fix": { "compliance": { "immutable_audit": true, "audit_retention_years": 7 } }
    }
  ]
}
```

### 14.8 Custom Packs (Enterprise)

Enterprise customers can define custom packs that mix capabilities:

```yaml
name: custom_healthcare_legal
base_packs: [healthcare, legal]
overrides:
  compliance:
    retention_years: 10
  processing:
    phi_detection: true
    pii_detection: true
```

---

## 15. Pricing Model Concepts

### 15.1 Pricing Dimensions

| Dimension | Metric |
|-----------|--------|
| Storage | GB stored per month |
| Bandwidth | GB transferred (downloads) |
| API Requests | Per 10,000 requests |
| Processing | Per file processed |
| Search | Per 10,000 queries |
| Seats | Per user (dashboard access) |

### 15.2 Tier Structure

**Starter (Self-Serve)**
- 50 GB storage
- 10 GB bandwidth/month
- 100,000 API requests/month
- Basic processing (virus scan only)
- No compliance profiles
- $49/month

**Professional**
- 500 GB storage
- 100 GB bandwidth/month
- 1M API requests/month
- Full processing pipeline
- Finance + Legal compliance profiles
- $299/month

**Enterprise**
- Custom storage limits
- Custom bandwidth
- Unlimited API requests
- Healthcare pack available
- BYOB support
- Data residency options
- SLA guarantee
- Custom pricing ($2K–$50K/month)

**Healthcare Enterprise**
- All Enterprise features
- BAA included
- HIPAA controls enforced
- PHI detection included
- Dedicated infrastructure option
- 99.99% SLA
- Custom pricing ($5K–$100K/month)

### 15.3 Overage Model

- Storage: $0.023/GB/month (same as S3 Standard)
- Bandwidth: $0.09/GB (waived for BYOB projects)
- Processing: $0.001/file processed
- API: $0.40 per million requests above plan

---

## 16. Out of Scope for v1

The following are explicitly deferred to v2 or later:

| Feature | Rationale |
|---------|-----------|
| DICOM viewer | Requires specialized rendering infrastructure |
| Semantic search via embeddings | Embeddings generated in v1; query support in v2 |
| Knowledge graph export | Requires graph database integration (built by separate team, integrated post-v1) |
| Custom pack marketplace | v2 feature |
| Mobile SDKs (iOS, Android) | v2 — Web SDK covers React Native |
| Real-time collaboration (co-editing) | Out of scope for file infrastructure |
| CDN caching for public files | v1 uses signed URLs only; CDN in v2 |
| SaaS billing integration (Stripe) | v1 has pricing model but no self-serve billing |
| ABAC (Attribute-Based Access Control) | RBAC in v1; ABAC in v2 |
| Geo-restriction enforcement | v2 enterprise feature |

### 16.1 v1 Domain Priority: Generic and Healthcare Only

**Decision:** v1 ships with two fully production-ready domains: **Generic** and **Healthcare**. Finance, Legal, and Insurance packs are defined in configuration but are **not GA in v1** — they are available in beta for early enterprise customers only.

**Rationale:** Attempting to get all five domain presets production-grade simultaneously in v1 stretches QA, compliance review, and customer success bandwidth too thin. Healthcare is the most demanding domain (HIPAA, FHIR, PHI detection) and the strongest differentiator. Nailing Healthcare in v1 proves the configuration-driven model works for the hardest case. The other domains follow naturally in v1.1.

**v1 domain status:**

| Domain | v1 Status | Target |
|--------|-----------|--------|
| Generic | GA | All customers |
| Healthcare | GA | Healthcare Enterprise tier |
| Finance | Beta (invite-only) | v1.1 GA |
| Legal | Beta (invite-only) | v1.1 GA |
| Insurance | Beta (invite-only) | v1.1 GA |

**What "beta" means in this context:** The configuration preset exists and all underlying capabilities (WORM, PII detection, retention, audit) are functional. What is not yet done for Finance/Legal/Insurance: end-to-end QA of the preset, compliance team sign-off on the default configuration, customer-facing documentation, and dedicated onboarding support.
| SCIM provisioning | v2 enterprise identity feature |
