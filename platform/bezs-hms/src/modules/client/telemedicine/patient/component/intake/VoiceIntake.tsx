/**
 * VoiceIntake — patient-facing voice intake component powered by Vapi AI.
 *
 * Layer: client / telemedicine / patient / intake
 *
 * Flow:
 *  1. On mount: createIntakeAction → receives intake id.
 *  2. Patient clicks "Start Call" → Vapi.start(agentId).
 *  3. Transcript events (partial + final) build the conversation in real time.
 *  4. Patient clicks "End Call":
 *     a. updateIntakeAction(id, conversation) → status=COMPLETED.
 *     b. Opens IntakeCompleteModal.
 *
 * UI mirrors drgodly-mvp AiIntake exactly: two avatar cards (AI + patient),
 * ConversationChat thread, and a centered Start/End Call button.
 *
 * Env vars: NEXT_PUBLIC_VAPI_PUBLIC_KEY, NEXT_PUBLIC_VAPI_AGENT_ID.
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { Brain, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  createIntakeAction,
  updateIntakeAction,
} from "@/modules/server/presentation/actions/intake";
import { ConversationChat, type ChatMessage } from "./ConversationChat";
import { IntakeCompleteModal } from "./IntakeCompleteModal";

/** Vapi environment keys (public — safe to expose to the browser). */
const VAPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? "";
const VAPI_AGENT_ID = process.env.NEXT_PUBLIC_VAPI_AGENT_ID ?? "";

/** Props for VoiceIntake. */
interface VoiceIntakeProps {
  /** FHIR Patient.id — passed to createIntakeAction for doctor cross-reference. */
  patientFhirId?: number;
  /** Locale-prefixed base path for post-intake navigation. */
  basePath: string;
  /** Patient's display name — shown in the user avatar card. */
  userName: string;
}

/**
 * Voice-based patient intake using Vapi AI.
 *
 * Imports Vapi dynamically to avoid SSR crash (the SDK uses browser APIs).
 *
 * @param patientFhirId - Optional FHIR Patient.id.
 * @param basePath - Locale-prefixed base path.
 * @param userName - Patient display name.
 */
export function VoiceIntake({
  patientFhirId,
  basePath,
  userName,
}: VoiceIntakeProps) {
  const [intakeId, setIntakeId] = useState<number | null>(null);
  const [callStarted, setCallStarted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [currentRole, setCurrentRole] = useState<"user" | "assistant" | null>(
    null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showModal, setShowModal] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vapiRef = useRef<any>(null);
  const handlersRef = useRef({
    onCallStart: (() => {}) as () => void,
    onCallEnd: (() => {}) as () => void,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onMessage: (() => {}) as (message: any) => void,
    onSpeechStart: (() => {}) as () => void,
    onSpeechEnd: (() => {}) as () => void,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (() => {}) as (err: any) => void,
  });

  // ── Create intake session on mount ────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const [data, err] = await createIntakeAction({
        payload: { userId: "", mode: "VOICE", patient_fhir_id: patientFhirId },
      });
      if (err) {
        toast.error("Failed to start intake session");
        return;
      }
      setIntakeId(data!.id);
    }
    init();

    // Cleanup: stop the call if the page unmounts mid-session
    return () => {
      try {
        vapiRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, [patientFhirId]);

  const addMessage = useCallback((m: ChatMessage) => {
    setMessages((prev) => [...prev, m]);
  }, []);

  // ── End call: save intake → show modal ───────────────────────────────────
  const endCall = useCallback(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    async (currentMessages?: ChatMessage[]) => {
      if (!intakeId) return;
      setIsPending(true);

      try {
        // Remove listeners and stop Vapi
        const vapi = vapiRef.current;
        if (vapi) {
          const h = handlersRef.current;
          vapi.off("call-start", h.onCallStart);
          vapi.off("call-end", h.onCallEnd);
          vapi.off("message", h.onMessage);
          vapi.off("speech-start", h.onSpeechStart);
          vapi.off("speech-end", h.onSpeechEnd);
          vapi.off("error", h.onError);
          vapi.stop();
        }
        setCallStarted(false);
        setLiveTranscript("");
        setCurrentRole(null);
        vapiRef.current = null;

        toast.success("Call ended");

        const finalMessages = currentMessages ?? messages;
        await updateIntakeAction({
          payload: {
            id: intakeId,
            conversation: finalMessages.map((m) => ({
              role: m.from === "user" ? "user" : "assistant",
              content: m.content,
            })),
          },
        });

        setShowModal(true);
      } catch {
        toast.error("Error ending call");
      } finally {
        setIsPending(false);
      }
    },
    [intakeId, messages],
  );

  // ── Start Vapi call ───────────────────────────────────────────────────────
  const startCall = useCallback(async () => {
    if (!intakeId || !VAPI_PUBLIC_KEY || !VAPI_AGENT_ID) {
      toast.error("Voice intake is not configured");
      return;
    }

    setMessages([]);
    setLiveTranscript("");
    setCurrentRole(null);
    setIsConnecting(true);

    try {
      const { default: Vapi } = await import("@vapi-ai/web").catch(() => {
        toast.error("Failed to load voice library");
        setIsConnecting(false);
        return { default: null };
      });
      if (!Vapi) return;

      const vapi = new Vapi(VAPI_PUBLIC_KEY);
      vapiRef.current = vapi;
      vapi.start(VAPI_AGENT_ID);

      const onCallStart = () => {
        setCallStarted(true);
        setIsConnecting(false);
      };
      const onCallEnd = () => {
        setCallStarted(false);
        setIsConnecting(false);
        setLiveTranscript("");
        setCurrentRole(null);
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const onMessage = (message: any) => {
        try {
          if (message.type === "transcript") {
            const { role, transcriptType, transcript } = message;
            const from: "user" | "assistant" =
              role === "assistant" ? "assistant" : "user";
            if (transcriptType === "partial") {
              setLiveTranscript(transcript);
              setCurrentRole(from);
            } else if (transcriptType === "final") {
              addMessage({ key: nanoid(), from, content: transcript });
              setLiveTranscript("");
              setCurrentRole(null);
            }
          }
        } catch {
          /* ignore */
        }
      };
      const onSpeechStart = () => setCurrentRole("assistant");
      const onSpeechEnd = () => setCurrentRole("user");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const onError = (error: any) => {
        console.error("Vapi error", error);
        toast.error("Voice assistant error", {
          description: "Failed to connect with assistant.",
        });
      };

      handlersRef.current = {
        onCallStart,
        onCallEnd,
        onMessage,
        onSpeechStart,
        onSpeechEnd,
        onError,
      };

      vapi.on("call-start", onCallStart);
      vapi.on("call-end", onCallEnd);
      vapi.on("message", onMessage);
      vapi.on("speech-start", onSpeechStart);
      vapi.on("speech-end", onSpeechEnd);
      vapi.on("error", onError);
    } catch {
      toast.error("Could not start call");
      setIsConnecting(false);
    }
  }, [intakeId, addMessage]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col gap-4 w-full overflow-hidden h-[calc(100dvh-156px)]">
        {/* ── Title ── */}
        <h1 className="text-xl font-bold text-center">
          Talk to Your AI Intake Assistant
        </h1>

        {/* ── Avatar cards ── */}
        <div className="flex gap-4 justify-around items-center">
          {/* AI avatar */}
          <div className="flex flex-col items-center">
            <div
              className={`bg-secondary w-fit rounded-full p-4 mb-1 ${callStarted ? "animate-pulse" : ""}`}
            >
              <Brain className="size-10" />
            </div>
            <p className="font-bold">Bezs AI</p>
            <p className="text-xs text-muted-foreground">Intake Assistant</p>
            <Badge className="mt-4" variant="secondary">
              {callStarted
                ? "Connected"
                : isConnecting
                  ? "Connecting..."
                  : "Waiting..."}
            </Badge>
          </div>

          {/* User avatar */}
          <div className="flex flex-col items-center">
            <div className="bg-secondary text-center w-fit rounded-full p-4 mb-1">
              <p className="text-4xl size-10 flex items-center justify-center font-bold">
                {userName?.[0] ?? "Y"}
              </p>
            </div>
            <p className="font-bold">You</p>
            <p className="text-xs text-muted-foreground">{userName}</p>
            <Badge className="mt-4" variant="secondary">
              Ready
            </Badge>
          </div>
        </div>

        {/* ── Conversation thread ── */}
        <ConversationChat
          messages={messages}
          liveTranscript={liveTranscript}
          liveRole={currentRole}
          userName={userName}
        />

        {/* ── Call controls ── */}
        {isPending ? (
          <Button
            className="w-fit self-center px-6 h-7 rounded-2xl"
            size="sm"
            disabled
          >
            <Loader2 className="animate-spin mr-1" />
            Loading...
          </Button>
        ) : callStarted ? (
          <Button
            className="w-fit self-center px-6 h-7 rounded-2xl"
            size="sm"
            variant="destructive"
            onClick={() => endCall()}
          >
            End Call
          </Button>
        ) : (
          <Button
            className="w-fit self-center px-6 h-7 rounded-2xl"
            size="sm"
            onClick={startCall}
            disabled={isConnecting || !intakeId}
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
