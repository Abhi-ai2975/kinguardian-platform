# notes.py — CRUD endpoints for user notes.
# Demonstrates all four SDK event types:
#   audit  — who created/updated/deleted which note
#   log    — validation warnings and server errors
#   trace  — child span for the database write step
#   metric — running total of notes in the system
import time
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query

from src.models.schemas import Note, NoteCreate, NoteUpdate
from src.watcher import client

router = APIRouter(prefix="/notes", tags=["notes"])

# In-memory store — replace with a real database in production.
_notes: dict[str, Note] = {
    "seed-1": Note(
        id="seed-1",
        title="Getting started",
        body="Edit this note or create a new one.",
        user_id="demo-user",
        created_at=datetime.now(tz=timezone.utc),
        updated_at=datetime.now(tz=timezone.utc),
    )
}


@router.get("/", response_model=list[Note])
async def list_notes(user_id: str = Query(...)) -> list[Note]:
    """List all notes for a user."""
    notes = [n for n in _notes.values() if n.user_id == user_id]

    client.metric(
        "notes.list.count",
        payload={"value": len(notes), "user_id": user_id},
    )

    return notes


@router.post("/", response_model=Note, status_code=201)
async def create_note(body: NoteCreate, user_id: str = Query(...)) -> Note:
    """Create a note and audit the creation."""
    if not body.title.strip():
        client.log("warn", "note.create.invalid", payload={"reason": "empty title", "user_id": user_id})
        raise HTTPException(status_code=422, detail="title cannot be empty")

    note_id = str(uuid.uuid4())
    now = datetime.now(tz=timezone.utc)

    # Explicit child span so the "db write" step is visible in the trace waterfall.
    write_start = time.perf_counter()
    note = Note(id=note_id, title=body.title, body=body.body,
                user_id=user_id, created_at=now, updated_at=now)
    _notes[note_id] = note
    write_ms = round((time.perf_counter() - write_start) * 1000, 2)

    client.trace(
        "db.note.write",
        trace_id=note_id,
        span_id=str(uuid.uuid4()),
        payload={"operation": "insert", "table": "notes", "duration_ms": write_ms},
    )

    client.audit(
        "note.created",
        user_id=user_id,
        payload={"note_id": note_id, "title": body.title},
    )

    client.metric("notes.total", payload={"value": len(_notes)})

    return note


@router.get("/{note_id}", response_model=Note)
async def get_note(note_id: str, user_id: str = Query(...)) -> Note:
    """Retrieve a single note."""
    note = _notes.get(note_id)
    if not note or note.user_id != user_id:
        raise HTTPException(status_code=404, detail="note not found")

    client.audit("note.viewed", user_id=user_id, payload={"note_id": note_id})
    return note


@router.patch("/{note_id}", response_model=Note)
async def update_note(note_id: str, body: NoteUpdate, user_id: str = Query(...)) -> Note:
    """Update a note and audit the change."""
    note = _notes.get(note_id)
    if not note or note.user_id != user_id:
        raise HTTPException(status_code=404, detail="note not found")

    changes: dict = {}
    if body.title is not None:
        changes["title"] = body.title
        note = note.model_copy(update={"title": body.title})
    if body.body is not None:
        changes["body"] = body.body
        note = note.model_copy(update={"body": body.body})

    note = note.model_copy(update={"updated_at": datetime.now(tz=timezone.utc)})
    _notes[note_id] = note

    client.audit(
        "note.updated",
        user_id=user_id,
        payload={"note_id": note_id, "changes": list(changes.keys())},
    )

    return note


@router.delete("/{note_id}", status_code=204)
async def delete_note(note_id: str, user_id: str = Query(...)) -> None:
    """Delete a note and audit the deletion."""
    note = _notes.get(note_id)
    if not note or note.user_id != user_id:
        raise HTTPException(status_code=404, detail="note not found")

    del _notes[note_id]

    # Deletions are especially important to audit — the data is gone but
    # the audit trail records who deleted it and when.
    client.audit(
        "note.deleted",
        user_id=user_id,
        payload={"note_id": note_id, "title": note.title},
    )

    client.metric("notes.total", payload={"value": len(_notes)})
