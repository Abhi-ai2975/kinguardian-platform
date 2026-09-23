# Remote Patient Monitoring (RPM) & IoT Device Integration

RPM is one of the fastest-growing areas in healthcare — driven by CMS reimbursement codes (CPT 99453–99458), value-based care programs, and the proliferation of consumer health devices.

---

## What Is RPM in an EMR Context?

RPM means the EMR continuously receives physiological data from devices the patient uses **outside the clinic** — CGMs, BP cuffs, pulse oximeters, weight scales, wearables — and that data flows into FHIR `Observation` resources where it can trigger alerts, feed AI models, and inform clinical decisions.

---

## Device Ecosystem

| Device Type | Examples | FHIR Impact |
|---|---|---|
| Continuous Glucose Monitor | Dexcom G7, Abbott Libre 3 | High-frequency Observation (every 5 min) |
| Blood Pressure Cuff | Omron, Withings | Observation (BP + HR) |
| Pulse Oximeter | Masimo, iHealth | Observation (SpO2, HR) |
| Smart Scale | Withings, Fitbit Aria | Observation (weight, BMI, body fat) |
| Wearable / Fitness | Apple Watch, Fitbit, Garmin | Observation (steps, sleep, HR, ECG) |
| Smart Inhaler | Propeller Health, Adherium | Observation (inhaler use, peak flow) |
| ECG Patch | iRhythm Zio, AliveCor | DiagnosticReport (arrhythmia detection) |
| Thermometer | Kinsa, Withings | Observation (body temperature) |

---

## Files in This Section

| File | Topic |
|---|---|
| [01-device-integration.md](./01-device-integration.md) | Apple HealthKit, Dexcom, FHIR Device resource, OAuth flows |
| [02-fhir-observations-at-scale.md](./02-fhir-observations-at-scale.md) | High-frequency data storage, time-series partitioning, LOINC codes |
| [03-rpm-alerts-automation.md](./03-rpm-alerts-automation.md) | Threshold alerts, care automation, CMS RPM billing codes |

---

## CMS RPM Billing Codes

| CPT | Description | Requirement |
|---|---|---|
| 99453 | Device setup + patient education | One-time per device |
| 99454 | Device supply + 16+ days data/month | Monthly |
| 99457 | RPM treatment management, 20+ min/month | Monthly (requires live interaction) |
| 99458 | Additional 20-min RPM management | Monthly add-on |
| 99091 | Physician review of device data, 30+ min/month | Monthly |

RPM can generate **$150–$200/patient/month** in additional revenue for qualifying chronic disease patients.
