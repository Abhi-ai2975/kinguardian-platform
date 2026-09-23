"""
app.core.crypto — AES-256-GCM encryption for sensitive storage credentials.

Credentials (access_key_id, secret_access_key, kms_key_id) are never stored
in plaintext. This module encrypts them to a binary blob before write and
decrypts on read. The key comes from settings.storage_encryption_key, which
must be a base64-encoded 32-byte value (generate with: openssl rand -base64 32).

Wire format: nonce (12 bytes) | ciphertext+tag (variable)

Usage:
    from app.core.crypto import encrypt_storage_credentials, decrypt_storage_credentials

    blob = encrypt_storage_credentials({"access_key_id": "AK...", "secret": "sk..."})
    data = decrypt_storage_credentials(blob)
"""
import base64
import json
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings
from app.errors import StorageError


def _get_key() -> bytes:
    if not settings.storage_encryption_key:
        raise StorageError(
            "STORAGE_ENCRYPTION_KEY is not configured",
            detail={"hint": "Set STORAGE_ENCRYPTION_KEY to a base64-encoded 32-byte value"},
        )
    try:
        key = base64.b64decode(settings.storage_encryption_key)
    except Exception as exc:
        raise StorageError("STORAGE_ENCRYPTION_KEY is not valid base64") from exc
    if len(key) != 32:
        raise StorageError(
            f"STORAGE_ENCRYPTION_KEY must decode to 32 bytes, got {len(key)}"
        )
    return key


def encrypt_storage_credentials(data: dict) -> bytes:
    """
    Encrypt a credentials dict to an AES-256-GCM binary blob.

    Args:
        data: Plaintext credentials dict (e.g. {"access_key_id": ..., "secret_access_key": ...}).

    Returns:
        Binary blob: nonce (12 bytes) + ciphertext + authentication tag (16 bytes).

    Raises:
        StorageError: If STORAGE_ENCRYPTION_KEY is missing or invalid.
    """
    key = _get_key()
    nonce = os.urandom(12)
    plaintext = json.dumps(data).encode()
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)
    return nonce + ciphertext


def decrypt_storage_credentials(blob: bytes) -> dict:
    """
    Decrypt a blob produced by encrypt_storage_credentials back to a dict.

    Args:
        blob: Binary blob from the database config_encrypted column.

    Returns:
        Plaintext credentials dict.

    Raises:
        StorageError: If decryption fails (wrong key, tampered data, etc.).
    """
    key = _get_key()
    nonce, ciphertext = blob[:12], blob[12:]
    aesgcm = AESGCM(key)
    try:
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    except Exception as exc:
        raise StorageError("Failed to decrypt storage credentials — key mismatch or tampered data") from exc
    return json.loads(plaintext)
