# Patient Registration & Account Linking

**Goal:** Allow patients to self-register on the portal and securely link their account to their existing `Patient` FHIR resource.

---

## The Identity Problem

A patient portal account is not the same as a `Patient` FHIR resource. The linkage must be:
- **Secure** — prevent one patient from accessing another's records
- **Verifiable** — confirm the person registering is who they claim to be
- **Reversible** — staff can delink an account if compromised

---

## Registration Flows

### Flow 1: Staff-Initiated (Invite Link)

Most common in clinical settings — front desk gives patient an invitation:

```
Staff sends invite:
  POST /portal/invitations
  { patient_fhir_id: 10001, email: "john.smith@example.com", expires_in_hours: 72 }
         ↓
Patient receives email with unique link:
  https://portal.example.org/register?token=abc123
         ↓
Patient creates account (email + password or Google SSO)
         ↓
Token verified → Patient.id linked to portal account
         ↓
Portal account active
```

### Flow 2: Self-Registration with Identity Verification

Patient registers on their own — requires matching against existing Patient record:

```
Patient enters: first name, last name, DOB, last 4 of SSN, zip code
         ↓
POST /portal/register/verify-identity
{
  first_name: "John", last_name: "Smith",
  birth_date: "1985-03-15",
  ssn_last4: "1234",
  zip_code: "94105"
}
         ↓
Identity service searches Patient records (Levenshtein fuzzy match)
         ↓
If match found AND confidence > 0.85:
  → Issue one-time code via patient's phone/email on file
  → Patient enters code to confirm
  → Account created and linked
If no match:
  → Prompt to contact front desk
```

---

## Portal Account Model

```sql
CREATE TABLE portal_account (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      BIGINT UNIQUE REFERENCES patient(id),     -- the linked FHIR Patient
    org_id          UUID NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    email_verified  BOOLEAN DEFAULT FALSE,
    phone           VARCHAR(20),
    phone_verified  BOOLEAN DEFAULT FALSE,
    password_hash   TEXT,                                      -- bcrypt, null if SSO-only
    sso_provider    VARCHAR(50),                               -- 'google', 'apple', 'microsoft'
    sso_subject     VARCHAR(255),
    status          VARCHAR(20) DEFAULT 'active',              -- active|suspended|locked
    mfa_enabled     BOOLEAN DEFAULT FALSE,
    mfa_secret      TEXT,                                      -- TOTP secret (Fernet encrypted)
    last_login_at   TIMESTAMPTZ,
    failed_login_count INTEGER DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE portal_invitations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      BIGINT NOT NULL REFERENCES patient(id),
    org_id          UUID NOT NULL,
    email           VARCHAR(255) NOT NULL,
    token           VARCHAR(64) UNIQUE NOT NULL,               -- random hex, hashed
    status          VARCHAR(20) DEFAULT 'pending',             -- pending|accepted|expired
    invited_by      VARCHAR NOT NULL,                          -- practitioner user_id
    expires_at      TIMESTAMPTZ NOT NULL,
    accepted_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Identity Verification Service

```python
# app/services/portal/identity_verifier.py

class IdentityVerifier:
    MATCH_THRESHOLD = 0.85      # confidence score required for match
    MAX_ATTEMPTS = 3            # lockout after 3 failed verifications

    async def verify(self, org_id: str, claim: dict) -> dict:
        """
        Match portal registration claim against existing Patient records.
        Returns best match with confidence score.
        """
        # Candidate search: DOB is exact (reduces search space)
        candidates = await self.patient_repo.find_by_dob(
            claim["birth_date"], org_id
        )

        best_match = None
        best_score = 0.0

        for candidate in candidates:
            score = self._score(claim, candidate)
            if score > best_score:
                best_score = score
                best_match = candidate

        if best_score >= self.MATCH_THRESHOLD:
            return {"match": True, "patient_id": best_match.patient_id, "confidence": best_score}
        return {"match": False, "confidence": best_score}

    def _score(self, claim: dict, patient) -> float:
        scores = []

        # Name similarity (Levenshtein)
        first_sim = jellyfish.jaro_winkler_similarity(
            claim["first_name"].lower(), (patient.given_name or "").lower()
        )
        last_sim = jellyfish.jaro_winkler_similarity(
            claim["last_name"].lower(), (patient.family_name or "").lower()
        )
        scores.append(first_sim * 0.3)
        scores.append(last_sim * 0.4)

        # SSN last 4 (exact match only — no fuzzy)
        if claim.get("ssn_last4") and patient.ssn_last4:
            scores.append(0.25 if claim["ssn_last4"] == patient.ssn_last4 else 0.0)

        # Zip code
        if claim.get("zip_code") and patient.address_postal_code:
            scores.append(0.05 if claim["zip_code"] == patient.address_postal_code else 0.0)

        return sum(scores)
```

---

## Portal JWT (Patient-Scoped)

Once linked, the patient gets a JWT with patient-scoped claims:

```python
def create_portal_token(portal_account: PortalAccount, patient: Patient) -> str:
    payload = {
        "sub": str(portal_account.id),          # portal account ID
        "patient_id": patient.patient_id,        # FHIR public ID
        "patient_internal_id": patient.id,       # DB internal ID (for queries)
        "org_id": str(patient.org_id),
        "role": "patient",                       # NOT practitioner
        "scope": "patient/*.read patient/Communication.write patient/Appointment.write",
        "iss": settings.IAM_ISSUER,
        "exp": datetime.utcnow() + timedelta(hours=8),
    }
    return jwt.encode(payload, settings.PORTAL_JWT_PRIVATE_KEY, algorithm="RS256")
```

The FHIR API reads `request.state.user["role"]` and `request.state.user["patient_id"]` to enforce patient-only access.

---

## MFA (TOTP) Setup

For patients who want extra security:

```python
@portal_router.post("/portal/mfa/setup")
async def setup_mfa(request: Request):
    account = request.state.portal_account
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(account.email, issuer_name="HealthPortal")

    # Store encrypted secret (not yet active until verified)
    await portal_account_repo.set_mfa_secret_pending(account.id, encrypt(secret))

    return {
        "qr_uri": provisioning_uri,   # patient scans this with authenticator app
        "secret": secret,             # backup for manual entry
    }

@portal_router.post("/portal/mfa/verify")
async def verify_mfa(request: Request, code: str = Body(...)):
    account = request.state.portal_account
    secret = decrypt(account.mfa_secret)
    totp = pyotp.TOTP(secret)
    if not totp.verify(code):
        raise HTTPException(400, "Invalid code")
    await portal_account_repo.activate_mfa(account.id)
    return {"mfa_active": True}
```

---

## Estimated Effort

| Component | Days |
|---|---|
| `portal_account` + `portal_invitations` tables | 0.5 |
| Staff invite flow + email delivery | 1.5 |
| Self-registration + identity verifier | 2 |
| Portal JWT issuer (patient-scoped) | 1 |
| Email/phone verification OTP | 1 |
| MFA (TOTP) | 1 |
| Account lockout + brute-force protection | 1 |
| **Total** | **8 days** |
