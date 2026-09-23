# FileNest v1.0 — Storage Abstraction Layer

**Version:** 1.0.0
**Status:** Approved for Engineering
**Last Updated:** 2026-06-15

---

## Table of Contents

1. [Storage Architecture Overview](#1-storage-architecture-overview)
2. [Provider Interface](#2-provider-interface)
3. [S3 Provider](#3-s3-provider)
4. [Azure Blob Provider](#4-azure-blob-provider)
5. [Google Cloud Storage Provider](#5-google-cloud-storage-provider)
6. [MinIO Provider](#6-minio-provider)
7. [Cloudflare R2 Provider](#7-cloudflare-r2-provider)
8. [RustFS Provider](#8-rustfs-provider)
9. [BYOB Architecture](#9-byob-architecture)
10. [Credential Schemas & Encryption](#10-credential-schemas--encryption)
11. [Storage Key Strategy](#11-storage-key-strategy)
12. [Migration Strategy](#12-migration-strategy)
13. [Replication Strategy](#13-replication-strategy)
14. [Failover Strategy](#14-failover-strategy)

---

## 1. Storage Architecture Overview

### 1.1 Abstraction Principle

The FileNest Storage Service is a thin abstraction layer. All storage providers implement the same interface. The application layer never knows which provider is being used.

```
File Service → StorageResolver → StorageProvider
                                  ├── S3Provider         (AWS S3)
                                  ├── AzureBlobProvider  (Azure Blob Storage)
                                  ├── GCSProvider        (Google Cloud Storage)
                                  ├── MinIOProvider      (self-hosted, S3-compatible)
                                  ├── CloudflareR2Provider
                                  └── RustFSProvider     (Rust-native S3-compatible, Docker-hosted)
```

### 1.2 Storage Modes

Every project operates in one of two storage modes:

| Mode | Description | Who manages the bucket |
|------|-------------|------------------------|
| `managed` | FileNest provides and manages the storage | FileNest |
| `byob` | Customer provides their own endpoint + credentials | Customer |

In both modes:
- **File metadata** (name, size, status, processing results, audit logs, legal holds) → always stored in FileNest's PostgreSQL
- **Actual file bytes** → stored in the configured storage target (managed or customer-owned)

```
┌─────────────────────────────────────────────────────┐
│  FileNest                                           │
│  ┌────────────────────────────────────────────────┐ │
│  │  PostgreSQL — metadata, audit, compliance, etc │ │
│  └────────────────────────────────────────────────┘ │
│  ┌─────────────────────┐   ┌──────────────────────┐ │
│  │  Managed storage    │   │  StorageResolver      │ │
│  │  (FileNest MinIO /  │◄──│  reads project mode  │ │
│  │   AWS S3 / R2)      │   │  → routes bytes to   │ │
│  └─────────────────────┘   │    correct target    │ │
└───────────────────────┬────└──────────────────────┘─┘
                        │              │
                        │      BYOB    ▼
                        │  ┌──────────────────────────┐
                        │  │  Customer-owned storage  │
                        │  │  (their MinIO, RustFS,   │
                        │  │   S3, Azure, GCS, R2)    │
                        │  └──────────────────────────┘
```

### 1.3 Provider Selection

Provider is selected at project configuration time:

```python
async def get_provider(
    project_id: str, environment: str
) -> StorageProvider:
    config = await get_storage_config(project_id, environment)

    if config.storage_mode == "managed":
        # Use FileNest platform defaults — no customer credentials needed
        return get_platform_provider(config.provider, environment)

    # BYOB — decrypt and use customer-supplied config
    provider_class = PROVIDERS[config.provider]
    provider_config = decrypt_config(config.config_encrypted)
    return provider_class(provider_config)
```

---

## 2. Provider Interface

### 2.1 Complete Interface

```python
from typing import Protocol, BinaryIO, AsyncIterator
from dataclasses import dataclass

@dataclass
class Part:
    part_number: int
    etag: str
    size: int | None = None

@dataclass
class ObjectMetadata:
    key: str
    size: int
    content_type: str
    etag: str
    last_modified: datetime
    metadata: dict[str, str]

class StorageProvider(Protocol):

    async def upload(
        self,
        key: str,
        data: BinaryIO | bytes,
        content_type: str,
        metadata: dict[str, str] | None = None,
        server_side_encryption: str | None = None,
        kms_key_id: str | None = None,
        object_lock_mode: str | None = None,      # 'COMPLIANCE' | 'GOVERNANCE'
        object_lock_retain_until: datetime | None = None,
        object_lock_legal_hold: bool = False,
    ) -> str: ...

    async def download_stream(
        self, key: str, range_start: int | None = None, range_end: int | None = None
    ) -> AsyncIterator[bytes]: ...

    async def download_to_bytes(self, key: str) -> bytes: ...

    async def delete(self, key: str) -> None: ...

    async def exists(self, key: str) -> bool: ...

    async def head(self, key: str) -> ObjectMetadata: ...

    async def copy(
        self, source_key: str, dest_key: str,
        dest_metadata: dict[str, str] | None = None
    ) -> str: ...

    async def move(self, source_key: str, dest_key: str) -> str: ...

    async def generate_signed_url(
        self,
        key: str,
        ttl_seconds: int,
        method: str = "GET",
        content_type: str | None = None,
        content_disposition: str | None = None,
        response_content_type: str | None = None,
    ) -> str: ...

    async def generate_multipart_upload_id(
        self, key: str, content_type: str,
        server_side_encryption: str | None = None,
        kms_key_id: str | None = None,
    ) -> str: ...

    async def generate_part_upload_url(
        self, key: str, upload_id: str, part_number: int
    ) -> str: ...

    async def complete_multipart(
        self, key: str, upload_id: str, parts: list[Part]
    ) -> str: ...

    async def abort_multipart(self, key: str, upload_id: str) -> None: ...

    async def list_objects(
        self, prefix: str, max_keys: int = 1000, continuation_token: str | None = None
    ) -> tuple[list[ObjectMetadata], str | None]: ...

    async def set_legal_hold(self, key: str, on: bool) -> None: ...

    async def get_object_size(self, key: str) -> int: ...

    async def health_check(self) -> bool: ...
```

---

## 3. S3 Provider

```python
# backend/app/storage/s3.py
import aiobotocore.session
from botocore.exceptions import ClientError

@dataclass
class S3Config:
    bucket_name: str
    region: str
    access_key_id: str
    secret_access_key: str
    endpoint_url: str | None = None         # For MinIO, LocalStack
    server_side_encryption: str | None = None  # 'AES256' | 'aws:kms'; None for Azure/GCS
    kms_key_id: str | None = None
    sse_enabled: bool = False   # when True, adds ServerSideEncryption header on PUT

class S3Provider:
    def __init__(self, config: S3Config):
        self.config = config
        self._session = aiobotocore.session.get_session()

    def _client_kwargs(self) -> dict:
        kwargs = {
            "region_name": self.config.region,
            "aws_access_key_id": self.config.access_key_id,
            "aws_secret_access_key": self.config.secret_access_key,
        }
        if self.config.endpoint_url:
            kwargs["endpoint_url"] = self.config.endpoint_url
        return kwargs

    async def upload(
        self, key: str, data: BinaryIO | bytes, content_type: str,
        metadata: dict | None = None, **kwargs
    ) -> str:
        async with self._session.create_client("s3", **self._client_kwargs()) as client:
            put_kwargs = {
                "Bucket": self.config.bucket_name,
                "Key": key,
                "Body": data,
                "ContentType": content_type,
            }

            if metadata:
                put_kwargs["Metadata"] = {k: str(v) for k, v in metadata.items()}

            if self.config.sse_enabled and self.config.server_side_encryption:
                put_kwargs["ServerSideEncryption"] = self.config.server_side_encryption
                if self.config.server_side_encryption == "aws:kms" and self.config.kms_key_id:
                    put_kwargs["SSEKMSKeyId"] = self.config.kms_key_id

            if kwargs.get("object_lock_mode"):
                put_kwargs["ObjectLockMode"] = kwargs["object_lock_mode"]
                put_kwargs["ObjectLockRetainUntilDate"] = kwargs["object_lock_retain_until"]

            if kwargs.get("object_lock_legal_hold"):
                put_kwargs["ObjectLockLegalHoldStatus"] = "ON"

            await client.put_object(**put_kwargs)
            return key

    async def download_stream(
        self, key: str, range_start: int | None = None, range_end: int | None = None
    ) -> AsyncIterator[bytes]:
        async with self._session.create_client("s3", **self._client_kwargs()) as client:
            get_kwargs = {"Bucket": self.config.bucket_name, "Key": key}
            if range_start is not None:
                range_end_str = str(range_end) if range_end else ""
                get_kwargs["Range"] = f"bytes={range_start}-{range_end_str}"

            response = await client.get_object(**get_kwargs)
            async for chunk in response["Body"].iter_chunked(65536):  # 64KB chunks
                yield chunk

    async def generate_signed_url(
        self,
        key: str,
        ttl_seconds: int,
        method: str = "GET",
        content_type: str | None = None,
        content_disposition: str | None = None,
        response_content_type: str | None = None,
    ) -> str:
        async with self._session.create_client("s3", **self._client_kwargs()) as client:
            params = {"Bucket": self.config.bucket_name, "Key": key}

            if method == "PUT" and content_type:
                params["ContentType"] = content_type
            if content_disposition:
                params["ResponseContentDisposition"] = content_disposition
            if response_content_type:
                params["ResponseContentType"] = response_content_type

            client_method = "get_object" if method == "GET" else "put_object"
            return await client.generate_presigned_url(
                client_method, Params=params, ExpiresIn=ttl_seconds
            )

    async def generate_multipart_upload_id(
        self, key: str, content_type: str, **kwargs
    ) -> str:
        async with self._session.create_client("s3", **self._client_kwargs()) as client:
            create_kwargs = {
                "Bucket": self.config.bucket_name,
                "Key": key,
                "ContentType": content_type,
            }
            if self.config.sse_enabled and self.config.server_side_encryption:
                create_kwargs["ServerSideEncryption"] = self.config.server_side_encryption
                if self.config.kms_key_id:
                    create_kwargs["SSEKMSKeyId"] = self.config.kms_key_id

            response = await client.create_multipart_upload(**create_kwargs)
            return response["UploadId"]

    async def generate_part_upload_url(
        self, key: str, upload_id: str, part_number: int
    ) -> str:
        async with self._session.create_client("s3", **self._client_kwargs()) as client:
            return await client.generate_presigned_url(
                "upload_part",
                Params={
                    "Bucket": self.config.bucket_name,
                    "Key": key,
                    "UploadId": upload_id,
                    "PartNumber": part_number,
                },
                ExpiresIn=3600,
            )

    async def complete_multipart(
        self, key: str, upload_id: str, parts: list[Part]
    ) -> str:
        async with self._session.create_client("s3", **self._client_kwargs()) as client:
            await client.complete_multipart_upload(
                Bucket=self.config.bucket_name,
                Key=key,
                UploadId=upload_id,
                MultipartUpload={
                    "Parts": [
                        {"PartNumber": p.part_number, "ETag": p.etag}
                        for p in sorted(parts, key=lambda x: x.part_number)
                    ]
                },
            )
            return key

    async def set_legal_hold(self, key: str, on: bool) -> None:
        async with self._session.create_client("s3", **self._client_kwargs()) as client:
            await client.put_object_legal_hold(
                Bucket=self.config.bucket_name,
                Key=key,
                LegalHold={"Status": "ON" if on else "OFF"},
            )
```

---

## 4. Azure Blob Provider

```python
from azure.storage.blob.aio import BlobServiceClient
from azure.storage.blob import (
    BlobSasPermissions, generate_blob_sas, ContentSettings
)

@dataclass
class AzureBlobConfig:
    account_name: str
    account_key: str
    container_name: str
    connection_string: str | None = None

class AzureBlobProvider:
    def __init__(self, config: AzureBlobConfig):
        self.config = config
        self.client = BlobServiceClient(
            account_url=f"https://{config.account_name}.blob.core.windows.net",
            credential=config.account_key,
        )
        self.container = self.client.get_container_client(config.container_name)

    async def upload(
        self, key: str, data: BinaryIO | bytes, content_type: str,
        metadata: dict | None = None, **kwargs
    ) -> str:
        blob_client = self.container.get_blob_client(key)
        content_settings = ContentSettings(content_type=content_type)

        await blob_client.upload_blob(
            data=data,
            overwrite=True,
            content_settings=content_settings,
            metadata=metadata,
        )
        return key

    async def generate_signed_url(
        self, key: str, ttl_seconds: int, method: str = "GET",
        content_disposition: str | None = None, **kwargs
    ) -> str:
        from datetime import timedelta, timezone

        permissions = BlobSasPermissions(read=True) if method == "GET" else BlobSasPermissions(write=True)
        expiry = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)

        sas_token = generate_blob_sas(
            account_name=self.config.account_name,
            container_name=self.config.container_name,
            blob_name=key,
            account_key=self.config.account_key,
            permission=permissions,
            expiry=expiry,
            content_disposition=content_disposition,
        )

        return (
            f"https://{self.config.account_name}.blob.core.windows.net/"
            f"{self.config.container_name}/{key}?{sas_token}"
        )
```

---

## 5. Google Cloud Storage Provider

```python
from google.cloud import storage as gcs
from google.oauth2 import service_account
import google.auth.transport.requests

@dataclass
class GCSConfig:
    project_id: str
    bucket_name: str
    service_account_key: dict    # Service account JSON key (decrypted)

class GCSProvider:
    def __init__(self, config: GCSConfig):
        self.config = config
        credentials = service_account.Credentials.from_service_account_info(
            config.service_account_key,
            scopes=["https://www.googleapis.com/auth/devstorage.full_control"],
        )
        self.client = gcs.Client(project=config.project_id, credentials=credentials)
        self.bucket = self.client.bucket(config.bucket_name)

    async def upload(
        self, key: str, data: BinaryIO | bytes, content_type: str, **kwargs
    ) -> str:
        blob = self.bucket.blob(key)
        await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: blob.upload_from_file(
                io.BytesIO(data) if isinstance(data, bytes) else data,
                content_type=content_type,
            )
        )
        return key

    async def generate_signed_url(
        self, key: str, ttl_seconds: int, method: str = "GET",
        content_disposition: str | None = None, **kwargs
    ) -> str:
        blob = self.bucket.blob(key)
        expiration = timedelta(seconds=ttl_seconds)

        url = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: blob.generate_signed_url(
                expiration=expiration,
                method=method,
                response_disposition=content_disposition,
                version="v4",
            )
        )
        return url
```

---

## 6. MinIO Provider

MinIO is S3-compatible, so it reuses the S3 provider with a custom endpoint:

```python
@dataclass
class MinIOConfig:
    endpoint_url: str           # http://minio:9000 or https://minio.acme.com
    access_key: str
    secret_key: str
    bucket_name: str
    region: str = "us-east-1"   # MinIO ignores region but SDK requires it
    use_ssl: bool = True

def create_minio_provider(config: MinIOConfig) -> S3Provider:
    return S3Provider(S3Config(
        bucket_name=config.bucket_name,
        region=config.region,
        access_key_id=config.access_key_id,
        secret_access_key=config.secret_access_key,
        endpoint_url=config.endpoint_url,
        sse_enabled=config.sse_enabled,   # togglable via PATCH /storage/sse; requires MINIO_KMS_SECRET_KEY on server
    ))
```

MinIO deployment in Kubernetes:

```yaml
# helm/templates/minio/statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: minio
spec:
  replicas: 4
  selector:
    matchLabels:
      app: minio
  template:
    spec:
      containers:
        - name: minio
          image: minio/minio:latest
          args: ["server", "/data", "--console-address", ":9001"]
          env:
            - name: MINIO_ROOT_USER
              valueFrom:
                secretKeyRef:
                  name: minio-credentials
                  key: access-key
            - name: MINIO_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: minio-credentials
                  key: secret-key
          volumeMounts:
            - name: data
              mountPath: /data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: "gp3"
        resources:
          requests:
            storage: 2Ti
```

---

## 7. Cloudflare R2 Provider

R2 is S3-compatible. Key differences:
- No egress fees (significant cost advantage for read-heavy workloads)
- No SSE-KMS (uses default encryption)
- Endpoint: `https://{account_id}.r2.cloudflarestorage.com`

```python
def create_r2_provider(config: CloudflareR2Config) -> S3Provider:
    return S3Provider(S3Config(
        bucket_name=config.bucket_name,
        region="auto",           # R2 uses 'auto' for region
        access_key_id=config.access_key_id,
        secret_access_key=config.secret_access_key,
        endpoint_url=f"https://{config.account_id}.r2.cloudflarestorage.com",
        sse_enabled=True,   # R2 encrypts all objects by default; sse_enabled locked to True at project creation
    ))
```

---

## 8. RustFS Provider

RustFS is a Rust-native S3-compatible object storage server. Customers run it on their own infrastructure and point FileNest at the endpoint URL. It is the recommended self-hosted provider for managed FileNest deployments.

### 8.1 RustFS Docker Setup (customer side)

```bash
# Typical RustFS Docker deployment (customer runs this)
docker run -d \
  -p 9000:9000 \    # S3-compatible API endpoint
  -p 9001:9001 \    # Web console (optional)
  -v /data:/data \
  rustfs/server:latest \
  --access-key YOUR_ACCESS_KEY \
  --secret-key YOUR_SECRET_KEY

# Customer then provides FileNest with:
#   API URL:     http://your-host:9000
#   Bucket:      files
#   Access key:  YOUR_ACCESS_KEY
#   Secret key:  YOUR_SECRET_KEY
```

### 8.2 RustFS Provider Implementation

RustFS is S3-compatible, so it reuses `S3StorageProvider` with a custom endpoint and `force_path_style=True` — identical pattern to MinIO:

```python
# backend/app/storage/resolver.py — managed RustFS branch
S3StorageProvider(
    endpoint_url=settings.rustfs_endpoint_url,
    access_key_id=settings.rustfs_access_key_id,
    secret_access_key=settings.rustfs_secret_access_key,
    bucket_name=bucket_name,
    region=settings.rustfs_region,
    force_path_style=True,   # required for RustFS path-style addressing
    sse_enabled=sse_enabled,
)
```

Env vars: `RUSTFS_ENDPOINT_URL`, `RUSTFS_ACCESS_KEY_ID`, `RUSTFS_SECRET_ACCESS_KEY`,
`RUSTFS_BUCKET_NAME`, `RUSTFS_REGION`, `RUSTFS_KMS_SECRET_KEY` (set on the RustFS server process).

### 8.3 Connection Verification

Before saving a RustFS (or any BYOB) config, FileNest verifies the endpoint is reachable and credentials are valid:

```python
async def verify_byob_connection(config: StorageConfig) -> VerificationResult:
    provider = build_provider(config)
    try:
        test_key = f"__filenest_verify_{uuid4().hex[:8]}"
        await provider.upload(test_key, b"verify", "text/plain")
        await provider.delete(test_key)
        return VerificationResult(ok=True)
    except Exception as e:
        return VerificationResult(ok=False, error=str(e))
```

---

## 9. BYOB Architecture

### 9.0 Dual-Mode Overview

When creating a project, the customer chooses a storage mode:

```
Project creation → storage.mode
├── "managed"  → zero config, FileNest manages the bucket (default)
└── "byob"     → customer provides their own storage endpoint
    ├── provider: "s3"         → AWS S3 (direct keys or IAM role assumption)
    ├── provider: "minio"      → self-hosted MinIO (endpoint URL + access key/secret)
    ├── provider: "rustfs"     → RustFS Docker instance (endpoint URL + access key/secret)
    ├── provider: "r2"         → Cloudflare R2 (access key/secret)
    ├── provider: "azure_blob" → Azure Blob (account name + account key)
    └── provider: "gcs"        → Google Cloud Storage (service account JSON)
```

Credential fields vary by provider family:

| Provider family | Required credential fields |
|----------------|---------------------------|
| `s3`, `minio`, `rustfs`, `r2` | `access_key_id`, `secret_access_key` (+ `endpoint_url` for minio/rustfs/r2) |
| `azure_blob` | `account_name`, `account_key` |
| `gcs` | `credentials_json` (full service account JSON string) |

FileNest verifies the connection before saving the config. File bytes go to the customer's endpoint. All metadata, audit logs, and processing results stay in FileNest's PostgreSQL.

### 9.1 BYOB Flow (S3-compatible — MinIO, RustFS)

```
Setup (one-time):
1. Customer stands up their storage (MinIO or RustFS via Docker)
2. Customer creates a bucket and generates an access key + secret
3. Customer enters endpoint URL, bucket, and credentials in the FileNest Console
   (under Project Settings → Storage)
4. FileNest verifies the connection (writes + deletes a test object)
5. FileNest stores encrypted credentials in storage_configs
6. Project is now active — all uploads go to the customer's endpoint

Runtime:
1. StorageResolver.build_provider(storage_config) reads storage_mode = "byob", provider = "minio"
2. Decrypts credentials from storage_configs.config_encrypted (AES-256-GCM)
3. Builds S3StorageProvider with customer's endpoint_url, access_key_id, secret_access_key
   — also passes sse_enabled from storage_configs.sse_enabled
4. Performs storage operation (presigned URL, upload, download, delete)
   — if sse_enabled=True, adds ServerSideEncryption: AES256 to PUT requests
```

### 9.2 BYOB Flow (AWS S3 — IAM role assumption)

```
Setup (one-time):
1. Customer creates S3 bucket in their AWS account
2. Customer creates IAM role:
   - Trust: allow FileNest AWS account to assume role
   - Permissions: s3:PutObject, s3:GetObject, s3:DeleteObject, s3:HeadObject,
                  s3:CreateMultipartUpload, s3:UploadPart, s3:CompleteMultipartUpload,
                  s3:AbortMultipartUpload, s3:GetObjectLegalHold, s3:PutObjectLegalHold
3. Customer provides FileNest with role ARN + external ID
4. FileNest stores encrypted credentials in storage_configs

Runtime:
1. StorageResolver loads project config
2. Detects storage_mode = "byob", provider = "s3"
3. Assumes customer role via STS AssumeRole
4. Creates S3 client with temporary credentials
5. Performs storage operation
6. Temporary credentials cached in Redis (15 min)
```

### 9.3 BYOB IAM Role Policy (AWS S3)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "FileNestBYOBAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::FILENEST_AWS_ACCOUNT_ID:role/FileNestServiceRole"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "{CUSTOMER_EXTERNAL_ID}"
        }
      }
    }
  ]
}
```

### 9.4 BYOB Credential Assumption (AWS S3)

```python
class BYOBCredentialManager:
    def __init__(self, redis: Redis):
        self.redis = redis
        self.sts = boto3.client("sts")

    async def get_assumed_credentials(
        self, role_arn: str, external_id: str, project_id: str
    ) -> dict:
        cache_key = f"byob_creds:{project_id}"
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)

        response = self.sts.assume_role(
            RoleArn=role_arn,
            RoleSessionName=f"filenest-{project_id[:8]}",
            ExternalId=external_id,
            DurationSeconds=3600,           # 1 hour
        )

        credentials = {
            "access_key_id": response["Credentials"]["AccessKeyId"],
            "secret_access_key": response["Credentials"]["SecretAccessKey"],
            "session_token": response["Credentials"]["SessionToken"],
            "expiration": response["Credentials"]["Expiration"].isoformat(),
        }

        # Cache for 55 minutes (5 min buffer before expiry)
        await self.redis.setex(cache_key, 3300, json.dumps(credentials))
        return credentials

    async def create_byob_provider(
        self, storage_config: StorageConfig, project_id: str
    ) -> S3Provider:
        byob_config = decrypt_config(storage_config.config_encrypted)
        creds = await self.get_assumed_credentials(
            role_arn=byob_config["role_arn"],
            external_id=byob_config["external_id"],
            project_id=project_id,
        )

        return S3Provider(S3Config(
            bucket_name=storage_config.bucket_name,
            region=storage_config.region,
            access_key_id=creds["access_key_id"],
            secret_access_key=creds["secret_access_key"],
            # Note: session_token passed via aiobotocore directly
        ))
```

---

## 10. Credential Schemas & Encryption

Each provider requires a different set of sensitive credentials. This section defines exactly what is stored in plaintext DB columns (safe to display in the console) versus what is encrypted in `config_encrypted` (never returned to clients).

### 10.1 Plaintext vs Encrypted Fields

Plaintext columns are stored as-is and safe to return in API responses. `config_encrypted` is
AES-256-GCM encrypted and **never** returned to clients. `sse_enabled` is a plaintext boolean
stored in `storage_configs` alongside routing fields.

| Provider | Plaintext columns | Encrypted JSON (`config_encrypted`) |
|----------|-------------------|-------------------------------------|
| **AWS S3 — direct keys (BYOB)** | `bucket_name`, `region`, `server_side_encryption`, `kms_key_id`, `sse_enabled` | `access_key_id`, `secret_access_key` |
| **AWS S3 — IAM role (BYOB)** | `bucket_name`, `region`, `sse_enabled` | `role_arn`, `external_id` |
| **Azure Blob** | `bucket_name` (container), `sse_enabled` | `account_name`, `account_key` |
| **GCS** | `bucket_name`, `sse_enabled` | `credentials_json` (full JSON string) |
| **MinIO** | `endpoint_url`, `bucket_name`, `region`, `sse_enabled` | `access_key_id`, `secret_access_key` |
| **Cloudflare R2** | `bucket_name`, `sse_enabled` | `access_key_id`, `secret_access_key` |
| **RustFS** | `endpoint_url`, `bucket_name`, `region`, `sse_enabled` | `access_key_id`, `secret_access_key` |
| **Managed (any)** | `bucket_name`, `region`, `sse_enabled` | *(empty — platform credentials from env)* |

`server_side_encryption` column: present only for S3-family; `NULL` for Azure Blob and GCS
(their encryption is always on and not configurable via FileNest).

`sse_enabled` defaults: `true` for s3 / r2 / azure_blob / gcs (set at project creation);
`false` for minio / rustfs (user can toggle via `PATCH /v1/projects/{id}/storage/sse`).

### 10.2 Encrypted JSON Schemas Per Provider

```python
# AWS S3 — IAM role assumption (recommended for AWS BYOB)
{
    "auth_method": "iam_role",
    "role_arn": "arn:aws:iam::123456789012:role/FileNestBYOBRole",
    "external_id": "filenest-ext-a1b2c3d4"          # unique per project, generated by FileNest
}

# AWS S3 — static credentials
{
    "auth_method": "static_keys",
    "access_key_id": "AKIAIOSFODNN7EXAMPLE",
    "secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
}

# Azure Blob Storage
{
    "account_name": "acmestorage",
    "account_key": "base64encodedkey=="
}

# Google Cloud Storage
# credentials_json is the full service account key file content, stored as a JSON string.
{
    "credentials_json": "{\"type\":\"service_account\",\"project_id\":\"acme-prod\",\"private_key_id\":\"abc123\",\"private_key\":\"-----BEGIN RSA PRIVATE KEY-----\\n...\",\"client_email\":\"filenest@acme-prod.iam.gserviceaccount.com\",\"client_id\":\"...\",\"auth_uri\":\"https://accounts.google.com/o/oauth2/auth\",\"token_uri\":\"https://oauth2.googleapis.com/token\"}"
}

# MinIO / RustFS (same schema, different endpoint_url)
{
    "access_key_id": "minioadmin",
    "secret_access_key": "minioadmin123"
}

# Cloudflare R2
{
    "access_key_id": "abc123",
    "secret_access_key": "xyz789secret"
}
```

### 10.3 Encryption Implementation

All sensitive credentials are encrypted with **AES-256-GCM** before being written to `config_encrypted`. A per-record encryption key is derived from the platform master key + the record's UUID so that a compromised record does not expose keys for other records.

```python
# backend/app/core/crypto.py
import os
import json
import secrets
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# 32-byte (256-bit) master key — set via STORAGE_CREDENTIAL_KEY env var
# Generate with: python -c "import secrets; print(secrets.token_hex(32))"
MASTER_KEY = bytes.fromhex(os.environ["STORAGE_CREDENTIAL_KEY"])


def _derive_record_key(record_id: str) -> bytes:
    """Derive a unique 256-bit key per storage_config record using HKDF."""
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=f"storage_config:{record_id}".encode(),
    )
    return hkdf.derive(MASTER_KEY)


def encrypt_credentials(record_id: str, credentials: dict) -> bytes:
    """
    Encrypt a credentials dict with AES-256-GCM.

    Output layout: [12-byte nonce][ciphertext+16-byte auth tag]
    The nonce is randomly generated per encrypt call — never reused.
    """
    key = _derive_record_key(record_id)
    nonce = secrets.token_bytes(12)          # 96-bit GCM nonce
    plaintext = json.dumps(credentials, separators=(",", ":")).encode()
    ciphertext = AESGCM(key).encrypt(nonce, plaintext, associated_data=record_id.encode())
    return nonce + ciphertext                # nonce prepended, not stored separately


def decrypt_credentials(record_id: str, blob: bytes) -> dict:
    """
    Decrypt a blob produced by encrypt_credentials.
    Raises InvalidTag if the blob was tampered with.
    """
    key = _derive_record_key(record_id)
    nonce, ciphertext = blob[:12], blob[12:]
    plaintext = AESGCM(key).decrypt(nonce, ciphertext, associated_data=record_id.encode())
    return json.loads(plaintext)
```

### 10.4 Key Management

| Phase | Approach | Where the key lives |
|-------|----------|---------------------|
| Phase 1 (local / staging) | Single platform master key | `STORAGE_CREDENTIAL_KEY` env var, loaded at startup |
| Phase 6 (production) | Envelope encryption via AWS KMS or HashiCorp Vault | Master key fetched from KMS/Vault at startup, cached in memory only |

Rules:
- `STORAGE_CREDENTIAL_KEY` is **never** logged, never written to disk, never returned in any API response
- Rotate the master key by: decrypting all records with the old key → re-encrypting with the new key → atomic swap (background migration job)
- The `associated_data` parameter in AES-GCM binds ciphertext to the specific record ID — copying `config_encrypted` from one row to another will fail decryption

### 10.5 What Is Never Stored / Returned

- Raw credentials are never stored unencrypted in any table column
- `config_encrypted` is never included in any API response — not even for superadmins
- Console UI shows only plaintext fields (`endpoint_url`, `bucket_name`, `region`) and a masked indicator ("Credentials saved ✓")
- Logs must never include credentials — the `StorageConfig` model's `__repr__` must mask `config_encrypted`

```python
class StorageConfig(Base):
    ...
    def __repr__(self):
        return (
            f"<StorageConfig id={self.id} provider={self.provider} "
            f"mode={self.storage_mode} bucket={self.bucket_name} "
            f"credentials=[REDACTED]>"
        )
```

---

## 11. Storage Key Strategy

### 9.1 Key Construction

```python
def build_storage_key(
    organization_id: str,
    project_id: str,
    environment: str,
    file_id: str,
    version_number: int,
    original_filename: str,
) -> str:
    """
    Build a deterministic, hierarchical storage key.

    Structure: {org}/{project}/{env}/{year}/{month}/{file_id}/{version}/filename
    Example:   org_abc/proj_xyz/production/2026/06/file_123/v1/discharge-summary.pdf
    """
    date_prefix = datetime.utcnow().strftime("%Y/%m")
    safe_filename = sanitize_filename(original_filename)

    return (
        f"{organization_id}/"
        f"{project_id}/"
        f"{environment}/"
        f"{date_prefix}/"
        f"{file_id}/"
        f"v{version_number}/"
        f"{safe_filename}"
    )

def sanitize_filename(filename: str) -> str:
    """Remove dangerous characters, limit length, handle unicode."""
    import unicodedata
    # Normalize unicode
    filename = unicodedata.normalize("NFKD", filename)
    # Remove null bytes
    filename = filename.replace("\x00", "")
    # Strip path separators
    filename = os.path.basename(filename)
    # Replace spaces with underscores
    filename = filename.replace(" ", "_")
    # Remove characters not safe for S3/storage
    filename = re.sub(r"[^\w\-.]", "_", filename)
    # Limit length
    name, ext = os.path.splitext(filename)
    if len(filename) > 200:
        filename = name[:200 - len(ext)] + ext
    return filename or "unnamed_file"
```

### 9.2 Key Properties

- **Organization prefix**: enables efficient lifecycle policies per org
- **Project prefix**: enables S3 Object Lock policies per project
- **Date prefix**: enables efficient time-range listing and archival
- **File ID**: UUID prevents enumeration and key collision
- **Version number**: supports version-specific operations
- **Filename at end**: human-readable in storage console

---

## 12. Migration Strategy

### 10.1 Provider Migration Flow

```
Scenario: Customer wants to migrate from FileNest-managed S3 to their own S3 (BYOB)

Step 1: Configure new storage target
  PATCH /v1/projects/{id}/config
  { "storage": { "byob": true, "roleArn": "arn:aws:...", "externalId": "..." } }
  → New config stored as PENDING (not active yet)

Step 2: Migrate existing files
  POST /v1/admin/storage/migrate
  { "projectId": "proj_abc", "dryRun": true }
  → Returns: { "filesToMigrate": 15420, "estimatedDuration": "45 minutes" }

Step 3: Execute migration (background job)
  POST /v1/admin/storage/migrate
  { "projectId": "proj_abc", "dryRun": false }
  → Triggers async migration job

Step 4: Monitor migration
  GET /v1/admin/storage/migrations/{migrationId}
  → { "status": "in_progress", "completed": 12000, "total": 15420, "errors": 0 }

Step 5: Cutover
  → After all files migrated and verified, activate new config
  → Old storage keys cleaned up (or left for manual deletion)
```

### 10.2 Migration Worker

```python
class StorageMigrationWorker:
    async def migrate_project(
        self, project_id: str, migration_id: str
    ) -> None:
        source_provider = await get_current_provider(project_id)
        target_provider = await get_new_provider(project_id)  # BYOB provider

        files = await file_repo.get_all(project_id)
        total = len(files)

        for i, file in enumerate(files):
            try:
                # Copy from source to target
                data = b"".join([chunk async for chunk in source_provider.download_stream(file.storage_key)])
                await target_provider.upload(
                    key=file.storage_key,
                    data=data,
                    content_type=file.mime_type,
                )

                # Verify copy
                target_head = await target_provider.head(file.storage_key)
                if target_head.size != file.size:
                    raise MigrationError(f"Size mismatch for {file.id}")

                # Update file record to point to new provider
                file.storage_provider = "s3_byob"

                await migration_repo.update_progress(
                    migration_id, completed=i + 1, total=total
                )

            except Exception as e:
                await migration_repo.record_error(migration_id, file.id, str(e))
                logger.error("migration_file_failed", file_id=file.id, error=str(e))
```

---

## 13. Replication Strategy

### 11.1 Cross-Region Replication

For DR (not active-active):

```python
class StorageReplicator:
    """Async replication from primary to secondary region."""

    async def replicate_on_upload(
        self, file: File, primary_provider: StorageProvider
    ) -> None:
        if not project_config.storage.replication_enabled:
            return

        secondary_provider = await get_secondary_provider(file.project_id)

        # Stream from primary to secondary
        source_stream = primary_provider.download_stream(file.storage_key)
        await secondary_provider.upload(
            key=file.storage_key,
            data=source_stream,
            content_type=file.mime_type,
        )

        # Record replication status
        file.replication_status = "replicated"
        file.replicated_at = datetime.utcnow()
```

For S3: AWS S3 Cross-Region Replication (CRR) handles this automatically for managed buckets.

---

## 14. Failover Strategy

### 12.1 Provider Health Check

```python
class StorageHealthChecker:
    async def check(self, provider: StorageProvider) -> HealthStatus:
        try:
            # Write a small test object
            test_key = f"__filenest_health_{uuid4().hex}"
            await provider.upload(
                key=test_key,
                data=b"healthcheck",
                content_type="text/plain",
            )
            await provider.delete(test_key)
            return HealthStatus(healthy=True, latency_ms=elapsed_ms)

        except Exception as e:
            return HealthStatus(
                healthy=False,
                error=str(e),
                latency_ms=elapsed_ms,
            )
```

### 12.2 Automatic Failover

For BYOB projects, if the customer bucket is unreachable, FileNest fails the upload with a clear error. Failover to FileNest-managed storage is NOT automatic (could violate data residency).

For FileNest-managed S3: AWS handles availability (99.99% SLA). No additional failover needed.

For self-hosted MinIO: deploy MinIO in distributed mode (4+ nodes) for automatic failover.
