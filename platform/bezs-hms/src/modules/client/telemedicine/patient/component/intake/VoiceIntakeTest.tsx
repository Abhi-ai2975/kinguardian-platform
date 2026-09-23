/**
 * VoiceIntakeTest — patient-facing voice intake powered by a custom WebSocket
 * voice agent (INTAKE_VOICE_AGENT_URL).
 *
 * Layer: client / telemedicine / patient / intake
 *
 * Flow:
 *  1. Patient clicks "Start Call":
 *     a. GET /api/intake-voice-agent → { token, wsUrl }
 *     b. WebSocket opened at wsUrl?token=...
 *     c. Microphone captured via AudioWorklet (inline Blob — avoids the
 *        deprecated ScriptProcessor API).
 *     d. Float32 mic samples → Int16 PCM @ 16 kHz → sent as raw ArrayBuffer.
 *
 *  2. Incoming WS messages build the conversation:
 *     - transcript     → live user speech bubble; committed as a settled user
 *                        message the moment the AI starts replying (text_delta
 *                        or assistant_text), mirroring turn-based chat.
 *     - text_delta     → appends to the live assistant transcript bubble.
 *     - assistant_text → commits the settled AI response, clears live state.
 *     - audio          → strips optional WAV header, decodes PCM @ 24 kHz,
 *                        schedules gapless playback via a linear scheduler.
 *     - error          → toast.
 *
 *  3. Patient clicks "End Call":
 *     a. Stops mic and WS cleanly.
 *     b. Generates clinical report via POST /api/assessment-plan-agent
 *        (non-fatal — intake saves even without it).
 *     c. createIntakeAction → DB record.
 *     d. updateIntakeAction(id, conversation, report) → status=COMPLETED.
 *     e. Opens IntakeCompleteModal.
 *
 * UI mirrors TextIntake: Brain-icon header with live status dot, ConversationChat
 * thread, Start Call / End Call button.
 *
 * Optimisations over the plain HTML reference:
 *  - AudioWorklet (inline Blob URL) replaces the deprecated ScriptProcessor.
 *  - All Audio/WebSocket resources tracked in refs; cleaned up on unmount.
 *  - Linear playback scheduler from the reference is preserved as-is.
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { Brain, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createIntakeAction,
  updateIntakeAction,
} from "@/modules/server/presentation/actions/intake";
import { ConversationChat, type ChatMessage } from "./ConversationChat";
import { IntakeCompleteModal } from "./IntakeCompleteModal";

// ── AudioWorklet processor source (inline — no public/ file required) ─────────

/**
 * AudioWorklet processor that forwards each captured input frame to the main
 * thread. Runs in an isolated AudioWorkletGlobalScope.
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

/** Props for VoiceIntakeTest. */
interface VoiceIntakeTestProps {
  /** FHIR Patient.id — stored alongside the intake record for doctor lookup. */
  patientFhirId?: number;
  /** Better Auth active organization id — scopes the intake to the tenant. */
  orgId?: string | null;
  /** Locale-prefixed base path for post-intake navigation. */
  basePath: string;
  /** Patient's display name — shown in the header and as avatar initial. */
  userName: string;
}

/** Connection/activity status driving header indicator and button label. */
type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "speaking";

/** Ending-phase steps (mirrors TextIntake endingPhase). */
type EndingPhase = "idle" | "report" | "saving";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converts a Float32 audio frame to an Int16 PCM ArrayBuffer.
 *
 * @param float32 - Raw microphone samples from AudioWorklet.
 * @returns PCM-16 LE ArrayBuffer ready to send over WebSocket.
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
 * Strips a WAV RIFF header (first 44 bytes) when present in a base64 chunk.
 * Middle-stream audio chunks may arrive with the header repeated.
 *
 * @param base64 - Incoming base64 audio payload.
 * @returns Clean base64 containing only raw PCM samples.
 */
function stripWavHeader(base64: string): string {
  // RIFF header starts with "RIFF" → base64 prefix is "UklGR"
  if (!base64.startsWith("UklGR")) return base64;
  const binary = atob(base64);
  if (binary.length <= 44) return base64;
  return btoa(binary.substring(44));
}

/**
 * Decodes a base64 PCM-16 mono payload and schedules it for gapless playback.
 *
 * @param base64      - PCM-16 LE audio encoded as base64.
 * @param ctx         - Playback AudioContext (24 kHz).
 * @param nextTimeRef - Mutable ref holding the next available start time.
 */
function scheduleAudioChunk(
  base64: string,
  ctx: AudioContext,
  nextTimeRef: { current: number },
): void {
  const clean = stripWavHeader(base64);
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const pcm = new Int16Array(bytes.buffer);
  if (pcm.length === 0) return;

  const audioBuffer = ctx.createBuffer(1, pcm.length, ctx.sampleRate);
  const channel = audioBuffer.getChannelData(0);
  for (let i = 0; i < pcm.length; i++) channel[i] = pcm[i] / 32768;

  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);

  // Linear scheduler — ensures chunks play back-to-back without gaps or overlaps
  const now = ctx.currentTime;
  if (nextTimeRef.current < now) nextTimeRef.current = now;
  source.start(nextTimeRef.current);
  nextTimeRef.current += audioBuffer.duration;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * WebSocket-based voice intake component.
 *
 * @param patientFhirId - Optional FHIR Patient.id for cross-referencing.
 * @param orgId         - Optional active organization id.
 * @param basePath      - Locale-prefixed base path.
 * @param userName      - Patient display name used for the avatar initial.
 */
export function VoiceIntakeTest({
  patientFhirId,
  orgId,
  basePath,
  userName,
}: VoiceIntakeTestProps) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [liveRole, setLiveRole] = useState<"user" | "assistant" | null>(null);
  const [endingPhase, setEndingPhase] = useState<EndingPhase>("idle");
  const [intakeId, setIntakeId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  // WebSocket
  const wsRef = useRef<WebSocket | null>(null);

  // Capture-side audio resources
  const captureCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Playback-side audio resources
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  /**
   * Holds the current (possibly still-growing) user speech transcript.
   * The backend sends `transcript` continuously while the user speaks.
   * It is committed as a settled chat message the moment the AI starts replying,
   * then reset so the next user turn starts fresh.
   */
  const pendingUserTranscriptRef = useRef<string>("");

  /**
   * Accumulates streaming agent text from incremental `type: "text"` events.
   * Committed as a settled assistant message when the next `transcript` event
   * arrives (user starts speaking again) or when the call ends.
   */
  const pendingAssistantTextRef = useRef<string>("");

  /**
   * Mirror of messages state in a ref so endCall can read the latest list
   * without being re-created on every render.
   */
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** Appends a committed message to both state and the mirror ref. */
  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => {
      const next = [...prev, msg];
      messagesRef.current = next;
      return next;
    });
  }, []);

  /**
   * Commits the pending user transcript as a settled message (if any), then
   * resets the pending state. Called just before the AI starts replying so
   * the user's turn appears in the thread before the AI response.
   */
  const flushPendingUserTranscript = useCallback(() => {
    const text = pendingUserTranscriptRef.current.trim();
    if (!text) return;
    pendingUserTranscriptRef.current = "";
    setLiveTranscript("");
    setLiveRole(null);
    addMessage({ key: nanoid(), from: "user", content: text });
  }, [addMessage]);

  /**
   * Commits any accumulated streaming agent text as a settled assistant message,
   * then resets live state. Called when a new user `transcript` event arrives
   * (implicit AI-turn-complete signal) or when the call ends.
   */
  const flushPendingAssistantText = useCallback(() => {
    const text = pendingAssistantTextRef.current.trim();
    if (!text) return;
    pendingAssistantTextRef.current = "";
    setLiveTranscript("");
    setLiveRole(null);
    setStatus("connected");
    addMessage({ key: nanoid(), from: "assistant", content: text });
  }, [addMessage]);

  // ── Teardown all audio + WS resources ────────────────────────────────────────

  const teardown = useCallback(() => {
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
    if (playbackCtxRef.current && playbackCtxRef.current.state !== "closed") {
      playbackCtxRef.current.close();
    }
    playbackCtxRef.current = null;
    nextPlayTimeRef.current = 0;
    if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) {
      wsRef.current.close();
    }
    wsRef.current = null;
  }, []);

  // Ensure cleanup on unmount
  useEffect(() => () => teardown(), [teardown]);

  // ── End call: generate report → create DB record → save → modal ──────────────

  /**
   * Stops the call, generates a clinical report, persists the intake, and
   * opens the completion modal — mirrors TextIntake.endChat exactly.
   */
  const endCall = useCallback(async () => {
    // Commit any final user speech and in-flight agent text before saving
    flushPendingUserTranscript();
    flushPendingAssistantText();
    teardown();
    setStatus("disconnected");
    setLiveTranscript("");
    setLiveRole(null);

    const finalMessages = messagesRef.current;
    if (finalMessages.length === 0) {
      toast.info("No conversation to save yet.");
      return;
    }

    try {
      // Step 1: generate clinical report (non-fatal — intake saves even without it)
      setEndingPhase("report");
      let report: unknown = undefined;
      try {
        const res = await fetch("/api/assessment-plan-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation: finalMessages.map((m) => {
              const speaker =
                m.from === "assistant" ? "appointment-intake-agent" : "patient";
              return `${speaker}: ${m.content}`;
            }),
          }),
        });
        if (res.ok) report = await res.json();
      } catch {
        /* non-fatal — carry on without report */
      }

      // Step 2: create DB record
      setEndingPhase("saving");
      const [created, createErr] = await createIntakeAction({
        payload: {
          userId: "",
          mode: "VOICE",
          patient_fhir_id: patientFhirId,
          org_id: orgId ?? undefined,
        },
      });
      if (createErr || !created) {
        toast.error("Failed to save intake session");
        return;
      }

      // Step 3: save conversation + report
      const [, updateErr] = await updateIntakeAction({
        payload: {
          id: created.id,
          conversation: finalMessages.map((m) => ({
            role: m.from === "user" ? "user" : "assistant",
            content: m.content,
          })),
          report: report as Record<string, unknown> | undefined,
        },
      });
      if (updateErr) {
        toast.error("Failed to save conversation");
        return;
      }

      setIntakeId(created.id);
      setShowModal(true);
    } finally {
      setEndingPhase("idle");
    }
  }, [flushPendingUserTranscript, flushPendingAssistantText, teardown, patientFhirId, orgId]);

  // ── Start call ────────────────────────────────────────────────────────────────

  const startCall = useCallback(async () => {
    if (status !== "disconnected") return;

    setMessages([]);
    messagesRef.current = [];
    pendingUserTranscriptRef.current = "";
    pendingAssistantTextRef.current = "";
    setLiveTranscript("");
    setLiveRole(null);
    setStatus("connecting");

    try {
      // 1. Get auth token + WS URL from the server-side proxy endpoint
      const tokenRes = await fetch("/api/intake-voice-agent");
      if (!tokenRes.ok) {
        toast.error("Could not authenticate with voice agent");
        setStatus("disconnected");
        return;
      }
      const { token, wsUrl } = (await tokenRes.json()) as {
        token: string;
        wsUrl: string;
      };

      // 2. Open WebSocket
      console.log("[VoiceIntakeTest] connecting to WS:", wsUrl);
      const ws = new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;
      ws.binaryType = "arraybuffer";

      // 3. Playback context — 24 kHz matches the backend TTS output rate
      const playCtx = new AudioContext({ sampleRate: 24000 });
      playbackCtxRef.current = playCtx;
      nextPlayTimeRef.current = 0;

      ws.onopen = async () => {
        console.log("[VoiceIntakeTest] WS connected");
        setStatus("connected");

        try {
          // 4. Request microphone access
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          mediaStreamRef.current = stream;
          console.log("[VoiceIntakeTest] mic access granted");

          // 5. Build AudioWorklet capture pipeline (16 kHz — matches agent input)
          const captureCtx = new AudioContext({ sampleRate: 16000 });
          captureCtxRef.current = captureCtx;

          // Register the worklet from an inline Blob URL (no public/ file needed)
          const blob = new Blob([PCM_WORKLET_CODE], {
            type: "application/javascript",
          });
          const workletUrl = URL.createObjectURL(blob);
          await captureCtx.audioWorklet.addModule(workletUrl);
          URL.revokeObjectURL(workletUrl);
          console.log(
            "[VoiceIntakeTest] AudioWorklet loaded, sending PCM frames",
          );

          const micSource = captureCtx.createMediaStreamSource(stream);
          const workletNode = new AudioWorkletNode(
            captureCtx,
            "pcm-capture-processor",
          );
          workletNodeRef.current = workletNode;

          // Forward each PCM frame over the open WebSocket
          workletNode.port.onmessage = (e: MessageEvent<Float32Array>) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(float32ToPcm16(e.data));
            }
          };

          // Connect: mic → worklet (NOT to destination — prevents mic feedback)
          micSource.connect(workletNode);
        } catch (micErr) {
          toast.error("Microphone access denied");
          console.error("[VoiceIntakeTest] mic error:", micErr);
          teardown();
          setStatus("disconnected");
        }
      };

      // 6. Handle incoming messages from the voice agent
      ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string) as {
            type: string;
            text?: string;
            audio?: string;
            message?: string;
          };
          console.log({ data });

          // Log every raw message so we can verify what the backend sends
          console.log("[VoiceIntakeTest] WS message:", {
            type: data.type,
            text: data.text?.slice(0, 100), // truncate long text
            hasAudio: !!data.audio,
          });

          if (data.type === "transcript" && data.text !== undefined) {
            // New user turn starting — commit any in-flight agent text first
            flushPendingAssistantText();
            // Backend streams the growing user transcript; show it live.
            // We do NOT commit it yet — wait until the AI starts replying.
            console.log("[VoiceIntakeTest] transcript:", data.text);
            pendingUserTranscriptRef.current = data.text;
            setLiveTranscript(data.text);
            setLiveRole("user");
          }

          if (data.type === "text" && data.text) {
            // Streaming agent text (backend sends incremental "text" events)
            console.log("[VoiceIntakeTest] text (agent):", data.text.slice(0, 100));
            flushPendingUserTranscript();
            pendingAssistantTextRef.current += data.text;
            setLiveTranscript(pendingAssistantTextRef.current);
            setLiveRole("assistant");
            setStatus("speaking");
          }

          if (data.type === "text_delta" && data.text) {
            // Fallback: some backends emit text_delta instead of text
            console.log("[VoiceIntakeTest] text_delta:", data.text);
            flushPendingUserTranscript();
            pendingAssistantTextRef.current += data.text;
            setLiveTranscript(pendingAssistantTextRef.current);
            setLiveRole("assistant");
            setStatus("speaking");
          }

          if (data.type === "assistant_text" && data.text) {
            // Settled AI response (some backends send full text at once)
            console.log("[VoiceIntakeTest] assistant_text:", data.text);
            flushPendingUserTranscript();
            pendingAssistantTextRef.current = "";
            addMessage({
              key: nanoid(),
              from: "assistant",
              content: data.text,
            });
            setLiveTranscript("");
            setLiveRole(null);
            setStatus("connected");
          }

          if (data.type === "audio" && data.audio && data.audio.trim()) {
            console.log(
              "[VoiceIntakeTest] audio chunk received, length:",
              data.audio.length,
            );
            const ctx = playbackCtxRef.current;
            if (ctx) {
              // Resume if the browser auto-suspended the context after creation
              if (ctx.state === "suspended") ctx.resume();
              scheduleAudioChunk(data.audio, ctx, nextPlayTimeRef);
            }
          }

          if (data.type === "error") {
            console.error("[VoiceIntakeTest] agent error:", data.message);
            toast.error("Voice agent error", {
              description: data.message ?? "Unknown error from agent.",
            });
          }
        } catch (parseErr) {
          console.warn(
            "[VoiceIntakeTest] unparseable raw message:",
            event.data,
            parseErr,
          );
        }
      };

      ws.onerror = (err) => {
        console.error("[VoiceIntakeTest] WS error:", err);
        toast.error("Connection error with voice agent");
      };

      ws.onclose = (event) => {
        console.log(
          "[VoiceIntakeTest] WS closed — code:",
          event.code,
          "reason:",
          event.reason,
        );
        setStatus((prev) =>
          prev === "connected" || prev === "speaking" ? "disconnected" : prev,
        );
        setLiveTranscript("");
        setLiveRole(null);
      };
    } catch (err) {
      console.error("[VoiceIntakeTest] startCall error:", err);
      toast.error("Could not start voice call");
      teardown();
      setStatus("disconnected");
    }
  }, [status, addMessage, flushPendingUserTranscript, flushPendingAssistantText, teardown]);

  // ── Derived UI values ─────────────────────────────────────────────────────────

  const isConnected = status === "connected" || status === "speaking";
  const isConnecting = status === "connecting";
  const isBusy = isConnecting || endingPhase !== "idle";

  const statusLabel =
    status === "disconnected"
      ? "Offline"
      : status === "connecting"
        ? "Connecting..."
        : status === "speaking"
          ? "Speaking..."
          : "Online";

  const statusDotClass =
    status === "disconnected"
      ? "bg-muted-foreground"
      : status === "connecting" || status === "speaking"
        ? "bg-amber-400 animate-pulse"
        : "bg-emerald-500";

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex flex-col gap-3 w-full overflow-hidden h-[calc(100dvh-156px)]">
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border bg-card shadow-sm">
          <div
            className={`bg-primary/10 rounded-full p-2 shrink-0 ${isConnected ? "animate-pulse" : ""}`}
          >
            <Brain className="size-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-none">Bezs AI</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Voice Intake Assistant
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`size-2 rounded-full ${statusDotClass}`} />
            <span className="text-xs text-muted-foreground">{statusLabel}</span>
          </div>
        </div>

        {/* ── Conversation thread ── */}
        <ConversationChat
          messages={messages}
          liveTranscript={liveTranscript}
          liveRole={liveRole}
          userName={userName}
        />

        {/* ── Call controls ── */}
        <div className="flex gap-2 items-center justify-center">
          {isConnected ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={endCall}
              disabled={endingPhase !== "idle"}
              className="px-6 rounded-2xl h-9"
            >
              {endingPhase === "report" ? (
                <>
                  <Loader2 className="animate-spin mr-1 size-3" />
                  Generating...
                </>
              ) : endingPhase === "saving" ? (
                <>
                  <Loader2 className="animate-spin mr-1 size-3" />
                  Saving...
                </>
              ) : (
                "End Call"
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={startCall}
              disabled={isBusy}
              className="px-6 rounded-2xl h-9"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="animate-spin mr-1 size-3" />
                  Connecting...
                </>
              ) : (
                "Start Call"
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Post-intake modal */}
      {showModal && intakeId && (
        <IntakeCompleteModal
          open={showModal}
          intakeId={intakeId}
          basePath={basePath}
        />
      )}
    </>
  );
}
