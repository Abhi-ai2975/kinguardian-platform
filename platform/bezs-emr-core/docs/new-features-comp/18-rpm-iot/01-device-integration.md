# Device Integration — Apple HealthKit, Dexcom, Withings, FHIR Device

**FHIR R4 Resources:** `Device`, `DeviceMetric`, `Observation`  
**Key APIs:** Apple HealthKit API, Dexcom API, Withings API, Google Fit API

---

## FHIR Device Resource

Every physical device that generates patient data should be registered as a `Device` resource:

```json
POST /Device
{
  "resourceType": "Device",
  "identifier": [{ "system": "urn:oid:1.2.840.10004.1.1.1.0.0.1", "value": "DEXCOM-G7-SN-12345678" }],
  "status": "active",
  "manufacturer": "Dexcom",
  "deviceName": [{ "name": "Dexcom G7 CGM", "type": "manufacturer-name" }],
  "modelNumber": "G7",
  "type": { "coding": [{ "system": "http://snomed.info/sct", "code": "714428000", "display": "Continuous glucose monitor" }] },
  "patient": { "reference": "Patient/10001" },
  "serialNumber": "DEXCOM-G7-SN-12345678",
  "property": [
    { "type": { "coding": [{ "code": "sampling-interval" }] }, "valueQuantity": [{ "value": 5, "unit": "min" }] }
  ]
}
```

---

## Apple HealthKit Integration

Apple HealthKit is the most common source of patient-generated health data in the US — available on iPhone + Apple Watch for 100M+ users.

### OAuth Flow

```
Patient taps "Connect Apple Health" in patient portal
         ↓
App requests HealthKit authorization (on-device, never leaves phone):
  HKSampleType.quantityType(forIdentifier: .bloodGlucose)
  HKSampleType.quantityType(forIdentifier: .heartRate)
  HKSampleType.quantityType(forIdentifier: .bloodPressureSystolic)
  HKSampleType.quantityType(forIdentifier: .bodyMass)
  HKSampleType.quantityType(forIdentifier: .oxygenSaturation)
         ↓
Patient approves on iPhone
         ↓
App background-fetches HealthKit data
         ↓
POST /Observation (FHIR) with each reading
```

### HealthKit → FHIR Observation Mapping

```python
# app/services/rpm/healthkit_mapper.py

HEALTHKIT_TO_FHIR = {
    "HKQuantityTypeIdentifierBloodGlucose": {
        "code": {"coding": [{"system": "http://loinc.org", "code": "2339-0", "display": "Glucose [Mass/volume] in Blood"}]},
        "unit_conversion": lambda v: v * 18.0,  # mmol/L → mg/dL
        "value_unit": "mg/dL",
        "value_system": "http://unitsofmeasure.org",
        "value_code": "mg/dL",
    },
    "HKQuantityTypeIdentifierHeartRate": {
        "code": {"coding": [{"system": "http://loinc.org", "code": "8867-4", "display": "Heart rate"}]},
        "unit_conversion": lambda v: v,
        "value_unit": "beats/min",
        "value_code": "/min",
    },
    "HKQuantityTypeIdentifierBloodPressureSystolic": {
        "code": {"coding": [{"system": "http://loinc.org", "code": "8480-6", "display": "Systolic blood pressure"}]},
        "unit_conversion": lambda v: v,
        "value_unit": "mmHg",
        "value_code": "mm[Hg]",
    },
    "HKQuantityTypeIdentifierBloodPressureDiastolic": {
        "code": {"coding": [{"system": "http://loinc.org", "code": "8462-4", "display": "Diastolic blood pressure"}]},
        "unit_conversion": lambda v: v,
        "value_unit": "mmHg",
        "value_code": "mm[Hg]",
    },
    "HKQuantityTypeIdentifierBodyMass": {
        "code": {"coding": [{"system": "http://loinc.org", "code": "29463-7", "display": "Body weight"}]},
        "unit_conversion": lambda v: v * 0.453592,  # lb → kg
        "value_unit": "kg",
        "value_code": "kg",
    },
    "HKQuantityTypeIdentifierOxygenSaturation": {
        "code": {"coding": [{"system": "http://loinc.org", "code": "59408-5", "display": "Oxygen saturation in Arterial blood by Pulse oximetry"}]},
        "unit_conversion": lambda v: v * 100,  # 0.0-1.0 → 0-100%
        "value_unit": "%",
        "value_code": "%",
    },
    "HKQuantityTypeIdentifierStepCount": {
        "code": {"coding": [{"system": "http://loinc.org", "code": "55423-8", "display": "Number of steps in unspecified time Pedometer"}]},
        "unit_conversion": lambda v: v,
        "value_unit": "steps",
        "value_code": "{steps}",
    },
}

class HealthKitMapper:
    def map_sample(self, hk_sample: dict, patient_id: int, device_id: int) -> dict | None:
        hk_type = hk_sample.get("type")
        mapping = HEALTHKIT_TO_FHIR.get(hk_type)
        if not mapping:
            return None

        raw_value = hk_sample.get("value")
        converted_value = mapping["unit_conversion"](raw_value)

        return {
            "resourceType": "Observation",
            "status": "final",
            "category": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "vital-signs"}]}],
            "code": mapping["code"],
            "subject": {"reference": f"Patient/{patient_id}"},
            "device": {"reference": f"Device/{device_id}"},
            "effectiveDateTime": hk_sample.get("endDate"),
            "issued": hk_sample.get("metadata", {}).get("HKMetadataKeyTimeZone"),
            "valueQuantity": {
                "value": round(converted_value, 2),
                "unit": mapping["value_unit"],
                "system": "http://unitsofmeasure.org",
                "code": mapping["value_code"],
            },
        }
```

---

## Dexcom CGM Integration

Dexcom provides a real-time API for glucose readings every 5 minutes.

### OAuth Setup

```python
# app/services/rpm/dexcom_client.py

class DexcomClient:
    BASE_URL = "https://api.dexcom.com"
    SANDBOX_URL = "https://sandbox-api.dexcom.com"  # for testing
    SCOPES = "offline_access"

    async def get_auth_url(self, patient_id: int) -> str:
        """Generate Dexcom OAuth authorization URL."""
        state = await self._create_oauth_state(patient_id)
        return (
            f"{self.BASE_URL}/v2/oauth2/login"
            f"?client_id={settings.DEXCOM_CLIENT_ID}"
            f"&redirect_uri={settings.DEXCOM_REDIRECT_URI}"
            f"&response_type=code"
            f"&scope={self.SCOPES}"
            f"&state={state}"
        )

    async def exchange_code(self, code: str, state: str) -> dict:
        """Exchange authorization code for tokens. Store in device_credentials table."""
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{self.BASE_URL}/v2/oauth2/token", data={
                "client_id": settings.DEXCOM_CLIENT_ID,
                "client_secret": settings.DEXCOM_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": settings.DEXCOM_REDIRECT_URI,
            }) as resp:
                return await resp.json()

    async def fetch_egvs(self, access_token: str, start_date: str, end_date: str) -> list[dict]:
        """Fetch estimated glucose values (EGVs) from Dexcom API."""
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.BASE_URL}/v3/users/self/egvs",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"startDate": start_date, "endDate": end_date},
            ) as resp:
                data = await resp.json()
                return data.get("records", [])

    def egv_to_fhir_observation(self, egv: dict, patient_id: int, device_id: int) -> dict:
        """Convert a single Dexcom EGV reading to FHIR Observation."""
        value = egv.get("value")          # mg/dL
        trend = egv.get("trend")          # "flat", "rising", "risingRapidly", etc.

        obs = {
            "resourceType": "Observation",
            "status": "final",
            "category": [{"coding": [{"code": "vital-signs"}]}],
            "code": {"coding": [{"system": "http://loinc.org", "code": "99504-3", "display": "Glucose [Moles/volume] in Interstitial fluid by Continuous glucose monitoring"}]},
            "subject": {"reference": f"Patient/{patient_id}"},
            "device": {"reference": f"Device/{device_id}"},
            "effectiveDateTime": egv.get("systemTime"),
            "valueQuantity": {"value": value, "unit": "mg/dL", "system": "http://unitsofmeasure.org", "code": "mg/dL"},
        }
        if trend:
            obs["component"] = [{
                "code": {"coding": [{"system": "http://loinc.org", "code": "97135-7", "display": "Glucose trend"}]},
                "valueCodeableConcept": {"coding": [{"system": "http://dexcom.com/trend", "code": trend}]},
            }]
        return obs
```

---

## Device Credentials Storage

```sql
CREATE TABLE device_credentials (
    id              BIGSERIAL PRIMARY KEY,
    patient_id      BIGINT NOT NULL REFERENCES patient(id),
    org_id          UUID NOT NULL,
    device_type     VARCHAR(50) NOT NULL,   -- 'dexcom', 'withings', 'apple_health', 'fitbit'
    device_fhir_id  BIGINT REFERENCES device(id),
    access_token    TEXT NOT NULL,           -- encrypted at rest (Fernet)
    refresh_token   TEXT,
    token_expires_at TIMESTAMPTZ,
    scope           TEXT,
    connected_at    TIMESTAMPTZ DEFAULT NOW(),
    last_sync_at    TIMESTAMPTZ,
    sync_status     VARCHAR(20) DEFAULT 'active',   -- active|error|disconnected
    error_message   TEXT,
    UNIQUE (patient_id, device_type)
);
```

---

## Withings (Smart Scale + BP Cuff)

```python
class WithingsClient:
    BASE_URL = "https://wbsapi.withings.net"

    MEASURE_TYPES = {
        1: ("29463-7", "Body weight", "kg", 0.001),          # grams → kg
        4: ("8480-6", "Systolic blood pressure", "mmHg", 1),
        5: ("8462-4", "Diastolic blood pressure", "mmHg", 1),
        11: ("8867-4", "Heart rate", "/min", 1),
        54: ("59408-5", "Oxygen saturation", "%", 1),
        71: ("8310-5", "Body temperature", "Cel", 0.001),
    }

    async def fetch_measurements(self, access_token: str, since: int) -> list[dict]:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.BASE_URL}/measure", params={
                "action": "getmeas",
                "startdate": since,
                "category": 1,
            }, headers={"Authorization": f"Bearer {access_token}"}) as resp:
                data = await resp.json()
                return data.get("body", {}).get("measuregrps", [])
```

---

## Background Sync Job

```python
# app/tasks/rpm_sync.py

@celery.task
async def sync_all_devices():
    """Run every 15 minutes: pull latest readings from all connected devices."""
    active_creds = await device_credentials_repo.get_all_active()

    for cred in active_creds:
        try:
            await sync_device(cred)
        except Exception as e:
            await device_credentials_repo.mark_error(cred.id, str(e))

async def sync_device(cred: DeviceCredential):
    since = cred.last_sync_at or (datetime.utcnow() - timedelta(hours=24))
    client = get_device_client(cred.device_type)

    # Refresh token if expiring
    if cred.token_expires_at and cred.token_expires_at < datetime.utcnow() + timedelta(minutes=5):
        new_tokens = await client.refresh(cred.refresh_token)
        await device_credentials_repo.update_tokens(cred.id, new_tokens)
        cred.access_token = new_tokens["access_token"]

    # Fetch readings
    readings = await client.fetch_readings(cred.access_token, since)

    # Convert to FHIR Observations and bulk-insert
    observations = [client.to_fhir_observation(r, cred.patient_id, cred.device_fhir_id) for r in readings]
    if observations:
        await observation_service.bulk_create(observations, org_id=str(cred.org_id))
        await device_credentials_repo.update_last_sync(cred.id)
```

---

## Estimated Effort

| Component | Days |
|---|---|
| `Device` FHIR resource CRUD | 2 |
| Device credentials table + encryption | 1 |
| Apple HealthKit mapper + ingest endpoint | 2 |
| Dexcom OAuth + sync client | 2 |
| Withings OAuth + sync client | 2 |
| Background sync Celery job | 1 |
| Bulk Observation insert (time-series optimized) | 1 |
| **Total** | **11 days** |
