"""
Generate slot JSON for all working days (Mon–Fri) between START and END.
Each day gets 10 slots: 7 morning (08:00–11:30) + 3 afternoon (14:00–15:30), 30 min each.

Usage:
  python generate_slots.py                  # writes slots_full.json
  python generate_slots.py --post           # POSTs each slot to the API
  python generate_slots.py --post --url http://localhost:8000
"""

import argparse
import json
import sys
import urllib.request
from datetime import date, datetime, timedelta, timezone

START = date(2026, 6, 15)
END = date(2026, 8, 31)

USER_ID = "VsHqNde5bO7NsoLddPX2NljS7hhZRd4Y"
ORG_ID = "0fb41e50-82a4-461e-96c7-bd11359d892d"
SCHEDULE_ID = "Schedule/200003"
SCHEDULE_DISPLAY = "Dr. Doctor 1 — General Practice"

MORNING_SLOTS = [
    ("08:00", "08:30", "Morning slot 1"),
    ("08:30", "09:00", "Morning slot 2"),
    ("09:00", "09:30", "Morning slot 3"),
    ("09:30", "10:00", "Morning slot 4"),
    ("10:00", "10:30", "Morning slot 5"),
    ("10:30", "11:00", "Morning slot 6"),
    ("11:00", "11:30", "Morning slot 7"),
]

AFTERNOON_SLOTS = [
    ("14:00", "14:30", "Afternoon slot 1"),
    ("14:30", "15:00", "Afternoon slot 2"),
    ("15:00", "15:30", "Afternoon slot 3"),
]

SPECIALTY = [{"coding_system": "http://snomed.info/sct", "coding_code": "394814009", "coding_display": "General practice"}]
SERVICE_CATEGORY = [{"coding_system": "http://terminology.hl7.org/CodeSystem/service-category", "coding_code": "17", "coding_display": "General Practice"}]
SERVICE_TYPE = [{"coding_system": "http://terminology.hl7.org/CodeSystem/service-type", "coding_code": "124", "coding_display": "General Practice / GP (Doctor)"}]


def make_slot(day: date, start_time: str, end_time: str, comment: str) -> dict:
    def dt(t):
        h, m = map(int, t.split(":"))
        return datetime(day.year, day.month, day.day, h, m, tzinfo=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    return {
        "user_id": USER_ID,
        "org_id": ORG_ID,
        "schedule": SCHEDULE_ID,
        "schedule_display": SCHEDULE_DISPLAY,
        "status": "free",
        "start": dt(start_time),
        "end": dt(end_time),
        "comment": comment,
        "appointment_type_system": "http://terminology.hl7.org/CodeSystem/v2-0276",
        "appointment_type_code": "ROUTINE",
        "appointment_type_display": "Routine appointment",
        "specialty": SPECIALTY,
        "service_category": SERVICE_CATEGORY,
        "service_type": SERVICE_TYPE,
    }


def generate_slots():
    slots = []
    current = START
    while current <= END:
        if current.weekday() < 5:  # Mon–Fri
            for start, end, comment in MORNING_SLOTS + AFTERNOON_SLOTS:
                slots.append(make_slot(current, start, end, comment))
        current += timedelta(days=1)
    return slots


def post_slot(slot: dict, url: str, token: str | None):
    body = json.dumps(slot).encode()
    req = urllib.request.Request(
        f"{url}/slots",
        data=body,
        headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {})},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--post", action="store_true", help="POST slots to the API instead of writing JSON")
    parser.add_argument("--url", default="http://localhost:8000", help="Base API URL")
    parser.add_argument("--token", default=None, help="Bearer token for Authorization header")
    parser.add_argument("--out", default="slots_full.json", help="Output file (--post not set)")
    args = parser.parse_args()

    slots = generate_slots()
    print(f"Generated {len(slots)} slots across {len(slots) // 10} working days", file=sys.stderr)

    if args.post:
        ok = err = 0
        for i, slot in enumerate(slots, 1):
            status, body = post_slot(slot, args.url, args.token)
            if status in (200, 201):
                ok += 1
            else:
                err += 1
                print(f"  [{i}] {status}: {body}", file=sys.stderr)
            if i % 50 == 0:
                print(f"  {i}/{len(slots)} posted ({ok} ok, {err} err)", file=sys.stderr)
        print(f"Done: {ok} created, {err} failed", file=sys.stderr)
    else:
        with open(args.out, "w") as f:
            json.dump(slots, f, indent=2)
        print(f"Written to {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
