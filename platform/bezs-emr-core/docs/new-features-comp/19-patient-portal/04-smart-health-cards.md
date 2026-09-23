# SMART Health Cards & SMART Health Links

**Spec:** https://spec.smarthealth.cards/  
**FHIR Operation:** `Patient/{id}/$health-cards-issue`  
**W3C Standard:** Verifiable Credentials Data Model

---

## What Are SMART Health Cards?

SMART Health Cards are **signed, verifiable, patient-held credentials** — QR codes a patient can present to anyone to prove a health fact without disclosing their entire medical record.

The COVID-19 vaccine QR codes many countries used were SMART Health Cards. The standard is now expanding to:
- Vaccination records (immunization history)
- Lab results (HIV status, COVID, blood type)
- Insurance cards
- Prescription records
- Allergy cards

---

## How They Work

```
Patient requests a SMART Health Card from portal
         ↓
Server generates a FHIR Bundle (Patient + Immunization records)
         ↓
Bundle is serialized to JWS (JSON Web Signature)
  - Signed with server's private key (RS256 or ES256)
  - Compressed (DEFLATE)
  - Encoded as QR code
         ↓
Patient saves to:
  - Apple Wallet / Google Wallet
  - Downloads as PDF with QR
  - Gets a link (SMART Health Link)
         ↓
Anyone scans the QR → verifies signature → sees health facts
```

---

## `$health-cards-issue` Operation

```python
# app/routers/operations/health_cards.py

@hc_router.post(
    "/Patient/{patient_id}/$health-cards-issue",
    operation_id="issue_health_cards",
    summary="Issue a SMART Health Card for the patient",
    description="Returns signed JWS (SMART Health Card) as a QR-encoded verifiable credential.",
)
async def issue_health_cards(
    patient_id: int,
    body: HealthCardIssueParams,
    request: Request,
    patient: Patient = Depends(resolve_patient),
):
    user = request.state.user

    # Supported credential types
    CREDENTIAL_TYPES = {
        "https://smarthealth.cards#immunization": _build_immunization_card,
        "https://smarthealth.cards#laboratory": _build_lab_card,
        "https://smarthealth.cards#covid19": _build_covid_card,
    }

    cards = []
    for vc_type in body.credential_types:
        builder = CREDENTIAL_TYPES.get(vc_type)
        if not builder:
            continue
        fhir_bundle = await builder(patient, user["activeOrganizationId"])
        jws = await sign_health_card(fhir_bundle, vc_type, patient)
        qr = generate_qr_code(jws)
        cards.append({
            "name": vc_type,
            "jws": jws,
            "qr_code_base64": qr,
        })

    return {"verifiableCredential": [c["jws"] for c in cards], "cards": cards}
```

---

## Signing a Health Card (JWS)

```python
# app/services/health_cards/signer.py

import jwt as pyjwt
import zlib
import base64
import json
from cryptography.hazmat.primitives.serialization import load_pem_private_key

class HealthCardSigner:
    def __init__(self):
        with open(settings.HEALTH_CARDS_PRIVATE_KEY_PATH, "rb") as f:
            self.private_key = load_pem_private_key(f.read(), password=None)
        self.key_id = settings.HEALTH_CARDS_KEY_ID   # published in JWKS endpoint

    async def sign(self, fhir_bundle: dict, vc_type: str, patient: Patient) -> str:
        """
        Create a JWS Compact Serialization (SMART Health Card).
        Spec: https://spec.smarthealth.cards/#health-cards-are-jws
        """
        # Minify the FHIR bundle (strip whitespace)
        bundle_str = json.dumps(fhir_bundle, separators=(",", ":"))

        # Build the Verifiable Credential payload
        vc_payload = {
            "iss": settings.FHIR_BASE_URL,          # our server is the issuer
            "nbf": int(datetime.utcnow().timestamp()),
            "vc": {
                "type": ["https://smarthealth.cards#health-card", vc_type],
                "credentialSubject": {
                    "fhirVersion": "4.0.1",
                    "fhirBundle": fhir_bundle,
                },
            },
        }

        # Compress payload (DEFLATE per SMART Health Cards spec)
        payload_bytes = json.dumps(vc_payload, separators=(",", ":")).encode()
        compressed = zlib.compress(payload_bytes, level=9)[2:-4]  # strip zlib header/checksum

        # Sign as JWS using ES256 (Elliptic Curve preferred by spec)
        header = {"alg": "ES256", "zip": "DEF", "kid": self.key_id}
        encoded_header = base64.urlsafe_b64encode(json.dumps(header).encode()).rstrip(b"=").decode()
        encoded_payload = base64.urlsafe_b64encode(compressed).rstrip(b"=").decode()
        signing_input = f"{encoded_header}.{encoded_payload}"

        signature = self.private_key.sign(
            signing_input.encode(),
            signature_algorithm=hashes.SHA256(),
        )
        encoded_sig = base64.urlsafe_b64encode(signature).rstrip(b"=").decode()

        return f"{signing_input}.{encoded_sig}"

    def generate_qr_code(self, jws: str) -> str:
        """
        Convert JWS to numeric QR code per SMART Health Cards spec.
        Characters are encoded as pairs of decimal digits.
        """
        import qrcode
        import io

        # SMART Health Cards QR encoding: 'shc:/' prefix + numeric encoding
        numeric = "shc:/" + "".join(str(ord(c) - 45).zfill(2) for c in jws)

        qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M)
        qr.add_data(numeric)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode()
```

---

## Immunization Card Bundle

```python
async def _build_immunization_card(patient: Patient, org_id: str) -> dict:
    """Build a minimal FHIR Bundle for immunization health card (no PII beyond name/DOB)."""
    immunizations = await immunization_repo.list(user_id=None, org_id=org_id, patient_id=patient.id)

    return {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
            {
                "fullUrl": f"resource:0",
                "resource": {
                    "resourceType": "Patient",
                    # Minimal PII per SMART Health Cards spec
                    "name": [{"family": patient.family_name, "given": [patient.given_name]}],
                    "birthDate": patient.birth_date.isoformat() if patient.birth_date else None,
                },
            },
            *[
                {
                    "fullUrl": f"resource:{i+1}",
                    "resource": {
                        "resourceType": "Immunization",
                        "status": "completed",
                        "vaccineCode": imm.vaccine_code or {},
                        "patient": {"reference": "resource:0"},
                        "occurrenceDateTime": imm.occurrence_datetime.isoformat() if imm.occurrence_datetime else None,
                        "lotNumber": imm.lot_number,
                        "performer": [{"actor": {"display": imm.performer_display}}],
                    },
                }
                for i, imm in enumerate(immunizations)
            ],
        ],
    }
```

---

## JWKS Endpoint (for Verification)

Anyone wanting to verify a card fetches the server's public keys:

```python
@hc_router.get("/.well-known/jwks.json")
async def get_jwks():
    """Public keys for SMART Health Card signature verification."""
    return {
        "keys": [{
            "kty": "EC",
            "kid": settings.HEALTH_CARDS_KEY_ID,
            "use": "sig",
            "alg": "ES256",
            "crv": "P-256",
            "x": settings.HEALTH_CARDS_PUBLIC_X,
            "y": settings.HEALTH_CARDS_PUBLIC_Y,
        }]
    }
```

---

## SMART Health Links

SMART Health Links extend Health Cards with a **shareable URL** — instead of a QR code the patient carries, they share a link that can be time-limited, password-protected, and revocable:

```python
@portal_router.post("/portal/health-links")
async def create_health_link(
    credential_types: list[str] = Body(...),
    expires_in_hours: int = Body(default=72),
    pin: str | None = Body(None),
    request: Request = ...,
):
    user = request.state.user
    key = secrets.token_bytes(32)   # symmetric encryption key
    label = "Health Records"
    manifest_url = f"{settings.FHIR_BASE_URL}/portal/health-links/{token}/manifest"

    # SHL URL format per spec
    shl_payload = {
        "url": manifest_url,
        "key": base64.urlsafe_b64encode(key).rstrip(b"=").decode(),
        "exp": int((datetime.utcnow() + timedelta(hours=expires_in_hours)).timestamp()),
        "flag": "P" if pin else "",  # P = PIN required
        "label": label,
    }
    shl_json = json.dumps(shl_payload, separators=(",", ":"))
    shl_url = "shlink:/" + base64.urlsafe_b64encode(shl_json.encode()).rstrip(b"=").decode()

    await health_link_repo.create({
        "patient_id": user["patient_id"],
        "token": token,
        "encryption_key": base64.b64encode(key).decode(),  # stored encrypted
        "credential_types": credential_types,
        "expires_at": datetime.utcnow() + timedelta(hours=expires_in_hours),
        "pin_hash": bcrypt.hash(pin) if pin else None,
    })

    return {"shl_url": shl_url, "expires_at": (datetime.utcnow() + timedelta(hours=expires_in_hours)).isoformat()}
```

---

## Estimated Effort

| Component | Days |
|---|---|
| `$health-cards-issue` operation | 2 |
| JWS signer + QR code generator | 2 |
| JWKS public key endpoint | 0.5 |
| Immunization + lab card bundle builders | 1.5 |
| SMART Health Links (sharable URL) | 2 |
| Key rotation process | 0.5 |
| **Total** | **8.5 days** |
