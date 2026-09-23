/**
 * TextConsultation — patient-facing text chat AI consultation component.
 *
 * Layer: client / telemedicine / patient / component / consultation
 *
 * Mirrors TextIntake.tsx exactly in structure and streaming logic, but:
 *   - Calls /api/consultation-agent instead of /api/intake-agent
 *   - Persists to AiConsultation table via createAiConsultationAction / updateAiConsultationAction
 *   - Shows ConsultationCompleteModal (not IntakeCompleteModal) on completion
 *
 * Flow:
 *  1. Patient types freely — no DB record until they end the chat.
 *  2. Messages stream from /api/consultation-agent token by token.
 *     The AI agent session id is obtained lazily from the first response
 *     (X-Session-Id header or agent_end chunk) and reused for subsequent turns.
 *  3. "End Chat" button (lazy create-and-save):
 *     a. POST conversation to /api/assessment-plan-agent → clinical report (non-fatal).
 *     b. createAiConsultationAction → creates the DB record.
 *     c. updateAiConsultationAction(id, conversation, report) → status=COMPLETED.
 *     d. Opens ConsultationCompleteModal.
 */

"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { Brain, Loader2, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createAiConsultationAction,
  updateAiConsultationAction,
} from "@/modules/server/presentation/actions/ai-consultation/core.actions";
import { ConversationChat, type ChatMessage } from "../intake/ConversationChat";
import { ConsultationCompleteModal } from "./ConsultationCompleteModal";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Props for TextConsultation. */
interface TextConsultationProps {
  /** FHIR Patient.id — passed to createAiConsultationAction for doctor cross-reference. */
  patientFhirId?: number;
  /** Better Auth active organization id — scopes the session to the tenant. */
  orgId?: string | null;
  /** Locale-prefixed base path for post-consultation navigation. */
  basePath: string;
  /** Patient's display name — shown as avatar initial in the chat thread. */
  userName: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Text-based patient AI consultation chat.
 *
 * Streams AI responses from /api/consultation-agent. Generates a clinical
 * report on completion and persists everything via server actions.
 *
 * @param patientFhirId - Optional FHIR Patient.id for cross-reference.
 * @param orgId - Active org id scoping the record.
 * @param basePath - Locale-prefixed base path (e.g. "/en/bezs/telemedicine/patient").
 * @param userName - Patient display name, used as avatar initial.
 */
export function TextConsultation({
  patientFhirId,
  orgId,
  basePath,
  userName,
}: TextConsultationProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [endingPhase, setEndingPhase] = useState<"idle" | "report" | "saving">(
    "idle",
  );
  const [showModal, setShowModal] = useState(false);

  // AI agent session id — null until the first response sets it
  const [sessionId, setSessionId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const liveTextRef = useRef("");

  // ── Parse a single SSE/NDJSON chunk line — mirrors TextIntake parseChunkLine ─

  const parseChunkLine = useCallback(
    (
      raw: string,
    ): { token: string | null; done: boolean; sessionId?: string } => {
      const line = raw.startsWith("data:") ? raw.slice(5).trim() : raw.trim();
      if (!line || line === "[DONE]")
        return { token: null, done: line === "[DONE]" };
      if (
        raw.startsWith("event:") ||
        raw.startsWith("id:") ||
        raw.startsWith("retry:")
      )
        return { token: null, done: false };

      try {
        const parsed = JSON.parse(line);
        const { type, data } = parsed;
        if (type === "text_delta")
          return { token: data?.content ?? "", done: false };
        if (type === "agent_end")
          return { token: null, done: true, sessionId: parsed.session_id };
        if (type === "text_complete") return { token: null, done: false };
        if (["token", "message", "chunk", "stream", "text"].includes(type)) {
          const text =
            data?.content ??
            parsed.content ??
            parsed.text ??
            parsed.delta ??
            "";
          return { token: String(text), done: false };
        }
        if (["done", "end", "finish"].includes(type))
          return { token: null, done: true };
        if (Array.isArray(parsed.choices)) {
          const content = parsed.choices[0]?.delta?.content;
          if (content !== undefined)
            return { token: String(content), done: false };
          if (parsed.choices[0]?.finish_reason)
            return { token: null, done: true };
        }
        const flat = parsed.content ?? parsed.text ?? parsed.delta;
        if (typeof flat === "string") return { token: flat, done: false };
        if (typeof parsed === "string") return { token: parsed, done: false };
        return { token: null, done: false };
      } catch {
        return { token: line, done: false };
      }
    },
    [],
  );

  // ── Send a message and stream the response ────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: ChatMessage = { key: nanoid(), from: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsStreaming(true);
      liveTextRef.current = "";
      setLiveTranscript("");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/consultation-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, session_id: sessionId }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`Agent responded ${res.status}`);

        const headerSessionId = res.headers.get("X-Session-Id");
        if (headerSessionId) setSessionId(headerSessionId);

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let leftover = "";

        const appendToken = (token: string) => {
          liveTextRef.current += token;
          setLiveTranscript(liveTextRef.current);
        };

        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = (leftover + chunk).split("\n");
          leftover = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const result = parseChunkLine(line);
            if (result.sessionId) setSessionId(result.sessionId);
            if (result.token !== null) appendToken(result.token);
            if (result.done) break outer;
          }
        }
        if (leftover.trim()) {
          const result = parseChunkLine(leftover);
          if (result.sessionId) setSessionId(result.sessionId);
          if (result.token !== null) appendToken(result.token);
        }
      } catch (err: unknown) {
        if ((err as Error).name === "AbortError") {
          toast.info("Streaming cancelled.");
        } else {
          toast.error("Failed to get response. Please try again.");
        }
      } finally {
        const finalText = liveTextRef.current;
        liveTextRef.current = "";
        setLiveTranscript("");
        if (finalText.trim()) {
          setMessages((prev) => [
            ...prev,
            { key: nanoid(), from: "assistant", content: finalText },
          ]);
        }
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming, sessionId, parseChunkLine],
  );

  const cancelStream = () => abortRef.current?.abort();

  // ── End chat: generate report → create DB record → save → show modal ─────

  const endChat = async () => {
    if (isStreaming) cancelStream();
    if (messages.length === 0) {
      toast.info("No conversation to save yet.");
      return;
    }

    try {
      // Step 1: generate clinical report (non-fatal — session saves even without it)
      setEndingPhase("report");
      let report: unknown = undefined;
      try {
        const res = await fetch("/api/assessment-plan-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation: messages.map((m) => {
              const speaker =
                m.from === "assistant" ? "consultation-agent" : "patient";
              return `${speaker}: ${m.content}`;
            }),
          }),
        });
        if (res.ok) report = await res.json();
      } catch {
        /* non-fatal */
      }

      // Step 2: create the DB record
      setEndingPhase("saving");
      const [created, createErr] = await createAiConsultationAction({
        payload: {
          userId: "",
          mode: "TEXT",
          patient_fhir_id: patientFhirId,
          org_id: orgId ?? undefined,
        },
      });
      if (createErr || !created) {
        console.error("[endChat] createAiConsultationAction failed:", createErr);
        toast.error("Failed to save consultation session");
        return;
      }

      // Step 3: save conversation + report, flip status to COMPLETED
      const [, updateErr] = await updateAiConsultationAction({
        payload: {
          id: created.id,
          conversation: messages.map((m) => ({
            role: m.from === "user" ? "user" : "assistant",
            content: m.content,
          })),
          report: report as Record<string, unknown> | undefined,
        },
      });
      if (updateErr) {
        console.error("[endChat] updateAiConsultationAction failed:", updateErr);
        toast.error("Failed to save conversation");
        return;
      }

      setShowModal(true);
    } finally {
      setEndingPhase("idle");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex flex-col gap-3 w-full overflow-hidden h-[calc(100dvh-156px)]">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border bg-card shadow-sm">
          <div
            className={`bg-primary/10 rounded-full p-2 shrink-0 ${isStreaming ? "animate-pulse" : ""}`}
          >
            <Brain className="size-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-none">Bezs AI</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Consultation Agent
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`size-2 rounded-full ${isStreaming ? "bg-amber-400 animate-pulse" : "bg-emerald-500"}`}
            />
            <span className="text-xs text-muted-foreground">
              {isStreaming ? "Thinking..." : "Online"}
            </span>
          </div>
        </div>

        {/* Conversation thread */}
        <ConversationChat
          messages={messages}
          liveTranscript={liveTranscript}
          liveRole={isStreaming ? "assistant" : null}
          isLoading={isStreaming && !liveTranscript}
          userName={userName}
        />

        {/* Input row */}
        <div className="flex gap-2 items-center">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your symptoms or ask a question..."
            disabled={isStreaming || endingPhase !== "idle"}
            className="flex-1"
          />

          {/* Stop / Send */}
          {isStreaming ? (
            <Button
              size="icon"
              variant="outline"
              onClick={cancelStream}
              title="Stop"
            >
              <Square className="size-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || endingPhase !== "idle"}
            >
              <Send className="size-4" />
            </Button>
          )}

          {/* End Chat */}
          <Button
            size="sm"
            variant="destructive"
            onClick={endChat}
            disabled={
              endingPhase !== "idle" || (messages.length === 0 && !isStreaming)
            }
            className="px-4 rounded-2xl h-9"
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
              "End Chat"
            )}
          </Button>
        </div>
      </div>

      {/* Post-consultation modal */}
      {showModal && (
        <ConsultationCompleteModal open={showModal} basePath={basePath} />
      )}
    </>
  );
}
