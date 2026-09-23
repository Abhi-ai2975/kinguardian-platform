# FileNest Architecture & Product Specification

## Overview

FileNest is a configurable, enterprise-grade file infrastructure platform that abstracts storage providers and provides:

- File upload/download APIs
- SDKs and UI components
- Metadata management
- Search and indexing
- Compliance profiles
- Processing pipelines
- Audit logging
- Governance
- AI-ready document ingestion
- Healthcare support (FHIR/XDS/DICOM)

## Core Principles

1. Configuration-driven platform
2. Multi-tenant architecture
3. Storage-provider agnostic
4. Enterprise security by default
5. Industry packs via configuration
6. API-first and SDK-first

---

# Architecture

Organization
- Projects
- Service Accounts
- API Keys
- Webhooks

Project
- Storage Configuration
- Metadata Schema
- Security Policies
- Compliance Profile
- Processing Pipelines
- Files
- Folders

---

# Technology Stack

## Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy
- PostgreSQL
- Redis
- Celery / Dramatiq
- RabbitMQ or NATS
- MinIO SDK / S3 SDK

## Search

- OpenSearch / Elasticsearch

## Object Storage

- AWS S3
- Azure Blob
- Google Cloud Storage
- Cloudflare R2
- MinIO

## Frontend

- Next.js
- React
- Tailwind
- TanStack Query

---

# Core Services

## Identity Service

Responsibilities:
- Organizations
- Users
- Roles
- API Keys
- Service Accounts

## Project Service

Responsibilities:
- Project creation
- Configuration management
- Compliance profiles

## File Service

Responsibilities:
- Upload
- Download
- Versioning
- Metadata

## Storage Service

Provider abstraction layer.

Interface:
- upload()
- download()
- delete()
- exists()
- generate_signed_url()

## Processing Service

Pipeline:
Upload
→ Virus Scan
→ Metadata Extraction
→ OCR
→ Classification
→ Indexing
→ Event Publishing

## Search Service

Search by:
- Filename
- Metadata
- Tags
- OCR content
- Extracted content

---

# Database Design

Tables:

- organizations
- projects
- users
- roles
- api_keys
- service_accounts
- files
- file_versions
- metadata_schemas
- webhooks
- audit_logs
- processing_jobs
- storage_configs
- compliance_profiles

---

# File Model

System Metadata:
- id
- filename
- mime_type
- checksum
- size
- storage_key
- storage_provider
- created_at

Custom Metadata:
Project-defined JSON schema.

Example:

{
  "patientId": "123",
  "documentType": "Lab Report"
}

---

# SDK Strategy

## Node SDK

- upload()
- download()
- search()
- delete()
- getFile()

## React SDK

Components:
- FileUpload
- FileExplorer
- FilePreview
- FileViewer

Hooks:
- useUpload()
- useFiles()
- useSearch()

## Next.js SDK

Support:
- Route Handlers
- Server Actions
- App Router

---

# Security

## Authentication

- API Keys
- Service Accounts
- OAuth (future)

## Authorization

RBAC:
- Admin
- Manager
- Editor
- Viewer

## Network Security

- Allowed Origins
- Allowed Domains
- Allowed IPs
- Domain Verification

## Encryption

At Rest:
- AES-256

In Transit:
- TLS 1.3

---

# Compliance Framework

## Generic

Default profile.

## Healthcare

Enable:
- HIPAA controls
- FHIR support
- XDS metadata
- PHI detection
- Extended audit retention

## Finance

Enable:
- WORM
- Retention policies
- Legal hold

## Legal

Enable:
- Chain of custody
- Evidence retention

---

# Healthcare Pack

FHIR Resources:

- DocumentReference
- Binary
- Media

Metadata:

- patientId
- encounterId
- practitionerId
- documentType

Support:

- XDS metadata
- DICOM storage
- Audit retention

---

# Processing Pipelines

Modules:

- Virus Scan
- OCR
- Metadata Extraction
- Thumbnail Generation
- Preview Generation
- PII Detection
- PHI Detection
- Classification
- Embedding Generation
- Knowledge Graph Export

---

# Search Architecture

OpenSearch indexes:

- Filename
- Metadata
- Tags
- OCR text
- Extracted content

Filters:

- createdAt
- tags
- metadata fields
- projectId

---

# Storage Abstraction

Providers:

- S3
- MinIO
- Azure Blob
- GCS
- Cloudflare R2

BYOB (Bring Your Own Bucket) supported.

---

# Events

Publish:

- file.uploaded
- file.deleted
- file.versioned
- file.shared
- file.processed
- file.indexed

Delivery:

- Webhooks
- NATS
- Kafka
- SQS

---

# Enterprise Features

- Versioning
- Soft Delete
- Retention Policies
- Legal Hold
- WORM Storage
- Data Residency
- Multi-region Replication
- Audit Export

---

# Recommended Microservices

1. Identity Service
2. Project Service
3. File Service
4. Storage Service
5. Processing Service
6. Search Service
7. Event Service
8. Audit Service
9. Compliance Service
10. Healthcare Service

---

# MVP Roadmap

Phase 1
- Organizations
- Projects
- Uploads
- Downloads
- Metadata
- API Keys
- SDKs
- Audit Logs

Phase 2
- Search
- OCR
- Virus Scan
- Processing Pipelines
- Service Accounts

Phase 3
- Healthcare Pack
- FHIR Integration
- XDS Metadata
- PHI Detection

Phase 4
- Legal Hold
- WORM
- Data Residency
- Enterprise Compliance

---

# Product Vision

FileNest is the infrastructure layer between applications and storage providers, delivering enterprise-grade file management, governance, compliance, metadata management, processing pipelines, search, and AI readiness through project-level configuration.
