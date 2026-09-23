/**
 * DoctorConsult — doctor-side virtual consultation room UI.
 *
 * Layer: client / telemedicine / doctor / component / online-consultation
 *
 * On end-call the doctor's client:
 *   1. Calls /api/full-report-agent with the accumulated transcript
 *      → receives { soap_report, assessment_plan, generated_at }
 *   2. Calls completeConsultationAction to write transcript + reports to the DB
 *      and flip consultation status to COMPLETED
 *   3. Creates a FHIR Encounter linking the appointment, stamped with the
 *      actual_period_start/end of the call — the only record of how long the
 *      consultation ran
 *   4. Redirects to the post-consultation review page (/{appointmentId}/review)
 *
 * Props come from the server page which resolves the Consultation by
 * fhir_appointment_id and fetches the doctor/patient display names.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { LiveKitRoom } from "@livekit/components-react";
import { toast } from "sonner";
import { Clock, Loader2, MessageSquare, MessageSquareOff } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { RoomControlUI } from "@/modules/client/telemedicine/shared/components/online-consultation/RoomControl";
import {
  TranscriptionPanel,
  type TranscriptLine,
} from "@/modules/client/telemedicine/shared/components/online-consultation/TranscriptionPanel";
import { ConsultationNotes } from "./ConsultationNotes";
import { Suggestion } from "./Suggestion";
import { completeConsultationAction } from "@/modules/server/presentation/actions/consultation/core.actions";
import { createEncounterAction } from "@/modules/server/presentation/actions/encounter/core.actions";
import { updateAppointmentAction } from "@/modules/server/presentation/actions/appointment/core.actions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConsultationDetails {
  doctor: { name?: string; speciality: string };
  patient: { name?: string };
}

interface DoctorConsultProps {
  /** LiveKit room ID stored in the Consultation record. */
  roomId: string;
  /** Local Consultation fhir_appointment_id — used for the server action + navigation. */
  fhirAppointmentId: number;
  /** Display name of the authenticated doctor. */
  participantName: string;
  /** Doctor and patient names shown in the header bar. */
  details: ConsultationDetails;
  /** FHIR patient integer ID — used as subject on the created Encounter. */
  patientId?: number;
  /** FHIR practitioner integer ID — used as participant on the created Encounter. */
  practitionerId?: number;
  /** Active organisation ID from the session — written as org_id on the created Encounter. */
  orgId?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Formats elapsed seconds as MM:SS or H:MM:SS.
 *
 * @param seconds - Total elapsed seconds.
 * @returns Formatted time string.
 */
function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Doctor consultation room — live video with transcript panel.
 * On end-call, generates the full AI report then persists it via server action.
 *
 * @param roomId - LiveKit room ID.
 * @param fhirAppointmentId - FHIR appointment integer ID for action + navigation.
 * @param participantName - Doctor's display name shown in LiveKit.
 * @param details - Doctor/patient display names for the header.
 */
export function DoctorConsult({
  roomId,
  fhirAppointmentId,
  participantName,
  details,
  patientId,
  practitionerId,
  orgId,
}: DoctorConsultProps) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([]);
  const [showTranscript, setShowTranscript] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [notes, setNotes] = useState("");

  // Refs so the end-call handler always reads latest values without stale closures
  const transcriptsRef = useRef<TranscriptLine[]>([]);
  // Synced on every render — no useEffect needed for a simple value ref
  const notesRef = useRef("");
  notesRef.current = notes;

  /**
   * Wall-clock instant the consultation started, captured once the room is
   * live. Recorded as a timestamp rather than derived from `elapsed` for two
   * reasons: browsers throttle setInterval in a background tab, so the counter
   * drifts low whenever the doctor switches away; and a ref (like the two
   * above) is immune to the stale closure that end-call handlers are exposed
   * to. `elapsed` therefore stays purely a display concern.
   */
  const startedAtRef = useRef<number | null>(null);

  // Fetch LiveKit JWT for this participant
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/livekit-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, name: participantName }),
        });
        const data = await res.json();
        setToken(data.token);
      } catch {
        toast.error("Failed to connect to the consultation room");
      }
    })();
  }, [roomId, participantName]);

  // Fetch LiveKit server URL at runtime
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/runtime-config", { cache: "no-store" });
        if (!res.ok) throw new Error("runtime-config failed");
        const data = await res.json();
        setLivekitUrl(data.livekitUrl);
      } catch {
        toast.error("Failed to load LiveKit config");
      }
    })();
  }, []);

  // Elapsed time counter — starts once we have token + URL
  useEffect(() => {
    if (!token || !livekitUrl) return;
    /* Stamp the start on the first connection only. A reconnect re-runs this
       effect, and re-stamping would restart the clock mid-consultation. */
    startedAtRef.current ??= Date.now();
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [token, livekitUrl]);

  // Stable transcript callback — doesn't cause TranscriptionPanel to re-subscribe
  const onTranscriptRef = useRef<(line: TranscriptLine) => void>(() => {});
  onTranscriptRef.current = (line) => {
    setTranscripts((prev) => {
      const next = [...prev, line];
      transcriptsRef.current = next;
      return next;
    });
  };
  const handleTranscript = useRef((line: TranscriptLine) =>
    onTranscriptRef.current(line),
  ).current;

  if (!token || !livekitUrl) {
    return (
      <div className="flex items-center justify-center mt-20">
        <p className="inline-flex items-center gap-2 text-muted-foreground">
          <Loader2 className="animate-spin" /> Connecting to consultation...
        </p>
      </div>
    );
  }

  /**
   * End-call handler — generates the AI report then persists everything.
   * Fires on the "End Consultation" button and on LiveKit disconnect.
   * Guarded by isCompleting to prevent double-invocation.
   */
  const handleEndCall = async () => {
    if (isCompleting) return;
    setIsCompleting(true);

    const currentTranscripts = transcriptsRef.current;
    const currentNotes = notesRef.current;

    // Build a text conversation array for the AI agent
    const conversation = currentTranscripts
      .filter((t) => t.text?.trim())
      .map((t) => {
        const role = t.name.toLowerCase().includes("doctor")
          ? "DOCTOR"
          : "PATIENT";
        return `${role}: ${t.text.trim()}`;
      });
    // Append doctor notes so the report agent has full context
    if (currentNotes.trim()) {
      conversation.push(`DOCTOR NOTES: ${currentNotes.trim()}`);
    }

    // Map transcript lines to the consultation storage shape
    const virtualConversation = currentTranscripts.map((t) => ({
      speaker: (t.name.toLowerCase().includes("doctor")
        ? "DOCTOR"
        : "PATIENT") as "DOCTOR" | "PATIENT",
      text: t.text,
      timestamp: t.timestamp,
    }));

    // Call full-report-agent (assessment-plan + doctor-report in parallel)
    let fullReport: Record<string, unknown> | null = null;
    let soapNote: Record<string, unknown> | null = null;
    try {
      const res = await fetch("/api/full-report-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation }),
      });
      if (res.ok) {
        fullReport = await res.json();
        // soap_report lives inside the merged full report
        soapNote = (fullReport?.soap_report as Record<string, unknown>) ?? null;
      }
    } catch {
      // Report generation failed — still complete the consultation so status is updated
    }

    // Persist transcript + reports and mark COMPLETED
    const [, err] = await completeConsultationAction({
      payload: {
        fhir_appointment_id: fhirAppointmentId,
        virtual_conversation: virtualConversation,
        soap_note: soapNote ?? undefined,
        full_report: fullReport ?? undefined,
      },
    });

    if (err) {
      toast.error("Consultation ended but report could not be saved.");
    } else {
      toast.success("Consultation completed");
    }

    /* Mark the FHIR Appointment as fulfilled now that the consultation is done. */
    try {
      await updateAppointmentAction({
        payload: { id: fhirAppointmentId, status: "fulfilled" },
      });
    } catch {
      /* Non-fatal — status update failure should not block the review redirect. */
    }

    /* Create the FHIR Encounter linking this consultation to clinical resources.
       Awaited so the encounter exists in FHIR before the review page renders.

       actual_period_start/end are the record of how long the consultation
       actually ran. This is deliberately NOT written back to
       Appointment.minutes_duration: FHIR defines that as the *planned* length
       ("can be less than the duration between the start and end times"), so
       overwriting it would lose what was originally booked. Every read site in
       the app already derives duration from start/end anyway. */
    try {
      const [data, error] = await createEncounterAction({
        payload: {
          status: "completed",
          ...(patientId ? { subject: `Patient/${patientId}` } : {}),
          ...(startedAtRef.current != null
            ? {
                actual_period_start: new Date(
                  startedAtRef.current,
                ).toISOString(),
              }
            : {}),
          actual_period_end: new Date().toISOString(),
          appointment: [{ reference: `Appointment/${fhirAppointmentId}` }],
          ...(practitionerId
            ? { participant: [{ reference: `Practitioner/${practitionerId}` }] }
            : {}),
          ...(orgId ? { org_id: orgId } : {}),
        },
      });
    } catch {
      /* Non-fatal — review page will handle missing encounter gracefully. */
    }

    setIsCompleting(false);
    router.push(
      `/bezs/telemedicine/doctor/appointments/${fhirAppointmentId}/review`,
    );
  };

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={livekitUrl}
      data-lk-theme="default"
      onDisconnected={handleEndCall}
      className="!bg-transparent !shadow-none !h-[calc(100vh-162px)]"
      style={
        {
          "--lk-accent-bg": "var(--primary)",
          "--lk-accent-fg": "var(--primary-foreground)",
        } as React.CSSProperties
      }
    >
      <div className="flex flex-col h-full w-full gap-2">
        {/* ── Header bar ── */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-secondary border border-border shrink-0">
          <div className="flex items-center gap-4">
            {/* Live pulse indicator */}
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">
                Live
              </span>
            </div>

            <div className="h-4 w-px bg-border" />

            <div className="text-sm leading-tight">
              <p className="text-muted-foreground text-xs">Doctor</p>
              <p className="font-medium text-secondary-foreground">
                {details.doctor.name}
                {details.doctor.speciality && (
                  <span className="text-muted-foreground font-normal text-xs ml-1">
                    · {details.doctor.speciality}
                  </span>
                )}
              </p>
            </div>

            <div className="h-4 w-px bg-border" />

            <div className="text-sm leading-tight">
              <p className="text-muted-foreground text-xs">Patient</p>
              <p className="font-medium text-secondary-foreground">
                {details.patient.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Elapsed timer */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground px-3 py-1 rounded-lg bg-background border border-border">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-mono tabular-nums text-xs">
                {formatElapsed(elapsed)}
              </span>
            </div>

            {/* Transcript toggle */}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowTranscript((v) => !v)}
              className="gap-1.5"
            >
              {showTranscript ? (
                <MessageSquareOff className="h-4 w-4" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
              {showTranscript ? "Hide Transcript" : "Show Transcript"}
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={handleEndCall}
              disabled={isCompleting}
            >
              {isCompleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Finishing…
                </>
              ) : (
                "End Consultation"
              )}
            </Button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 gap-2 min-h-0">
          {/* Left: video room + doctor notes */}
          <div className="flex flex-col flex-1 min-h-0 gap-2 overflow-hidden">
            <RoomControlUI />
            <ConsultationNotes notes={notes} onNotesChange={setNotes} />
          </div>

          {/* Right sidebar: AI suggestions (always visible) + optional transcript */}
          <aside className="w-[400px] flex flex-col gap-2 min-h-0 overflow-hidden">
            <Suggestion transcripts={transcripts} notes={notes} />
            {showTranscript && (
              <div className="flex-1 min-h-0 overflow-auto">
                <TranscriptionPanel
                  roomId={roomId}
                  transcripts={transcripts}
                  onTranscript={handleTranscript}
                />
              </div>
            )}
          </aside>
        </div>
      </div>
    </LiveKitRoom>
  );
}
