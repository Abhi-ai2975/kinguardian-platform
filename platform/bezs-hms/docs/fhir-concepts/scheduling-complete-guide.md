# FHIR Scheduling — Complete Guide

From Organisation setup to a confirmed Appointment booking.  
Covers every resource, why it exists, how it links, and what happens at each phase.

---

## Why this architecture exists

FHIR separates **who/what/where** (static setup) from **when** (dynamic availability)
from **bookings** (patient-specific events). This lets you:

- Add a new practitioner without touching any existing appointments
- Change a clinic's opening hours without cancelling slots
- Query "all free slots for GP services in July" without knowing which doctor will see you
- Support multi-resource scheduling (room + doctor + equipment all on one appointment)

The full resource chain from most general to most specific:

```
Organization  (the entity — clinic, hospital, lab)
  └── Location  (physical place — floor, room, branch)
        └── HealthcareService  (what is offered here — GP, Cardiology, Radiology)
              └── PractitionerRole  (a specific doctor doing that service at that org)
                    ├── Practitioner  (the doctor's global identity — name, qualifications)
                    └── Schedule  (a container for availability in a time period)
                          └── Slot  (a pre-generated individual bookable block)
                                └── Appointment  (the confirmed booking by a patient)
```

---

## Phase 1 — Admin Setup

### Step 1 — Create the Organisation

The top-level entity. Every patient, practitioner, location, and service belongs to one.

**Example:**
```json
{
  "id": 1,
  "name": "Greenfield Medical Centre",
  "type": "prov",
  "active": true,
  "identifier": "org-greenfield",
  "address": "42 Greenfield Road, Melbourne VIC 3000"
}
```

**Why it matters:** Every resource below this (location, service, practitioner role)
is scoped to this org. Multi-tenant isolation starts here.

---

### Step 2 — Create the Location

A physical place managed by the organisation. Can be nested (`partOf` another location —
e.g. "Room 3" inside "Ground Floor" inside "Greenfield Medical Centre").

**Example:**
```json
{
  "id": 10,
  "name": "Greenfield Clinic — Ground Floor",
  "status": "active",
  "managingOrganization": "Organization/1",
  "address": "42 Greenfield Road, Melbourne VIC 3000",
  "type": "OUTPT"
}
```

**Why it matters:** Slots and appointments are tied to a location. The patient knows
exactly where to go. The booking system can prevent double-booking the same room.

---

### Step 3 — Create the HealthcareService

Defines **what clinical service** is offered at a location by an organisation.
This is the entry point a patient sees when browsing available services.

**Example:**
```json
{
  "id": 100,
  "name": "General Practice Consultation",
  "active": true,
  "providedBy": "Organization/1",
  "location": ["Location/10"],
  "category": [{ "coding_code": "17", "coding_display": "General Practice" }],
  "type": [{ "coding_code": "57", "coding_display": "General Practice" }],
  "specialty": [{ "coding_code": "394814009", "coding_display": "General practice" }],
  "appointmentRequired": true,
  "availableTime": [
    { "daysOfWeek": ["mon","tue","wed","thu","fri"], "availableStartTime": "08:00", "availableEndTime": "18:00" }
  ],
  "comment": "Walk-in and appointment-based service"
}
```

> `availableTime` here is the **service's** operating hours (when the clinic is open).
> It is separate from a practitioner's personal availability.

**Why it matters:** Patients filter by HealthcareService to find what they need.
The booking flow starts here: "I need a GP consultation at Greenfield."

---

### Step 4 — Create the Practitioner

The clinician's **global identity** — name, qualifications, registration number.
Has no organisation context on its own. One practitioner can work at multiple organisations.

**Example:**
```json
{
  "id": 200,
  "name": "Dr. Sarah Chen",
  "qualification": "MBBS, FRACGP",
  "identifier": "ahpra-med-0012345",
  "gender": "female",
  "active": true
}
```

**Why it matters:** The Practitioner record is reused across organisations.
If Dr. Chen works at Greenfield on Mon/Wed and at another clinic on Fri,
she still has one Practitioner record — two PractitionerRoles.

---

### Step 5 — Create the PractitionerRole

Binds a Practitioner to an Organisation + Location + HealthcareService.
This is where **availability rules** (general working hours) are stored.

**Example:**
```json
{
  "id": 300,
  "practitioner": "Practitioner/200",
  "organization": "Organization/1",
  "location": ["Location/10"],
  "healthcareService": ["HealthcareService/100"],
  "specialty": [{ "coding_code": "394814009", "coding_display": "General practice" }],
  "availableTime": [
    {
      "daysOfWeek": ["mon","tue","wed","thu","fri"],
      "availableStartTime": "09:00",
      "availableEndTime": "17:00"
    }
  ],
  "notAvailable": [
    {
      "description": "Annual leave",
      "during": { "start": "2026-07-14", "end": "2026-07-18" }
    }
  ]
}
```

> **`availableTime` is NOT a bookable slot.**  
> It is a template/rule: "Dr. Chen is generally available Mon–Fri 09:00–17:00."  
> Individual bookable slots are generated from this rule in Phase 2.

**Why it matters:** Separates the general rule (stored here) from the actual bookable
blocks (Slots). You can change the rule without touching existing slots.

---

### Step 6 — Create the Schedule

A Schedule is a **container for availability** over a specific planning period
(e.g. July 2026). It does not hold slots directly — it is the parent that slots attach to.

The `actor[]` array is the key field: it lists **every resource** whose availability
this schedule represents. A single schedule can include multiple actors.

**Example:**
```json
{
  "id": 400,
  "active": true,
  "serviceType": [{ "coding_code": "57", "coding_display": "General Practice" }],
  "specialty": [{ "coding_code": "394814009", "coding_display": "General practice" }],
  "actor": [
    { "reference": "PractitionerRole/300" },
    { "reference": "Location/10" }
  ],
  "planningHorizon": {
    "start": "2026-07-01T00:00:00",
    "end":   "2026-07-31T23:59:59"
  },
  "comment": "Dr. Chen GP slots — July 2026"
}
```

**Supported actor types:**

| Actor type | What it means |
|---|---|
| `PractitionerRole` | A specific doctor in their role at this org |
| `Practitioner` | The doctor directly (less common) |
| `Location` | A room or physical space |
| `HealthcareService` | A service itself (e.g. for service-level schedules) |
| `Device` | Equipment (MRI machine, operating table) |
| `Patient` | Patient-managed schedule (rare) |
| `RelatedPerson` | Carer availability (rare) |

**Why it matters:** By listing both PractitionerRole and Location as actors,
you enforce that **Dr. Chen must be available AND Room 3 must be free** for a slot
to exist. If the room is double-booked, the slot generation knows not to create it.

---

## Phase 2 — Slot Generation (Admin or Automated Job)

This step converts the **general availability rule** (PractitionerRole.availableTime)
into **individual bookable blocks** (Slots) for the Schedule's planning period.

### How it works

The slot generator receives:
1. The Schedule (`planningHorizon`, `actor[]`)
2. The PractitionerRole's `availableTime` rule
3. The PractitionerRole's `notAvailable` exceptions
4. A chosen slot duration (e.g. 30 minutes)

It then walks through every day in the planning period and creates a Slot
for each time window within the available hours.

### Example: generating slots for Monday 6 July 2026

PractitionerRole rule: Mon–Fri 09:00–17:00, slot duration: 30 min  
That gives 16 slots per day (8 hours × 2 per hour):

```
Slot/501  →  2026-07-06 09:00–09:30   status: free
Slot/502  →  2026-07-06 09:30–10:00   status: free
Slot/503  →  2026-07-06 10:00–10:30   status: free
Slot/504  →  2026-07-06 10:30–11:00   status: free
Slot/505  →  2026-07-06 11:00–11:30   status: free
Slot/506  →  2026-07-06 11:30–12:00   status: free
Slot/507  →  2026-07-06 12:00–12:30   status: free
Slot/508  →  2026-07-06 12:30–13:00   status: free
Slot/509  →  2026-07-06 13:00–13:30   status: free
Slot/510  →  2026-07-06 13:30–14:00   status: free
...
Slot/516  →  2026-07-06 16:30–17:00   status: free
```

Slots for 14–18 July are skipped entirely (notAvailable / annual leave).

**Slot structure:**
```json
{
  "id": 501,
  "schedule": "Schedule/400",
  "serviceType": [{ "coding_code": "57", "coding_display": "General Practice" }],
  "start": "2026-07-06T09:00:00",
  "end":   "2026-07-06T09:30:00",
  "status": "free",
  "comment": "Dr. Chen — Mon 6 Jul 09:00"
}
```

**Slot status values:**

| Status | Meaning |
|---|---|
| `free` | Available to book |
| `busy` | Confirmed appointment exists |
| `busy-tentative` | Appointment proposed but not confirmed |
| `busy-unavailable` | Blocked manually (e.g. lunch break, admin) |
| `entered-in-error` | Slot should be ignored |

> **Critical:** No slot is created at patient booking time.  
> All slots already exist in the database before any patient searches.  
> Booking simply claims one of these pre-existing `free` slots.

---

## Phase 3 — Patient Booking Flow

### Step 1 — Patient selects a service entry point

The patient (or booking UI) picks:
- Organisation: Greenfield Medical Centre
- Location: Ground Floor
- Service: General Practice Consultation

This resolves to `HealthcareService/100`.

---

### Step 2 — Find PractitionerRoles for the service

Query PractitionerRoles where:
- `organization = Organization/1`
- `location = Location/10`
- `healthcareService = HealthcareService/100`

Returns: `[PractitionerRole/300]` → Dr. Sarah Chen at Greenfield

If multiple doctors offer the same service at the same location, you get multiple
PractitionerRoles back. The patient may pick a specific doctor or see all availability.

---

### Step 3 — Find Schedules for those PractitionerRoles

Query Schedules where `actor` includes `PractitionerRole/300`.

Returns: `[Schedule/400]` — July 2026 schedule for Dr. Chen.

---

### Step 4 — Find free Slots

Query Slots where:
- `schedule = Schedule/400`
- `status = free`
- `start >= today`

Optionally filter by `serviceType` if the patient selected a specific appointment mode.

Returns: all the `free` slots from July 2026 that haven't been booked yet.

---

### Step 5 — Patient picks a Slot

The booking UI shows a calendar. Patient picks: **Monday 6 July at 09:00**.

That resolves to `Slot/501`.

**The Practitioner is derived at this point — never searched directly:**

```
Slot/501
  → schedule: Schedule/400
      → actor[]: PractitionerRole/300
                   → practitioner: Practitioner/200  (Dr. Sarah Chen)
```

The patient did not search for "Dr. Chen" — they searched for a service,
and the practitioner was resolved through the slot chain.

---

### Step 6 — Create the Appointment

```json
{
  "id": 9000,
  "status": "booked",
  "appointmentType": {
    "coding": [{ "code": "CHECKUP", "display": "Regular checkup" }]
  },
  "serviceType": [
    { "coding": [{ "code": "57", "coding_display": "General Practice" }] }
  ],
  "serviceCategory": [
    { "coding": [{ "code": "17", "coding_display": "General Practice" }] }
  ],
  "specialty": [
    { "coding": [{ "code": "394814009", "coding_display": "General practice" }] }
  ],
  "slot": [{ "reference": "Slot/501" }],
  "start": "2026-07-06T09:00:00",
  "end":   "2026-07-06T09:30:00",
  "comment": "Annual GP checkup",
  "participant": [
    { "actor": { "reference": "Patient/p1",                "display": "Alice Brown" },    "status": "accepted"     },
    { "actor": { "reference": "Practitioner/200",          "display": "Dr. Sarah Chen" }, "status": "needs-action" },
    { "actor": { "reference": "Location/10",               "display": "Ground Floor" },   "status": "accepted"     },
    { "actor": { "reference": "HealthcareService/100",     "display": "General Practice Consultation" }, "status": "accepted" }
  ]
}
```

**Participant statuses:**

| Status | Meaning |
|---|---|
| `accepted` | Confirmed attendance |
| `needs-action` | Awaiting practitioner confirmation |
| `declined` | Declined (used for cancellations) |
| `tentative` | Provisionally accepted |

---

### Step 7 — Update Slot status

Immediately after the Appointment is created, the Slot's status is updated:

```json
{
  "id": 501,
  "status": "busy"
}
```

No other patient can book `Slot/501`. The `Slot.status` field is the booking lock.

> The Slot's `serviceType` does **not** change — it was stamped at creation time
> to declare what kind of appointments it accepts. Only `status` changes.
> The `appointmentType` (CHECKUP, FOLLOWUP, etc.) lives on the Appointment, not the Slot.

---

## Full Example — Complete Resource Map

```
Organization/1  (Greenfield Medical Centre)
    │
    └── Location/10  (Ground Floor)
    │       managingOrganization → Organization/1
    │
    └── HealthcareService/100  (General Practice Consultation)
    │       providedBy → Organization/1
    │       location   → [Location/10]
    │
    └── Practitioner/200  (Dr. Sarah Chen)
    │
    └── PractitionerRole/300  (Dr. Chen @ Greenfield)
    │       practitioner       → Practitioner/200
    │       organization       → Organization/1
    │       location           → [Location/10]
    │       healthcareService  → [HealthcareService/100]
    │       availableTime      → Mon–Fri 09:00–17:00
    │       notAvailable       → 14–18 Jul 2026
    │
    └── Schedule/400  (Dr. Chen — July 2026)
            actor[]            → [PractitionerRole/300, Location/10]
            planningHorizon    → 2026-07-01 to 2026-07-31
            │
            ├── Slot/501  2026-07-06 09:00–09:30  status: busy (booked)
            ├── Slot/502  2026-07-06 09:30–10:00  status: free
            ├── Slot/503  2026-07-06 10:00–10:30  status: free
            │   ...
            └── Slot/516  2026-07-06 16:30–17:00  status: free

Appointment/9000
    slot        → [Slot/501]
    start/end   → 2026-07-06 09:00–09:30
    participant → Patient/p1, Practitioner/200, Location/10, HealthcareService/100
```

---

## Key Distinctions

### PractitionerRole.availableTime vs Slot

| | PractitionerRole.availableTime | Slot |
|---|---|---|
| **What it is** | General rule / template | Individual bookable block |
| **When set** | At PractitionerRole creation (admin) | Generated for a planning period (admin or job) |
| **Granularity** | Day name + hour range | Exact ISO datetime start + end |
| **Used for** | Input to slot generation; display of working hours | Actual booking target |
| **Status** | No status | free / busy / busy-unavailable / busy-tentative |
| **Changes at booking** | Never | status → busy |

### HealthcareService.availableTime vs PractitionerRole.availableTime

| | HealthcareService.availableTime | PractitionerRole.availableTime |
|---|---|---|
| **Who it describes** | The service / clinic itself | A specific doctor in a role |
| **Example** | "Clinic is open Mon–Sat 08:00–18:00" | "Dr. Chen works Mon–Fri 09:00–17:00" |
| **Used to generate slots** | No | Yes |
| **Purpose** | Display / filtering to the patient | Input to slot generation |

### appointmentType vs serviceType

| | appointmentType | serviceType |
|---|---|---|
| **Where it lives** | Appointment resource | Slot + Schedule + HealthcareService |
| **What it means** | Mode of the visit (CHECKUP, WALKIN, FOLLOWUP) | What clinical service this is (GP, Cardiology) |
| **When it is set** | At booking by the patient | At setup by the admin |

---

## Appointment Status Lifecycle

```
proposed → pending → booked → fulfilled
                 ↘         ↘
               cancelled   noshow
```

| Status | When |
|---|---|
| `proposed` | Initial request, not confirmed |
| `pending` | Waiting for practitioner confirmation |
| `booked` | Fully confirmed |
| `arrived` | Patient checked in |
| `fulfilled` | Appointment completed |
| `cancelled` | Cancelled by patient or clinic |
| `noshow` | Patient did not attend |

When status moves to `cancelled` or `noshow`, the Slot's status should be
reset to `free` so it can be rebooked by another patient.

---

## appointmentType codes

Source: `http://terminology.hl7.org/CodeSystem/v2-0276`

| Code | Display |
|---|---|
| `ROUTINE` | Routine appointment |
| `WALKIN` | Walk-in, no prior booking |
| `CHECKUP` | Regular checkup |
| `FOLLOWUP` | Follow-up visit |
| `EMERGENCY` | Emergency |

---

## Summary: Who does what

| Phase | Actor | Action |
|---|---|---|
| Setup | Admin | Creates Organisation, Location, HealthcareService |
| Setup | Admin | Creates Practitioner, PractitionerRole (with availableTime rules) |
| Setup | Admin | Creates Schedule (planningHorizon + actor[]) |
| Slot generation | Admin / Job | Reads Schedule + PractitionerRole.availableTime → creates free Slots |
| Booking | Patient | Selects service → browsed free Slots → picks one |
| Booking | System | Creates Appointment, updates Slot.status → busy |
| Post-visit | Practitioner / System | Updates Appointment.status → fulfilled |
| Cancellation | Patient / Admin | Updates Appointment.status → cancelled, Slot.status → free |
