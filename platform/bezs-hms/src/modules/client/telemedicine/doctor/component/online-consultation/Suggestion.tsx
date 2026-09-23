/**
 * Suggestion — real-time AI follow-up question suggestions for the doctor.
 *
 * Layer: client / telemedicine / doctor / component / online-consultation
 *
 * Watches the live transcript and fires after every N patient turns.
 * Calls POST /api/suggestion with the recent conversation window + any
 * doctor notes and renders the returned question list.
 *
 * Deduplication: a context hash prevents re-firing for unchanged input.
 * Cancellation: AbortController cancels the in-flight request if a new one
 * triggers before the previous resolves.
 * History: up to 4 previous batches are shown below the current suggestions
 * so the doctor can refer back to earlier questions.
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TranscriptLine } from "@/modules/client/telemedicine/shared/components/online-consultation/TranscriptionPanel";

// ── Constants ──────────────────────────────────────────────────────────────────

/** Fire a suggestion after this many patient turns since the last suggestion. */
const PATIENT_TURNS_BEFORE_SUGGEST = 2;

/** Maximum number of recent transcript lines sent to the agent. */
const MAX_TURNS = 18;

/** Minimum ms between consecutive suggestion requests (debounce). */
const COOLDOWN_MS = 900;

/** How many historical batches to retain and show. */
const MAX_HISTORY = 4;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Derives DOCTOR or PATIENT role from a participant display name.
 * LiveKit names are set as "Name (Doctor)" / "Name (Patient)" by the room join logic.
 *
 * @param name - Participant display name from the transcript.
 * @returns "DOCTOR" or "PATIENT".
 */
function roleFromName(name: string): "DOCTOR" | "PATIENT" {
  const s = name.toLowerCase();
  if (s.includes("(doctor)")) return "DOCTOR";
  if (s.includes("(patient)")) return "PATIENT";
  return s.includes("doctor") ? "DOCTOR" : "PATIENT";
}

/**
 * Stable djb2-style hash to detect whether the conversation context changed.
 *
 * @param str - Input string.
 * @returns Hash as a decimal string.
 */
function hash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++)
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return String(h);
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SuggestionProps {
  /** Live transcript lines from TranscriptionPanel. */
  transcripts: TranscriptLine[];
  /** Doctor's free-text notes — appended to the conversation context. */
  notes?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders AI-generated follow-up questions that update as the conversation evolves.
 * Questions are regenerated every PATIENT_TURNS_BEFORE_SUGGEST patient turns.
 *
 * @param transcripts - Live transcript array from DoctorConsult.
 * @param notes - Current doctor notes — included in the agent context.
 */
export function Suggestion({ transcripts, notes = "" }: SuggestionProps) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[][]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const lastCtxHashRef = useRef("");
  const lastFireAtRef = useRef(0);
  const patientTurnCountRef = useRef(0);

  // Build the conversation array sent to the agent (memo-stable, no re-renders on unrelated state)
  const { conversation, lastRole, lastText } = useMemo(() => {
    const recent = transcripts.slice(-MAX_TURNS).filter((t) => t.text?.trim());
    const lines = recent.map(
      (t) => `${roleFromName(t.name)}: ${t.text.trim()}`,
    );
    if (notes?.trim()) {
      lines.push(`DOCTOR NOTES: ${notes.trim()}`);
    }
    const last = recent.at(-1);
    return {
      conversation: lines,
      lastRole: last ? roleFromName(last.name) : undefined,
      lastText: last?.text?.trim() ?? "",
    };
  }, [transcripts, notes]);

  /**
   * Fires the suggestion request if the context has changed and cooldown has elapsed.
   * Cancels any in-flight request first via AbortController.
   */
  async function generate() {
    const now = Date.now();
    if (now - lastFireAtRef.current < COOLDOWN_MS) return;

    const ctxHash = hash(
      conversation.join("\n") + "::" + history.flat().join("|"),
    );
    if (ctxHash === lastCtxHashRef.current) return;

    lastCtxHashRef.current = ctxHash;
    lastFireAtRef.current = now;

    // Cancel previous in-flight request
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setQuestions([]);
    setLoading(true);

    try {
      const res = await fetch("/api/suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation }),
        signal: ac.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const fetched: string[] = Array.isArray(data?.questions)
        ? data.questions.filter(
            (q: unknown) => typeof q === "string" && (q as string).trim(),
          )
        : [];

      if (fetched.length > 0) {
        setQuestions(fetched);
        // Keep up to MAX_HISTORY batches, dropping the oldest when full
        setHistory((h) =>
          h.length >= MAX_HISTORY ? [...h.slice(1), fetched] : [...h, fetched],
        );
      }
    } catch {
      // Ignore AbortError and transient network failures silently
    } finally {
      setLoading(false);
    }
  }

  // Trigger after every Nth patient turn
  useEffect(() => {
    if (!lastRole || !lastText) return;
    if (lastRole === "PATIENT") {
      patientTurnCountRef.current += 1;
      if (patientTurnCountRef.current >= PATIENT_TURNS_BEFORE_SUGGEST) {
        patientTurnCountRef.current = 0;
        void generate();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastRole, lastText]);

  return (
    <div className="rounded-2xl border p-4 space-y-3 bg-secondary overflow-auto max-h-64 shrink-0">
      <div className="text-xs font-medium text-muted-foreground">
        Suggested questions
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground animate-pulse">
          Generating suggestions…
        </div>
      ) : questions.length > 0 ? (
        <ol className="space-y-1.5 list-none">
          {questions.map((q, i) => (
            <li
              key={i}
              className="flex gap-2 text-sm text-black dark:text-white"
            >
              <span className="shrink-0 w-4 text-muted-foreground font-mono">
                {i + 1}.
              </span>
              <span>{q}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="text-xs text-muted-foreground">
          — waiting for patient —
        </div>
      )}

      {/* Previous question batches shown below the current set */}
      {history.length > 1 && (
        <div className="pt-2 border-t space-y-2">
          <div className="text-[11px] text-muted-foreground">
            Previous suggestions
          </div>
          {history.slice(0, -1).map((set, si) => (
            <ol key={si} className="space-y-1 list-none">
              {set.map((q, qi) => (
                <li
                  key={qi}
                  className="flex gap-2 text-xs text-muted-foreground"
                >
                  <span className="shrink-0 w-4 font-mono">{qi + 1}.</span>
                  <span>{q}</span>
                </li>
              ))}
            </ol>
          ))}
        </div>
      )}
    </div>
  );
}
