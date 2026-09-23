/**
 * EditableBlock — click-to-edit text block for the consultation note canvas.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / note
 *
 * The note should read as a clinical document, not a form: prose by default,
 * an input only while the doctor is actually typing in it. This renders the
 * committed text, swaps to an Input/Textarea on click or keyboard focus, and
 * commits on blur.
 *
 * Editing is buffered locally and pushed up on commit rather than on every
 * keystroke. That is deliberate — the workspace's autosave debounce restarts on
 * each change, so per-keystroke propagation would keep resetting it and could
 * postpone the draft write indefinitely while someone types a long history.
 *
 * Escape reverts to the last committed value; Enter commits single-line blocks
 * (multiline blocks keep Enter for newlines).
 */

"use client";

import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EditableBlockProps {
  /** Committed text. */
  value: string;
  /** Called with the new text when the edit is committed. */
  onCommit: (value: string) => void;
  /** Prompt shown when the block is empty. */
  placeholder?: string;
  /** Renders a Textarea instead of an Input, and keeps Enter for newlines. */
  multiline?: boolean;
  /** Renders the committed text larger, for a section's lead line. */
  emphasis?: boolean;
  /**
   * Renders the text as plain prose with no editing affordance at all — no
   * click target, no hover, no placeholder prompt. Used where the note is a
   * record of what was approved rather than something being written.
   */
  readOnly?: boolean;
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * A single click-to-edit block of note text.
 *
 * @param props - See EditableBlockProps.
 */
export function EditableBlock({
  value,
  onCommit,
  placeholder = "click to add",
  multiline = false,
  emphasis = false,
  readOnly = false,
  className,
}: EditableBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  /* Focus and place the caret at the end when entering edit mode. */
  useEffect(() => {
    if (!isEditing) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [isEditing]);

  /**
   * Enters edit mode, seeding the buffer from the committed value.
   * Seeding here rather than in a sync effect keeps the committed value the
   * single source of truth while not editing — the buffer only exists for the
   * duration of an edit.
   */
  function startEditing() {
    setDraft(value);
    setIsEditing(true);
  }

  /** Commits the buffered draft and leaves edit mode. */
  function commit() {
    setIsEditing(false);
    if (draft !== value) onCommit(draft);
  }

  /** Discards the buffered draft and leaves edit mode. */
  function cancel() {
    setDraft(value);
    setIsEditing(false);
  }

  function handleKeyDown(ev: React.KeyboardEvent) {
    if (ev.key === "Escape") {
      ev.preventDefault();
      cancel();
      return;
    }
    /* Single-line blocks commit on Enter; multiline keeps it for newlines. */
    if (ev.key === "Enter" && !multiline) {
      ev.preventDefault();
      commit();
    }
  }

  /* Read-only renders before any edit machinery is reachable. An em dash
     rather than the "‹ click to add ›" prompt: an empty field in a finalised
     note means nothing was recorded, not that someone should fill it in. */
  if (readOnly) {
    if (value.trim().length === 0) {
      return <p className="text-sm text-muted-foreground">—</p>;
    }
    return (
      <p
        className={cn(
          "whitespace-pre-wrap leading-relaxed",
          emphasis ? "text-[15px] font-medium" : "text-sm",
          className,
        )}
      >
        {value}
      </p>
    );
  }

  if (isEditing) {
    const shared = {
      value: draft,
      onBlur: commit,
      onKeyDown: handleKeyDown,
      placeholder,
      className: cn("text-sm", className),
    };

    return multiline ? (
      <Textarea
        {...shared}
        ref={inputRef as React.Ref<HTMLTextAreaElement>}
        onChange={(e) => setDraft(e.target.value)}
        className={cn("min-h-24 text-sm leading-relaxed", className)}
      />
    ) : (
      <Input
        {...shared}
        ref={inputRef as React.Ref<HTMLInputElement>}
        onChange={(e) => setDraft(e.target.value)}
      />
    );
  }

  const isEmpty = value.trim().length === 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={startEditing}
      onKeyDown={(ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          startEditing();
        }
      }}
      className={cn(
        "-mx-2 cursor-text rounded-sm px-2 py-1 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {isEmpty ? (
        <span className="text-sm italic text-muted-foreground/60">
          ‹ {placeholder} ›
        </span>
      ) : (
        <p
          className={cn(
            "whitespace-pre-wrap leading-relaxed",
            emphasis ? "text-[15px] font-medium" : "text-sm",
          )}
        >
          {value}
        </p>
      )}
    </div>
  );
}
