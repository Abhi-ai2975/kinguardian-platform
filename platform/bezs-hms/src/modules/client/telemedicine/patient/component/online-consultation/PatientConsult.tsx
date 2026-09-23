/**
 * PatientConsult — patient-side virtual consultation room UI.
 *
 * Layer: client / telemedicine / patient / component / online-consultation
 *
 * Fetches a LiveKit JWT on mount via /api/livekit-token, resolves the LiveKit
 * server URL via /api/runtime-config, then renders the video room.
 * On disconnect the patient is redirected to their appointments list.
 *
 * Props come from the server page which resolves the consultation by
 * fhir_appointment_id. The patient does NOT call completeConsultationAction —
 * the doctor owns that on end-call.
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConsultationDetails {
  doctor: { name?: string; speciality: string };
  patient: { name?: string };
}

interface PatientConsultProps {
  /** LiveKit room ID stored in the Consultation record. */
  roomId: string;
  /** FHIR appointment integer ID — used for post-call navigation. */
  fhirAppointmentId: number;
  /** Display name of the authenticated patient. */
  participantName: string;
  /** Doctor and patient names shown in the header bar. */
  details: ConsultationDetails;
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
 * Patient consultation room — live video with an optional live transcript panel.
 * The patient can toggle the transcript sidebar but cannot end the consultation
 * on behalf of the doctor.
 *
 * @param roomId - LiveKit room ID.
 * @param fhirAppointmentId - Used for post-call navigation.
 * @param participantName - Display name shown in LiveKit.
 * @param details - Doctor/patient display names for the header.
 */
export function PatientConsult({
  roomId,
  fhirAppointmentId,
  participantName,
  details,
}: PatientConsultProps) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [elapsed, setElapsed] = useState(0);

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

  // Fetch LiveKit server URL at runtime (not baked in at build time)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/runtime-config", { cache: "no-store" });
        if (!res.ok) throw new Error("runtime-config failed");
        const data = await res.json();
        setLivekitUrl(data.livekitUrl);
      } catch {
        toast.error("Failed to connect", {
          description: "Please try again later.",
        });
      }
    })();
  }, []);

  // Elapsed time counter — starts once we have token + URL
  useEffect(() => {
    if (!token || !livekitUrl) return;
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [token, livekitUrl]);

  // Stable callback ref so TranscriptionPanel doesn't re-subscribe on re-renders
  const onTranscriptRef = useRef<(line: TranscriptLine) => void>(() => {});
  onTranscriptRef.current = (line) => setTranscripts((prev) => [...prev, line]);
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

  const handleLeave = () => {
    toast.success("You have left the consultation");
    router.push(`/bezs/telemedicine/patient/appointments/${fhirAppointmentId}`);
  };

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={livekitUrl}
      data-lk-theme="default"
      onDisconnected={handleLeave}
      className="!bg-transparent !shadow-none !h-[calc(100vh-182px)]"
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
              {showTranscript ? "Hide Transcript" : "Live Transcript"}
            </Button>

            <Button size="sm" variant="destructive" onClick={handleLeave}>
              Leave
            </Button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 gap-2 min-h-0">
          <div className="flex-1 min-h-0 h-full">
            <RoomControlUI />
          </div>

          {showTranscript && (
            <aside className="w-[380px] min-h-0 overflow-auto">
              <TranscriptionPanel
                roomId={roomId}
                transcripts={transcripts}
                onTranscript={handleTranscript}
              />
            </aside>
          )}
        </div>
      </div>
    </LiveKitRoom>
  );
}
