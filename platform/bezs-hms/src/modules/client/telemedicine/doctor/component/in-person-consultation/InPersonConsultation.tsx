/**
 * InPersonConsultation — doctor-facing in-person consultation room UI.
 *
 * Layer: client / telemedicine / doctor / component / in-person-consultation
 *
 * Doctor opens this screen while physically sitting with the patient. The
 * device microphone captures both voices simultaneously; the diarization agent
 * (INPERSON_CONSULTATION_AGENT_URL) streams live partial transcripts in real
 * time, then emits a final diarized transcript (Doctor / Patient labeled) once
 * the doctor stops recording.
 *
 * WebSocket protocol (binary + JSON):
 *   →  ArrayBuffer (PCM-16 LE, 16 kHz, mono)   — continuous mic frames
 *   ←  { type: "partial",  text: string }       — rolling live transcript
 *   ←  { type: "language", code: string }       — detected language
 *   ←  { type: "final",    transcript: string } — diarized text, "Doctor: …\nPatient: …"
 *   ←  { type: "error",    message: string }    — agent-side errors
 *
 * End-call pipeline (mirrors DoctorConsult.handleEndCall exactly):
 *   1. Mic tracks stopped → server detects silence → emits "final"
 *   2. Diarized lines parsed into { speaker, text, timestamp }[]
 *   3. POST /api/full-report-agent with the conversation array
 *   4. completeConsultationAction (transcript + reports, status = COMPLETED)
 *   5. updateAppointmentAction → status "fulfilled"
 *   6. createEncounterAction (fire-and-forget)
 *   7. Router pushes to /{fhirAppointmentId}/review
 *
 * Only available on the doctor portal — no patient-side counterpart.
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Mic,
  MicOff,
  Stethoscope,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { completeConsultationAction } from "@/modules/server/presentation/actions/consultation/core.actions";
import { updateAppointmentAction } from "@/modules/server/presentation/actions/appointment/core.actions";
import { createEncounterAction } from "@/modules/server/presentation/actions/encounter/core.actions";

// ── AudioWorklet processor source (inline Blob — no public/ file required) ────

/**
 * AudioWorklet processor that forwards each captured input frame to the main
 * thread as a transferable Float32Array. Runs in an isolated AudioWorkletGlobalScope.
 */
const PCM_WORKLET_CODE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (channel && channel.length > 0) {
      const copy = new Float32Array(channel);
      this.port.postMessage(copy, [copy.buffer]);
    }
    return true;
  }
}
registerProcessor("pcm-capture-processor", PcmCaptureProcessor);
`;

// ── Types ─────────────────────────────────────────────────────────────────────

/** Props for InPersonConsultation. */
interface InPersonConsultationProps {
  /** FHIR Appointment integer ID — used for report persistence and navigation. */
  fhirAppointmentId: number;
  /** Practitioner display name shown in the header. */
  doctorName: string;
  /** Patient display name shown in the header. */
  patientName?: string;
  /** FHIR Patient integer ID — passed to createEncounterAction. */
  patientId?: number;
  /** FHIR Practitioner integer ID — passed to createEncounterAction. */
  practitionerId?: number;
  /** Active organisation ID from the session — written on the Encounter. */
  orgId?: string;
}

/**
 * Recording state for the in-person consultation session.
 *   idle        — not yet started
 *   connecting  — fetching token + opening WS
 *   recording   — mic live, streaming PCM to agent
 *   finalizing  — mic stopped, waiting for "final" diarization event
 *   done        — diarized transcript received; doctor reviews before completing
 *   completing  — doctor clicked "Complete"; saving report, transcript, encounter
 */
type SessionStatus =
  | "idle"
  | "connecting"
  | "recording"
  | "finalizing"
  | "done"
  | "completing";

/** A single line from the diarized final transcript. */
interface DiarizedLine {
  /** "Doctor" | "Patient" | "Unknown" — derived from the "Speaker: text" prefix. */
  speaker: "DOCTOR" | "PATIENT" | "UNKNOWN";
  /** Spoken text without the speaker prefix. */
  text: string;
  /** ISO timestamp recorded when the final event arrives. */
  timestamp: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converts a Float32 audio frame to an Int16 PCM-LE ArrayBuffer for WS transmission.
 *
 * @param float32 - Raw microphone samples from AudioWorklet.
 * @returns PCM-16 LE ArrayBuffer.
 */
function float32ToPcm16(float32: Float32Array): ArrayBuffer {
  const pcm = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    pcm[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return pcm.buffer;
}

/**
 * Parses the diarized transcript string emitted by the agent's "final" event
 * into a typed array of { speaker, text, timestamp } objects.
 *
 * Each line is expected to start with "Doctor:" or "Patient:" (case-insensitive).
 * Lines that do not match either label are tagged UNKNOWN.
 *
 * @param raw - Raw multi-line diarized transcript from the agent.
 * @param timestamp - ISO timestamp to attach to every line (agent doesn't provide per-line timestamps).
 * @returns Parsed DiarizedLine array.
 */
function parseDiarizedTranscript(raw: string, timestamp: string): DiarizedLine[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const lower = line.toLowerCase();
      if (lower.startsWith("doctor:")) {
        return {
          speaker: "DOCTOR" as const,
          text: line.substring(line.indexOf(":") + 1).trim(),
          timestamp,
        };
      }
      if (lower.startsWith("patient:")) {
        return {
          speaker: "PATIENT" as const,
          text: line.substring(line.indexOf(":") + 1).trim(),
          timestamp,
        };
      }
      return { speaker: "UNKNOWN" as const, text: line, timestamp };
    });
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Doctor-facing in-person consultation recording screen.
 *
 * Captures both doctor and patient audio via the device microphone, streams
 * PCM frames to the diarization agent, and on completion calls the same
 * report-generation and persistence pipeline as the online consultation.
 *
 * @param fhirAppointmentId - FHIR Appointment.id for persistence and navigation.
 * @param doctorName        - Doctor's display name for the header.
 * @param patientName       - Patient's display name for the header.
 * @param patientId         - FHIR Patient.id for encounter creation.
 * @param practitionerId    - FHIR Practitioner.id for encounter creation.
 * @param orgId             - Active organisation ID.
 */
export function InPersonConsultation({
  fhirAppointmentId,
  doctorName,
  patientName,
  patientId,
  practitionerId,
  orgId,
}: InPersonConsultationProps) {
  const router = useRouter();

  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("idle");
  /** Rolling list of partial transcript lines shown during recording. */
  const [partials, setPartials] = useState<string[]>([]);
  /** Detected language code from the agent (e.g. "en", "ta"). */
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  /** Final diarized lines — populated only after the session completes. */
  const [diarizedLines, setDiarizedLines] = useState<DiarizedLine[] | null>(null);
  /** Elapsed seconds — ticked while recording. */
  const [elapsed, setElapsed] = useState(0);

  // Audio resource refs
  const wsRef = useRef<WebSocket | null>(null);
  const captureCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /**
   * Wall-clock instant recording began — stamped as the Encounter's
   * actual_period_start. Held as a timestamp rather than derived from
   * `elapsed`, because browsers throttle setInterval in a background tab and
   * the counter drifts low whenever the doctor switches away.
   */
  const startedAtRef = useRef<number | null>(null);

  // Scroll container refs — scrolled to bottom whenever their content grows
  const partialsScrollRef = useRef<HTMLDivElement | null>(null);
  const diarizedScrollRef = useRef<HTMLDivElement | null>(null);

  // ── Auto-scroll ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const el = partialsScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [partials]);

  useEffect(() => {
    const el = diarizedScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [diarizedLines]);

  // ── Elapsed timer ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (sessionStatus === "recording") {
      /* Stamp the start on the first entry into "recording" only — a pause and
         resume must not restart the clock mid-consultation. */
      startedAtRef.current ??= Date.now();
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionStatus]);

  // ── Teardown mic + WS (NOT closing WS — server needs silence to diarize) ────

  /**
   * Tears down the capture pipeline only (mic + AudioWorklet + AudioContext).
   * The WebSocket is intentionally left open so the server can detect the
   * resulting silence, trigger diarization, and emit the "final" event.
   */
  const teardownCapture = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.port.onmessage = null;
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    if (captureCtxRef.current && captureCtxRef.current.state !== "closed") {
      captureCtxRef.current.close();
    }
    captureCtxRef.current = null;
  }, []);

  /** Full teardown including WebSocket. Called on error or unmount. */
  const teardownAll = useCallback(() => {
    teardownCapture();
    if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) {
      wsRef.current.close();
    }
    wsRef.current = null;
  }, [teardownCapture]);

  // Ensure cleanup on unmount
  useEffect(() => () => teardownAll(), [teardownAll]);

  // ── End-call pipeline — mirrors DoctorConsult.handleEndCall ─────────────────

  /**
   * Runs the full end-call pipeline once the "final" diarization event arrives.
   * Builds the report, persists the consultation, and redirects to the review page.
   *
   * @param lines - Parsed diarized lines from the agent's "final" event.
   */
  const runEndCallPipeline = useCallback(
    async (lines: DiarizedLine[]) => {
      setSessionStatus("completing");

      // Build a plain-text conversation array for the report agent
      const conversation = lines
        .filter((l) => l.text.trim())
        .map((l) => `${l.speaker}: ${l.text.trim()}`);

      // Map to the virtual_conversation schema shape expected by completeConsultationAction
      const virtualConversation = lines.map((l) => ({
        speaker: l.speaker === "UNKNOWN" ? "PATIENT" : l.speaker as "DOCTOR" | "PATIENT",
        text: l.text,
        timestamp: l.timestamp,
      }));

      // Step 1: generate full report — non-fatal if it fails
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
          soapNote = (fullReport?.soap_report as Record<string, unknown>) ?? null;
        }
      } catch {
        /* non-fatal — still complete the consultation without a report */
      }

      // Step 2: persist transcript + reports, flip status to COMPLETED
      const [, completeErr] = await completeConsultationAction({
        payload: {
          fhir_appointment_id: fhirAppointmentId,
          virtual_conversation: virtualConversation,
          soap_note: soapNote ?? undefined,
          full_report: fullReport ?? undefined,
        },
      });

      if (completeErr) {
        toast.error("In-person consultation ended but report could not be saved.");
      } else {
        toast.success("In-person consultation completed");
      }

      // Step 3: mark the FHIR Appointment as fulfilled
      try {
        await updateAppointmentAction({
          payload: { id: fhirAppointmentId, status: "fulfilled" },
        });
      } catch {
        /* non-fatal */
      }

      /* Step 4: create the FHIR Encounter.

         actual_period_start/end record how long the visit actually ran. This is
         deliberately NOT written back to Appointment.minutes_duration: FHIR
         defines that as the *planned* length, so overwriting it would lose what
         was originally booked. */
      try {
        await createEncounterAction({
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
        /* non-fatal */
      }

      // Step 5: navigate to the post-consultation review page
      router.push(
        `/bezs/telemedicine/doctor/appointments/${fhirAppointmentId}/review`,
      );
    },
    [fhirAppointmentId, patientId, practitionerId, orgId, router],
  );

  // ── Start session ────────────────────────────────────────────────────────────

  /** Opens the WebSocket connection and starts the microphone capture pipeline. */
  const startSession = useCallback(async () => {
    if (sessionStatus !== "idle") return;

    setPartials([]);
    setDetectedLang(null);
    setDiarizedLines(null);
    setElapsed(0);
    setSessionStatus("connecting");

    try {
      // 1. Get auth token + WS URL from the server-side proxy endpoint
      const tokenRes = await fetch("/api/inperson-consultation-agent");
      if (!tokenRes.ok) {
        toast.error("Could not authenticate with diarization agent");
        setSessionStatus("idle");
        return;
      }
      const { token, wsUrl } = (await tokenRes.json()) as {
        token: string;
        wsUrl: string;
      };

      // 2. Open WebSocket (binary mode for PCM frames)
      console.log("[InPersonConsultation] connecting to WS:", wsUrl);
      const ws = new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;
      ws.binaryType = "arraybuffer";

      ws.onopen = async () => {
        console.log("[InPersonConsultation] WS connected");

        try {
          // 3. Request microphone — captures both doctor and patient in the room
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              sampleRate: 16000,
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true,
            },
          });
          mediaStreamRef.current = stream;

          // 4. AudioWorklet capture at 16 kHz (matches agent input rate)
          const captureCtx = new AudioContext({ sampleRate: 16000 });
          captureCtxRef.current = captureCtx;

          const blob = new Blob([PCM_WORKLET_CODE], {
            type: "application/javascript",
          });
          const workletUrl = URL.createObjectURL(blob);
          await captureCtx.audioWorklet.addModule(workletUrl);
          URL.revokeObjectURL(workletUrl);

          const micSource = captureCtx.createMediaStreamSource(stream);
          const workletNode = new AudioWorkletNode(
            captureCtx,
            "pcm-capture-processor",
          );
          workletNodeRef.current = workletNode;

          // Forward each frame as PCM-16 over the open WebSocket
          workletNode.port.onmessage = (e: MessageEvent<Float32Array>) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(float32ToPcm16(e.data));
            }
          };

          // Connect mic → worklet (NOT to destination — avoids feedback)
          micSource.connect(workletNode);
          setSessionStatus("recording");
        } catch (micErr) {
          toast.error("Microphone access denied");
          console.error("[InPersonConsultation] mic error:", micErr);
          teardownAll();
          setSessionStatus("idle");
        }
      };

      // 5. Handle incoming messages from the diarization agent
      ws.onmessage = (event: MessageEvent) => {
        // Skip binary echoes (agent should only send JSON, but guard anyway)
        if (event.data instanceof ArrayBuffer) return;

        try {
          const data = JSON.parse(event.data as string) as {
            type: string;
            text?: string;
            code?: string;
            transcript?: string;
            message?: string;
          };

          if (data.type === "partial" && data.text) {
            // Append rolling partial to the live panel
            setPartials((prev) => [...prev, data.text!]);
          }

          if (data.type === "language" && data.code) {
            setDetectedLang(data.code);
          }

          if (data.type === "final" && data.transcript) {
            // Diarization complete — show transcript and wait for doctor to confirm
            console.log("[InPersonConsultation] final transcript received");
            const timestamp = new Date().toISOString();
            const lines = parseDiarizedTranscript(data.transcript, timestamp);
            setDiarizedLines(lines);
            teardownAll(); // close WS; doctor reviews then clicks "Complete"
            setSessionStatus("done");
          }

          if (data.type === "error") {
            console.error("[InPersonConsultation] agent error:", data.message);
            toast.error("Diarization error", {
              description: data.message ?? "Unknown error from agent.",
            });
          }
        } catch (parseErr) {
          console.warn("[InPersonConsultation] unparseable message:", event.data, parseErr);
        }
      };

      ws.onerror = () => {
        toast.error("Connection error with diarization agent");
        teardownAll();
        setSessionStatus("idle");
      };

      ws.onclose = () => {
        // Reset to idle only on unexpected disconnect; don't clobber "done" or "completing"
        setSessionStatus((prev) =>
          prev === "recording" || prev === "connecting" ? "idle" : prev,
        );
      };
    } catch (err) {
      console.error("[InPersonConsultation] startSession error:", err);
      toast.error("Could not start in-person recording");
      teardownAll();
      setSessionStatus("idle");
    }
  }, [sessionStatus, teardownAll, runEndCallPipeline]);

  // ── Stop recording — triggers server-side VAD timeout + diarization ──────────

  /**
   * Stops the microphone tracks. The WebSocket stays open — the agent detects
   * the resulting silence, runs batch diarization, and emits the "final" event.
   */
  const stopRecording = useCallback(() => {
    if (sessionStatus !== "recording") return;
    teardownCapture(); // mic off; WS stays open
    setSessionStatus("finalizing");
  }, [sessionStatus, teardownCapture]);

  // ── Derived values ───────────────────────────────────────────────────────────

  const isRecording = sessionStatus === "recording";
  const isConnecting = sessionStatus === "connecting";
  const isFinalizing = sessionStatus === "finalizing";
  const isDone = sessionStatus === "done";
  const isCompleting = sessionStatus === "completing";
  const isBusy = isConnecting || isFinalizing || isCompleting;

  /** Formats elapsed seconds as MM:SS or H:MM:SS. */
  function formatElapsed(secs: number): string {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  }

  const statusDotClass = isRecording
    ? "bg-red-500 animate-pulse"
    : isFinalizing || isCompleting
      ? "bg-amber-400 animate-pulse"
      : isConnecting
        ? "bg-amber-400 animate-pulse"
        : isDone
          ? "bg-emerald-500"
          : "bg-muted-foreground";

  const statusLabel = isConnecting
    ? "Connecting..."
    : isRecording
      ? "Recording"
      : isFinalizing
        ? "Diarizing..."
        : isCompleting
          ? "Saving..."
          : isDone
            ? "Review transcript"
            : "Idle";

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3 w-full h-[calc(100dvh-156px)] overflow-hidden">

      {/* ── Header bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-secondary border border-border shrink-0">
        <div className="flex items-center gap-4">
          {/* Recording pulse indicator */}
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              {isRecording && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${statusDotClass}`} />
            </span>
            <span className={`text-xs font-semibold uppercase tracking-wider ${isRecording ? "text-red-500" : "text-muted-foreground"}`}>
              {isRecording ? "Live" : statusLabel}
            </span>
          </div>

          <div className="h-4 w-px bg-border" />

          <div className="text-sm leading-tight">
            <p className="text-muted-foreground text-xs">Doctor</p>
            <p className="font-medium text-secondary-foreground">{doctorName}</p>
          </div>

          {patientName && (
            <>
              <div className="h-4 w-px bg-border" />
              <div className="text-sm leading-tight">
                <p className="text-muted-foreground text-xs">Patient</p>
                <p className="font-medium text-secondary-foreground">{patientName}</p>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Elapsed timer — visible while recording */}
          {(isRecording || isFinalizing) && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground px-3 py-1 rounded-lg bg-background border border-border">
              <span className="font-mono tabular-nums text-xs">
                {formatElapsed(elapsed)}
              </span>
            </div>
          )}

          {/* Detected language badge */}
          {detectedLang && (
            <span className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full border">
              {detectedLang.toUpperCase()}
            </span>
          )}

          {/* Session controls */}
          {sessionStatus === "idle" && (
            <Button size="sm" onClick={startSession} className="gap-1.5">
              <Mic className="h-3.5 w-3.5" />
              Start Recording
            </Button>
          )}

          {isConnecting && (
            <Button size="sm" disabled className="gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Connecting...
            </Button>
          )}

          {isRecording && (
            <Button
              size="sm"
              variant="destructive"
              onClick={stopRecording}
              disabled={isBusy}
              className="gap-1.5"
            >
              <MicOff className="h-3.5 w-3.5" />
              Stop &amp; Diarize
            </Button>
          )}

          {isFinalizing && (
            <Button size="sm" disabled className="gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Diarizing...
            </Button>
          )}

          {/* Doctor reviews the transcript then confirms completion */}
          {isDone && (
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                if (diarizedLines) void runEndCallPipeline(diarizedLines);
              }}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Complete Consultation
            </Button>
          )}

          {isCompleting && (
            <Button size="sm" disabled className="gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving...
            </Button>
          )}
        </div>
      </div>

      {/* ── Body: two-column layout ── */}
      <div className="flex flex-1 gap-3 min-h-0">

        {/* Left: live partial transcripts */}
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Live Partials</span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {partials.length} segments
            </span>
          </div>

          <div ref={partialsScrollRef} className="flex-1 min-h-0 rounded-xl border bg-card overflow-auto p-4">
            {partials.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                {sessionStatus === "idle"
                  ? "Click \"Start Recording\" to begin the in-person consultation."
                  : isConnecting
                    ? "Connecting to diarization agent..."
                    : "Waiting for speech..."}
              </p>
            ) : (
              <div className="space-y-2">
                {partials.map((p, i) => (
                  <div
                    key={i}
                    className="rounded-lg border bg-muted/40 px-3 py-2 flex gap-2.5 items-start"
                  >
                    <span className="shrink-0 mt-0.5 text-[10px] font-mono font-semibold text-muted-foreground bg-muted border rounded px-1.5 py-0.5 leading-none">
                      {i + 1}
                    </span>
                    <p className="text-sm text-foreground leading-relaxed">{p}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: diarized transcript (visible after finalisation) or instructions */}
        <div className="w-[420px] flex flex-col gap-2 min-h-0 shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Diarized Transcript</span>
          </div>

          <div ref={diarizedScrollRef} className="flex-1 min-h-0 rounded-xl border bg-card overflow-auto p-4">
            {diarizedLines === null ? (
              <p className="text-sm text-muted-foreground italic">
                {isFinalizing
                  ? "Running speaker diarization..."
                  : "Final diarized transcript will appear here after you stop recording."}
              </p>
            ) : (
              <div className="space-y-2">
                {diarizedLines.map((line, i) => (
                  <div key={i} className="flex gap-2">
                    <span
                      className={`shrink-0 text-xs font-semibold w-16 pt-0.5 ${
                        line.speaker === "DOCTOR"
                          ? "text-blue-500"
                          : line.speaker === "PATIENT"
                            ? "text-violet-500"
                            : "text-muted-foreground"
                      }`}
                    >
                      {line.speaker === "DOCTOR"
                        ? "Doctor"
                        : line.speaker === "PATIENT"
                          ? "Patient"
                          : "Unknown"}
                    </span>
                    <p className="text-sm text-foreground leading-relaxed">{line.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
