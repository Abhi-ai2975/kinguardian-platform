import json
from pathlib import Path

# Coordinate and Layout Definitions for all 19 KinGuardian Database Tables
# Canvas: 1720 x 1420

TABLES = [
    # --- Column 1: Identity, Communication & Notifications (x=60, w=280) ---
    {
        "name": "profiles",
        "title": "profiles",
        "header_color": "#7c3aed",
        "header_bg": "#f3e8ff",
        "border_color": "#c084fc",
        "x": 60, "y": 100, "w": 280,
        "cols": [
            ("id", "uuid", "PK", "#dc2626"),
            ("identity_subject", "varchar", "UK", "#2563eb"),
            ("email", "varchar", "", ""),
            ("display_name", "varchar", "", ""),
            ("timezone", "varchar", "", ""),
            ("password_hash", "varchar", "", ""),
            ("role", "varchar", "", ""),
            ("is_active", "boolean", "", ""),
            ("created_at", "timestamptz", "", ""),
            ("updated_at", "timestamptz", "", "")
        ]
    },
    {
        "name": "conversations",
        "title": "conversations",
        "header_color": "#ca8a04",
        "header_bg": "#fef9c3",
        "border_color": "#facc15",
        "x": 60, "y": 400, "w": 280,
        "cols": [
            ("id", "uuid", "PK", "#dc2626"),
            ("family_id", "uuid", "FK", "#16a34a"),
            ("subject_id", "uuid", "FK", "#16a34a"),
            ("visibility", "varchar", "", ""),
            ("created_at", "timestamptz", "", ""),
            ("updated_at", "timestamptz", "", "")
        ]
    },
    {
        "name": "messages",
        "title": "messages",
        "header_color": "#b45309",
        "header_bg": "#ffedd5",
        "border_color": "#fb923c",
        "x": 60, "y": 610, "w": 280,
        "cols": [
            ("id", "uuid", "PK", "#dc2626"),
            ("conversation_id", "uuid", "FK", "#16a34a"),
            ("sender_id", "uuid", "FK", "#16a34a"),
            ("body", "text", "", ""),
            ("created_at", "timestamptz", "", ""),
            ("updated_at", "timestamptz", "", "")
        ]
    },
    {
        "name": "notifications",
        "title": "notifications",
        "header_color": "#c026d3",
        "header_bg": "#fae8ff",
        "border_color": "#e879f9",
        "x": 60, "y": 820, "w": 280,
        "cols": [
            ("id", "uuid", "PK", "#dc2626"),
            ("family_id", "uuid", "FK", "#16a34a"),
            ("recipient_id", "uuid", "FK", "#16a34a"),
            ("event_type", "varchar", "", ""),
            ("payload", "json", "", ""),
            ("read_at", "timestamptz", "", ""),
            ("created_at", "timestamptz", "", ""),
            ("updated_at", "timestamptz", "", "")
        ]
    },

    # --- Column 2: Access, Governance & AI Insights (x=380, w=280) ---
    {
        "name": "memberships",
        "title": "memberships",
        "header_color": "#0284c7",
        "header_bg": "#e0f2fe",
        "border_color": "#38bdf8",
        "x": 380, "y": 100, "w": 280,
        "cols": [
            ("id", "uuid", "PK", "#dc2626"),
            ("family_id", "uuid", "FK", "#16a34a"),
            ("profile_id", "uuid", "FK", "#16a34a"),
            ("role", "varchar", "", ""),
            ("status", "varchar", "", ""),
            ("created_at", "timestamptz", "", ""),
            ("updated_at", "timestamptz", "", "")
        ]
    },
    {
        "name": "care_grants",
        "title": "care_grants",
        "header_color": "#dc2626",
        "header_bg": "#fee2e2",
        "border_color": "#f87171",
        "x": 380, "y": 330, "w": 280,
        "cols": [
            ("id", "uuid", "PK", "#dc2626"),
            ("subject_id", "uuid", "FK", "#16a34a"),
            ("profile_id", "uuid", "FK", "#16a34a"),
            ("scopes", "json", "", ""),
            ("status", "varchar", "", ""),
            ("expires_at", "timestamptz", "", ""),
            ("created_at", "timestamptz", "", ""),
            ("updated_at", "timestamptz", "", "")
        ]
    },
    {
        "name": "consents",
        "title": "consents",
        "header_color": "#7c3aed",
        "header_bg": "#ede9fe",
        "border_color": "#a78bfa",
        "x": 380, "y": 580, "w": 280,
        "cols": [
            ("id", "uuid", "PK", "#dc2626"),
            ("subject_id", "uuid", "FK", "#16a34a"),
            ("granted_to_profile_id", "uuid", "FK", "#16a34a"),
            ("scopes", "json", "", ""),
            ("status", "varchar", "", ""),
            ("revoked_at", "timestamptz", "", ""),
            ("created_at", "timestamptz", "", ""),
            ("updated_at", "timestamptz", "", "")
        ]
    },
    {
        "name": "insights",
        "title": "insights",
        "header_color": "#4f46e5",
        "header_bg": "#e0e7ff",
        "border_color": "#818cf8",
        "x": 380, "y": 830, "w": 280,
        "cols": [
            ("id", "uuid", "PK", "#dc2626"),
            ("family_id", "uuid", "FK", "#16a34a"),
            ("subject_id", "uuid", "FK", "#16a34a"),
            ("conversation_id", "uuid", "FK", "#16a34a"),
            ("type", "varchar", "", ""),
            ("summary", "text", "", ""),
            ("source", "varchar", "", ""),
            ("status", "varchar", "", ""),
            ("created_at", "timestamptz", "", ""),
            ("updated_at", "timestamptz", "", "")
        ]
    },

    # --- Column 3: Family Core, Subject & Audit/Outbox (x=700, w=280) ---
    {
        "name": "families",
        "title": "families",
        "header_color": "#ea580c",
        "header_bg": "#ffedd5",
        "border_color": "#fb923c",
        "x": 700, "y": 100, "w": 280,
        "cols": [
            ("id", "uuid", "PK", "#dc2626"),
            ("name", "varchar", "", ""),
            ("home_timezone", "varchar", "", ""),
            ("status", "varchar", "", ""),
            ("created_at", "timestamptz", "", ""),
            ("updated_at", "timestamptz", "", "")
        ]
    },
    {
        "name": "care_subjects",
        "title": "care_subjects",
        "header_color": "#16a34a",
        "header_bg": "#dcfce7",
        "border_color": "#4ade80",
        "x": 700, "y": 320, "w": 280,
        "cols": [
            ("id", "uuid", "PK", "#dc2626"),
            ("family_id", "uuid", "FK", "#16a34a"),
            ("profile_id", "uuid", "FK", "#16a34a"),
            ("external_patient_ref", "varchar", "UK", "#2563eb"),
            ("preferred_timezone", "varchar", "", ""),
            ("status", "varchar", "", ""),
            ("created_at", "timestamptz", "", ""),
            ("updated_at", "timestamptz", "", "")
        ]
    },
    {
        "name": "audit_log",
        "title": "audit_log",
        "header_color": "#475569",
        "header_bg": "#f1f5f9",
        "border_color": "#94a3b8",
        "x": 700, "y": 570, "w": 280,
        "cols": [
            ("id", "uuid", "PK", "#dc2626"),
            ("actor_id", "uuid", "FK", "#16a34a"),
            ("family_id", "uuid", "FK", "#16a34a"),
            ("action", "varchar", "", ""),
            ("resource_type", "varchar", "", ""),
            ("resource_id", "varchar", "", ""),
            ("metadata_json", "json", "", ""),
            ("occurred_at", "timestamptz", "", ""),
            ("created_at", "timestamptz", "", "")
        ]
    },
    {
        "name": "outbox_events",
        "title": "outbox_events",
        "header_color": "#0369a1",
        "header_bg": "#e0f2fe",
        "border_color": "#38bdf8",
        "x": 700, "y": 840, "w": 280,
        "cols": [
            ("id", "uuid", "PK", "#dc2626"),
            ("family_id", "uuid", "FK", "#16a34a"),
            ("aggregate_type", "varchar", "", ""),
            ("aggregate_id", "varchar", "", ""),
            ("event_type", "varchar", "", ""),
            ("idempotency_key", "varchar", "UK", "#2563eb"),
            ("payload", "json", "", ""),
            ("status", "varchar", "", ""),
            ("attempts", "int", "", ""),
            ("occurred_at", "timestamptz", "", "")
        ]
    },

    # --- Column 4: Care Appointments, Tasks & Tracking (x=1020, w=280) ---
    {
        "name": "appointments",
        "title": "appointments (NEW)",
        "header_color": "#e11d48",
        "header_bg": "#ffe4e6",
        "border_color": "#fb7185",
        "x": 1020, "y": 100, "w": 280,
        "cols": [
            ("id", "uuid", "PK", "#dc2626"),
            ("family_id", "uuid", "FK", "#16a34a"),
            ("subject_id", "uuid", "FK", "#16a34a"),
            ("created_by", "uuid", "FK", "#16a34a"),
            ("doctor_name", "varchar", "", ""),
            ("specialty", "varchar", "", ""),
            ("date", "timestamptz", "", ""),
            ("time", "varchar", "", ""),
            ("location", "varchar", "", ""),
            ("status", "varchar", "", ""),
            ("telehealth_link", "varchar", "", ""),
            ("notes", "text", "", ""),
            ("created_at", "timestamptz", "", ""),
            ("updated_at", "timestamptz", "", "")
        ]
    },
    {
        "name": "care_tasks",
        "title": "care_tasks",
        "header_color": "#059669",
        "header_bg": "#d1fae5",
        "border_color": "#34d399",
        "x": 1020, "y": 480, "w": 280,
        "cols": [
            ("id", "uuid", "PK", "#dc2626"),
            ("family_id", "uuid", "FK", "#16a34a"),
            ("subject_id", "uuid", "FK", "#16a34a"),
            ("created_by", "uuid", "FK", "#16a34a"),
            ("assigned_to", "uuid", "FK", "#16a34a"),
            ("title", "varchar", "", ""),
            ("detail", "text", "", ""),
            ("priority", "varchar", "", ""),
            ("status", "varchar", "", ""),
            ("due_at", "timestamptz", "", ""),
            ("completed_at", "timestamptz", "", ""),
            ("created_at", "timestamptz", "", ""),
            ("updated_at", "timestamptz", "", "")
        ]
    },
    {
        "name": "checkins",
        "title": "checkins",
        "header_color": "#0d9488",
        "header_bg": "#ccfbf1",
        "border_color": "#2dd4bf",
        "x": 1020, "y": 840, "w": 280,
        "cols": [
            ("id", "uuid", "PK", "#dc2626"),
            ("subject_id", "uuid", "FK", "#16a34a"),
            ("submitted_by", "uuid", "FK", "#16a34a"),
            ("mood", "varchar", "", ""),
            ("note", "text", "", ""),
            ("severity", "varchar", "", ""),
            ("occurred_at", "timestamptz", "", ""),
            ("created_at", "timestamptz", "", ""),
            ("updated_at", "timestamptz", "", "")
        ]
    },
    {
        "name": "medication_adherence",
        "title": "medication_adherence",
        "header_color": "#d97706",
        "header_bg": "#fef3c7",
        "border_color": "#fbbf24",
        "x": 1020, "y": 1090, "w": 280,
        "cols": [
            ("id", "uuid", "PK", "#dc2626"),
            ("subject_id", "uuid", "FK", "#16a34a"),
            ("medication_ref", "varchar", "", ""),
            ("confirmed_by", "uuid", "FK", "#16a34a"),
            ("taken_at", "timestamptz", "", ""),
            ("source", "varchar", "", ""),
            ("created_at", "timestamptz", "", ""),
            ("updated_at", "timestamptz", "", "")
        ]
    },

    # --- Column 5: Clinical Documents & Wearable Subsystems (x=1340, w=310) ---
    {
        "name": "document_references",
        "title": "document_references",
        "header_color": "#db2777",
        "header_bg": "#fce7f3",
        "border_color": "#f472b6",
        "x": 1340, "y": 100, "w": 310,
        "cols": [
            ("id", "uuid", "PK", "#dc2626"),
            ("family_id", "uuid", "FK", "#16a34a"),
            ("subject_id", "uuid", "FK", "#16a34a"),
            ("filenest_file_id", "varchar", "UK", "#2563eb"),
            ("classification", "varchar", "", ""),
            ("status", "varchar", "", ""),
            ("uploaded_by", "uuid", "FK", "#16a34a"),
            ("created_at", "timestamptz", "", ""),
            ("updated_at", "timestamptz", "", "")
        ]
    },
    {
        "name": "wearable_connections",
        "title": "wearable_connections (NEW)",
        "header_color": "#6366f1",
        "header_bg": "#eef2ff",
        "border_color": "#818cf8",
        "x": 1340, "y": 370, "w": 310,
        "cols": [
            ("id", "uuid", "PK", "#dc2626"),
            ("subject_id", "uuid", "FK", "#16a34a"),
            ("provider", "varchar", "", ""),
            ("connection_status", "varchar", "", ""),
            ("device_type", "varchar", "", ""),
            ("device_id", "varchar", "", ""),
            ("source", "varchar", "", ""),
            ("sync_status", "varchar", "", ""),
            ("is_stale", "boolean", "", ""),
            ("last_sync_at", "timestamptz", "", ""),
            ("disconnected_at", "timestamptz", "", ""),
            ("access_token", "varchar", "", ""),
            ("created_at", "timestamptz", "", ""),
            ("updated_at", "timestamptz", "", "")
        ]
    },
    {
        "name": "wearable_data",
        "title": "wearable_data (NEW)",
        "header_color": "#0891b2",
        "header_bg": "#ecfeff",
        "border_color": "#22d3ee",
        "x": 1340, "y": 760, "w": 310,
        "cols": [
            ("id", "uuid", "PK", "#dc2626"),
            ("subject_id", "uuid", "FK", "#16a34a"),
            ("connection_id", "uuid", "FK", "#16a34a"),
            ("steps", "int", "", ""),
            ("heart_rate", "int", "", ""),
            ("sleep_minutes", "int", "", ""),
            ("date", "timestamptz", "", ""),
            ("source", "varchar", "", ""),
            ("device_id", "varchar", "", ""),
            ("last_sync_at", "timestamptz", "", ""),
            ("created_at", "timestamptz", "", ""),
            ("updated_at", "timestamptz", "", "")
        ]
    }
]

# Relationships and Connectors
CONNECTORS = [
    # profiles to memberships
    {"path": "M 340 160 L 380 160", "label": "has memberships", "lx": 360, "ly": 150},
    # families to memberships
    {"path": "M 700 160 L 660 160", "label": "has members", "lx": 680, "ly": 150},
    # families to care_subjects
    {"path": "M 840 272 L 840 320", "label": "contains subjects", "lx": 845, "ly": 296},
    # care_subjects to care_grants
    {"path": "M 700 380 L 660 380", "label": "has grants", "lx": 680, "ly": 370},
    # care_subjects to consents
    {"path": "M 700 450 L 670 450 L 670 630 L 660 630", "label": "has consents", "lx": 670, "ly": 540},
    # families to conversations
    {"path": "M 700 200 L 675 200 L 675 420 L 340 420", "label": "family conversations", "lx": 510, "ly": 410},
    # conversations to messages
    {"path": "M 200 550 L 200 610", "label": "messages", "lx": 205, "ly": 580},
    # conversations to insights
    {"path": "M 340 480 L 360 480 L 360 880 L 380 880", "label": "generates insights", "lx": 360, "ly": 680},
    # families to notifications
    {"path": "M 700 240 L 350 240 L 350 850 L 340 850", "label": "notifications", "lx": 520, "ly": 230},
    # families to audit_log
    {"path": "M 840 272 L 840 570", "label": "audited actions", "lx": 845, "ly": 548},
    # families to outbox_events
    {"path": "M 840 810 L 840 840", "label": "domain outbox", "lx": 845, "ly": 825},

    # families to appointments (NEW)
    {"path": "M 980 150 L 1020 150", "label": "family appointments", "lx": 1000, "ly": 140},
    # care_subjects to appointments (NEW)
    {"path": "M 980 340 L 1000 340 L 1000 220 L 1020 220", "label": "patient appt", "lx": 1000, "ly": 280},

    # families to care_tasks
    {"path": "M 980 190 L 1010 190 L 1010 520 L 1020 520", "label": "family tasks", "lx": 1005, "ly": 355},
    # care_subjects to care_tasks
    {"path": "M 980 400 L 1020 560", "label": "assigned tasks", "lx": 1000, "ly": 480},
    # care_subjects to checkins
    {"path": "M 980 460 L 1005 460 L 1005 870 L 1020 870", "label": "daily checkins", "lx": 1005, "ly": 665},
    # care_subjects to medication_adherence
    {"path": "M 980 490 L 995 490 L 995 1120 L 1020 1120", "label": "med adherence", "lx": 995, "ly": 805},

    # care_subjects to document_references
    {"path": "M 980 360 L 1170 360 L 1170 140 L 1340 140", "label": "clinical documents", "lx": 1255, "ly": 130},

    # care_subjects to wearable_connections (NEW)
    {"path": "M 980 420 L 1260 420 L 1340 420", "label": "linked wearables", "lx": 1250, "ly": 410},

    # care_subjects to wearable_data (NEW)
    {"path": "M 980 440 L 1230 440 L 1230 810 L 1340 810", "label": "biometric telemetry", "lx": 1230, "ly": 625},

    # wearable_connections to wearable_data (NEW)
    {"path": "M 1495 718 L 1495 760", "label": "connection telemetry", "lx": 1500, "ly": 739}
]

def render_table(t):
    h = 32 + len(t["cols"]) * 22 + 8
    t["actual_h"] = h
    out = []
    # Card Background & Drop Shadow
    out.append(f'<g id="tbl-{t["name"]}">' )
    out.append(f'  <rect x="{t["x"]}" y="{t["y"]}" width="{t["w"]}" height="{h}" rx="8" fill="#ffffff" stroke="{t["border_color"]}" stroke-width="1.8" filter="url(#drop-shadow)" />')
    # Header
    out.append(f'  <path d="M {t["x"]} {t["y"]+8} A 8 8 0 0 1 {t["x"]+8} {t["y"]} L {t["x"]+t["w"]-8} {t["y"]} A 8 8 0 0 1 {t["x"]+t["w"]} {t["y"]+8} L {t["x"]+t["w"]} {t["y"]+32} L {t["x"]} {t["y"]+32} Z" fill="{t["header_bg"]}" />')
    out.append(f'  <line x1="{t["x"]}" y1="{t["y"]+32}" x2="{t["x"]+t["w"]}" y2="{t["y"]+32}" stroke="{t["border_color"]}" stroke-width="1.5" />')
    out.append(f'  <text x="{t["x"]+t["w"]//2}" y="{t["y"]+21}" class="tbl-hdr" fill="{t["header_color"]}">{t["title"]}</text>')
    
    # Rows
    ry = t["y"] + 48
    for col, ctype, key, keycolor in t["cols"]:
        # Key Badge
        if key:
            out.append(f'  <rect x="{t["x"]+8}" y="{ry-10}" width="22" height="13" rx="3" fill="{keycolor}" fill-opacity="0.12" stroke="{keycolor}" stroke-width="0.8" />')
            out.append(f'  <text x="{t["x"]+19}" y="{ry}" class="col-key" fill="{keycolor}">{key}</text>')
        
        # Column Name
        cx = t["x"] + 36 if key else t["x"] + 14
        out.append(f'  <text x="{cx}" y="{ry}" class="col-name">{col}</text>')
        
        # Column Data Type
        out.append(f'  <text x="{t["x"]+t["w"]-12}" y="{ry}" class="col-type">{ctype}</text>')
        
        ry += 22
    out.append('</g>')
    return "\n".join(out)

def generate_svg():
    svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1720 1420" width="100%" height="100%" style="background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif;">',
        '  <defs>',
        '    <filter id="drop-shadow" x="-5%" y="-5%" width="112%" height="114%" filterUnits="userSpaceOnUse">',
        '      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#0f172a" flood-opacity="0.06" />',
        '    </filter>',
        '    <style>',
        '      .title { font-size: 26px; font-weight: 800; fill: #0f172a; text-anchor: middle; letter-spacing: -0.5px; }',
        '      .subtitle { font-size: 13px; font-weight: 500; fill: #64748b; text-anchor: middle; }',
        '      .tbl-hdr { font-size: 13px; font-weight: 700; text-anchor: middle; letter-spacing: 0.2px; }',
        '      .col-name { font-size: 11px; font-weight: 600; fill: #1e293b; }',
        '      .col-type { font-size: 10px; font-weight: 500; fill: #64748b; text-anchor: end; }',
        '      .col-key { font-size: 8.5px; font-weight: 800; text-anchor: middle; }',
        '      .rel-label { font-size: 8.5px; font-weight: 600; fill: #475569; text-anchor: middle; }',
        '      .line { stroke: #64748b; stroke-width: 1.4; fill: none; }',
        '    </style>',
        '    <marker id="crow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">',
        '      <path d="M 1 1 L 9 5 L 1 9" fill="none" stroke="#64748b" stroke-width="1.3"/>',
        '    </marker>',
        '    <marker id="one" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">',
        '      <line x1="5" y1="1" x2="5" y2="9" stroke="#64748b" stroke-width="1.4"/>',
        '    </marker>',
        '  </defs>',
        '',
        '  <!-- Background Grid Pattern -->',
        '  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">',
        '    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" stroke-width="0.5" />',
        '  </pattern>',
        '  <rect width="100%" height="100%" fill="url(#grid)" />',
        '',
        '  <!-- Title Header -->',
        '  <text x="860" y="44" class="title">KinGuardian — Production PostgreSQL Database ER Diagram</text>',
        '  <text x="860" y="68" class="subtitle">Complete 19-Table Entity Relationship Architecture (PostgreSQL 16 Engine • Includes Wearables &amp; Appointments)</text>',
        '',
        '  <!-- Relationship Lines -->'
    ]

    for conn in CONNECTORS:
        svg.append(f'  <path d="{conn["path"]}" class="line" marker-start="url(#one)" marker-end="url(#crow)" />')
        if "label" in conn:
            svg.append(f'  <rect x="{conn["lx"]-46}" y="{conn["ly"]-8}" width="92" height="14" rx="3" fill="#ffffff" fill-opacity="0.92" stroke="#cbd5e1" stroke-width="0.6"/>')
            svg.append(f'  <text x="{conn["lx"]}" y="{conn["ly"]+2}" class="rel-label">{conn["label"]}</text>')

    svg.append('')
    svg.append('  <!-- Tables -->')
    for t in TABLES:
        svg.append(render_table(t))

    # Legend at bottom-left
    svg.extend([
        '',
        '  <!-- Legend Card -->',
        '  <g transform="translate(60, 1070)">',
        '    <rect width="600" height="180" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2" filter="url(#drop-shadow)" />',
        '    <rect x="0" y="0" width="600" height="28" rx="8" fill="#f1f5f9" />',
        '    <text x="16" y="19" font-size="12" font-weight="700" fill="#334155">Legend &amp; Key Notation (19 Normalized Core Tables)</text>',
        '',
        '    <rect x="16" y="42" width="22" height="13" rx="3" fill="#dc2626" fill-opacity="0.15" stroke="#dc2626" stroke-width="0.8"/>',
        '    <text x="27" y="52" class="col-key" fill="#dc2626">PK</text>',
        '    <text x="46" y="53" font-size="11" font-weight="500" fill="#334155">Primary Key (UUID v4 default uid())</text>',
        '',
        '    <rect x="16" y="66" width="22" height="13" rx="3" fill="#16a34a" fill-opacity="0.15" stroke="#16a34a" stroke-width="0.8"/>',
        '    <text x="27" y="76" class="col-key" fill="#16a34a">FK</text>',
        '    <text x="46" y="77" font-size="11" font-weight="500" fill="#334155">Foreign Key (Referential Integrity Constraints)</text>',
        '',
        '    <rect x="16" y="90" width="22" height="13" rx="3" fill="#2563eb" fill-opacity="0.15" stroke="#2563eb" stroke-width="0.8"/>',
        '    <text x="27" y="100" class="col-key" fill="#2563eb">UK</text>',
        '    <text x="46" y="101" font-size="11" font-weight="500" fill="#334155">Unique Key / Idempotency Constraint</text>',
        '',
        '    <line x1="16" y1="124" x2="36" y2="124" stroke="#64748b" stroke-width="1.4"/>',
        '    <circle cx="16" cy="124" r="2.5" fill="#64748b"/>',
        '    <path d="M 32 120 L 38 124 L 32 128" fill="none" stroke="#64748b" stroke-width="1.2"/>',
        '    <text x="46" y="127" font-size="11" font-weight="500" fill="#334155">1-to-Many Relationship (Crow\'s Foot)</text>',
        '',
        '    <text x="16" y="156" font-size="10.5" font-weight="600" fill="#64748b">Engine: PostgreSQL 16 • Timezone Standard: TIMESTAMPTZ (UTC +00) • Multi-Device Deduplication Enabled</text>',
        '  </g>'
    ])

    svg.append('</svg>')
    return "\n".join(svg)

if __name__ == "__main__":
    svg_code = generate_svg()
    out_path = Path("kinguardian_database_er_diagram.svg")
    out_path.write_text(svg_code, encoding="utf-8")
    print(f"Generated {out_path} ({len(svg_code)} bytes)")
