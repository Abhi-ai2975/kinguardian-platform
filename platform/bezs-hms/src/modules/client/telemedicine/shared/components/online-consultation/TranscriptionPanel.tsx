/**
 * TranscriptionPanel — live SSE transcript viewer for a consultation room.
 *
 * Layer: client / telemedicine / shared / components / online-consultation
 *
 * Connects to the Python LiveKit agent's SSE `/transcript-stream` endpoint on
 * mount and renders live transcript lines as they arrive. Auto-scrolls to the
 * latest message. Shared between PatientConsult and DoctorConsult.
 *
 * NEXT_PUBLIC_LIVEKIT_AGENT_URL must be set in environment variables.
 */

"use client";

import { AlertCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** A single transcript line received from the SSE stream. */
export type TranscriptLine = {
  /** Display name of the speaker (from LiveKit participant metadata). */
  name: string;
  /** Spoken text segment. */
  text: string;
  /** Formatted time string, e.g. "14:32". */
  timestamp: string;
};

interface TranscriptionPanelProps {
  /** LiveKit room ID — used to subscribe to the correct SSE stream. */
  roomId: string;
  /** Accumulated transcript lines controlled by the parent. */
  transcripts: TranscriptLine[];
  /**
   * Callback invoked on each new transcript line.
   * The parent appends it to its transcript array.
   */
  onTranscript: (line: TranscriptLine) => void;
}

/**
 * Subscribes to the Python agent's SSE transcript stream for a room and
 * renders incoming lines in a scrolling panel.
 *
 * @param roomId - The LiveKit room ID to stream transcripts for.
 * @param transcripts - Current transcript lines (controlled by parent).
 * @param onTranscript - Called with each new line as it arrives.
 */
export function TranscriptionPanel({
  roomId,
  transcripts,
  onTranscript,
}: TranscriptionPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Keep a stable ref to onTranscript so the SSE effect doesn't reconnect
  // every render when the parent passes an inline function reference.
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  });

  // Tell the Python agent to attach a transcriber to this room.
  // Without this call the agent never starts producing transcript events and
  // the SSE stream below stays silent.
  useEffect(() => {
    fetch("/api/livekit-start-transcriber", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    }).catch((err) => {
      console.error("[TranscriptionPanel] failed to start transcriber:", err);
    });
  }, [roomId]);

  // Subscribe to the SSE transcript stream from the Python agent.
  // Dependency array is [roomId] only — onTranscript is accessed via ref above
  // so changing the callback never causes a reconnect.
  useEffect(() => {
    setError(null);
    const agentUrl = process.env.NEXT_PUBLIC_LIVEKIT_AGENT_URL;

    if (!agentUrl) {
      setError("Transcript stream unavailable (agent URL not configured)");
      return;
    }

    const eventSource = new EventSource(
      `${agentUrl}/transcript-stream?roomId=${roomId}`,
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.text) {
          let timeStr = "";
          try {
            timeStr = new Date(data.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
          } catch {
            // timestamp unavailable — leave empty
          }
          setError(null);
          onTranscriptRef.current({
            timestamp: timeStr,
            name: data.participantName ?? "Unknown",
            text: data.text,
          });
        }
      } catch {
        setError("Failed to parse transcript");
      }
    };

    eventSource.onerror = () => {
      setError("Transcript stream disconnected");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [roomId]);

  // Auto-scroll to the bottom on each new transcript line
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  return (
    <div className="bg-secondary rounded-md flex flex-col overflow-y-auto h-full">
      <div className="p-4 border-b border-border font-semibold text-foreground/90">
        Live Transcript
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <p className="text-destructive inline-flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        )}

        {!error && transcripts.length === 0 && (
          <div className="text-muted-foreground text-sm text-center italic mt-10">
            Waiting for speech...
          </div>
        )}

        {!error &&
          transcripts.map((line, i) => (
            <div key={i} className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-muted-foreground font-mono">
                  [{line.timestamp}]
                </span>
                <span className="text-sm font-semibold text-primary">
                  {line.name}
                </span>
              </div>
              <p className="text-foreground/80 text-sm pl-1">{line.text}</p>
            </div>
          ))}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
