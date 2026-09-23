# Data Encryption

---

## Encryption at Rest

### PostgreSQL Transparent Data Encryption

On AWS RDS, enable encryption at rest at the RDS instance level:

```
# Terraform / AWS Console
aws_db_instance.fhir {
  storage_encrypted = true
  kms_key_id = aws_kms_key.fhir_db.arn
}
```

For self-hosted PostgreSQL, use filesystem encryption:
```bash
# LUKS on Linux
cryptsetup luksFormat /dev/sdb
cryptsetup open /dev/sdb encrypted-data
mkfs.ext4 /dev/mapper/encrypted-data
# PostgreSQL data dir on encrypted volume
```

### Field-Level Encryption for Sensitive PHI

For the most sensitive fields (SSN, payment info), encrypt at the application level:

```python
# app/core/field_encryption.py

from cryptography.fernet import Fernet

class FieldEncryption:
    def __init__(self, key: bytes):
        self.fernet = Fernet(key)

    def encrypt(self, value: str) -> str:
        return self.fernet.encrypt(value.encode()).decode()

    def decrypt(self, encrypted: str) -> str:
        return self.fernet.decrypt(encrypted.encode()).decode()

field_enc = FieldEncryption(settings.PHI_ENCRYPTION_KEY)
```

Apply to SSN and payment info in models:

```python
class Patient(Base):
    # Store SSN encrypted
    _ssn_encrypted = Column("ssn", Text, nullable=True)

    @property
    def ssn(self) -> str | None:
        if self._ssn_encrypted:
            return field_enc.decrypt(self._ssn_encrypted)
        return None

    @ssn.setter
    def ssn(self, value: str | None):
        self._ssn_encrypted = field_enc.encrypt(value) if value else None
```

### S3 Bucket Encryption

All S3 buckets (bulk export, document storage) must use server-side encryption:

```python
s3_client.put_object(
    Bucket=BUCKET,
    Key=key,
    Body=content,
    ServerSideEncryption="aws:kms",
    SSEKMSKeyId=KMS_KEY_ID,
)
```

---

## Encryption in Transit

### TLS Configuration (Nginx/Traefik)

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    ssl_certificate /etc/ssl/fhir.crt;
    ssl_certificate_key /etc/ssl/fhir.key;
    
    # Only TLS 1.2 and 1.3
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # Strong cipher suites
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers on;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
    
    # Disable weak ciphers
    ssl_dhparam /etc/ssl/dhparams.pem;
}
```

### Database TLS

```
FHIR_DATABASE_URL=postgresql+asyncpg://user:pass@db:5432/fhir?ssl=require&sslcert=client.crt&sslkey=client.key&sslrootcert=ca.crt
```

### Redis TLS

```
REDIS_URL=rediss://user:pass@redis:6380/0
```

---

## Key Management

Use AWS KMS or HashiCorp Vault for key management:

```python
# app/core/key_manager.py

import boto3

class AWSKMSKeyManager:
    def __init__(self, key_id: str):
        self.kms = boto3.client("kms")
        self.key_id = key_id

    def encrypt(self, plaintext: str) -> str:
        response = self.kms.encrypt(KeyId=self.key_id, Plaintext=plaintext.encode())
        return base64.b64encode(response["CiphertextBlob"]).decode()

    def decrypt(self, ciphertext: str) -> str:
        blob = base64.b64decode(ciphertext)
        response = self.kms.decrypt(CiphertextBlob=blob)
        return response["Plaintext"].decode()
```

Key rotation: rotate field encryption keys annually via KMS automatic rotation.

---

## JWT Key Rotation

```python
# app/core/jwt_rotation.py

class JWTKeyRotationService:
    async def rotate_keys(self) -> None:
        """Generate new signing key pair, retire old one after token TTL expires."""
        new_key = rsa.generate_private_key(public_exponent=65537, key_size=4096)
        new_key_id = str(uuid.uuid4())

        # Add new key to JWKS (old key stays for validation of issued tokens)
        await self.key_store.add_key(new_key_id, new_key)
        await self.key_store.set_active_signing_key(new_key_id)

        # Schedule removal of old key after max token lifetime (24h)
        asyncio.create_task(self._retire_old_key(old_key_id, delay_seconds=86400))
```

---

## PHI in Logs

Ensure PHI never appears in application logs:

```python
# app/core/logging.py

PHI_FIELDS = {"name", "email", "phone", "address", "ssn", "dob", "birthDate", "identifier"}

class PHIScrubFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.args, dict):
            record.args = self._scrub(record.args)
        return True

    def _scrub(self, data: dict) -> dict:
        return {
            k: "[REDACTED]" if k in PHI_FIELDS else (self._scrub(v) if isinstance(v, dict) else v)
            for k, v in data.items()
        }

# Apply to all loggers
logging.getLogger().addFilter(PHIScrubFilter())
```

---

## Data at Rest — Backup Encryption

```bash
# PostgreSQL backup with encryption
pg_dump fhir-server | \
  openssl enc -aes-256-cbc -pbkdf2 -k "$BACKUP_KEY" | \
  aws s3 cp - s3://fhir-backups/$(date +%Y%m%d-%H%M%S).sql.enc

# Verify backup integrity
aws s3api head-object --bucket fhir-backups --key backup.sql.enc
```
