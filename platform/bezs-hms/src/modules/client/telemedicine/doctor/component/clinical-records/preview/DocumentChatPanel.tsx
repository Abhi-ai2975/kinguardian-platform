/**
 * DocumentChatPanel — ask-the-document chat, right of the split.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / preview
 *
 * UI only. There is no agent behind this yet: messages are held in local state
 * and nothing is sent anywhere. It is built so wiring it later means replacing
 * `handleSend`'s placeholder reply with a fetch, and nothing else.
 *
 * The disabled state is deliberate and visible. A chat box that looks live but
 * answers with canned text would be read as a real answer about a real clinical
 * document, which is the one thing this must not do while unwired.
 */

"use client";

import { useRef, useState } from "react";
import { ArrowUp, Bot, Sparkles, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Starter questions, shown while the thread is empty.
 *
 * Phrased as things a doctor would actually ask of a result rather than generic
 * prompts — they double as a statement of what the feature is meant to answer.
 */
const SUGGESTED_PROMPTS = [
  "What's abnormal in this result?",
  "Summarise the key findings",
  "Which values are outside the reference range?",
  "What follow-up would you suggest?",
];

// ── Types ─────────────────────────────────────────────────────────────────────

/** One turn in the thread. */
interface ChatMessage {
  id: string;
  role: "doctor" | "assistant";
  text: string;
}

interface DocumentChatPanelProps {
  /** Filename, shown in the empty state so the thread has context. */
  fileTitle: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Chat thread for questions about the previewed document.
 *
 * @param fileTitle - Filename shown in the empty state.
 */
export function DocumentChatPanel({ fileTitle }: DocumentChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Appends the doctor's question and a placeholder reply.
   *
   * @param text - The question. Ignored when blank.
   */
  function handleSend(text: string) {
    const question = text.trim();
    if (!question) return;

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "doctor", text: question },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        /* Placeholder, worded so it cannot be mistaken for an answer. */
        text: "Document chat isn't connected yet — this is a preview of the interface. Once wired, the answer to your question will appear here.",
      },
    ]);
    setDraft("");
    inputRef.current?.focus();
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── Unwired notice ── */}
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2">
        <Sparkles className="size-3.5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Interface preview — not connected to an assistant yet
        </p>
        <Badge variant="outline" className="ml-auto text-[10px] font-normal">
          Coming soon
        </Badge>
      </div>

      {/* ── Thread ── */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          {messages.length === 0 ? (
            <div className="space-y-4 py-6">
              <div className="space-y-1.5 text-center">
                <Bot className="mx-auto size-8 text-muted-foreground/40" />
                <p className="text-sm font-medium">Ask about this document</p>
                <p className="text-xs text-muted-foreground">
                  {fileTitle
                    ? `Questions about ${fileTitle} will be answered here.`
                    : "Questions about this file will be answered here."}
                </p>
              </div>

              <div className="space-y-1.5">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className="w-full rounded-md border px-3 py-2 text-left text-xs transition-colors hover:bg-muted/60"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => <ChatTurn key={m.id} message={m} />)
          )}
        </div>
      </ScrollArea>

      {/* ── Composer ── */}
      <div className="border-t p-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              /* Enter sends, Shift+Enter breaks the line — the convention in
                 every chat box a doctor already uses. */
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(draft);
              }
            }}
            placeholder="Ask a question about this document…"
            className="max-h-32 min-h-10 resize-none text-sm"
          />
          <Button
            type="button"
            size="icon"
            className="size-9 shrink-0"
            disabled={draft.trim().length === 0}
            onClick={() => handleSend(draft)}
            aria-label="Send question"
          >
            <ArrowUp className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Internal ──────────────────────────────────────────────────────────────────

/**
 * One message bubble.
 *
 * @param message - The turn to render.
 */
function ChatTurn({ message }: { message: ChatMessage }) {
  const isDoctor = message.role === "doctor";

  return (
    <div className={cn("flex gap-2.5", isDoctor && "flex-row-reverse")}>
      <div
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full",
          isDoctor ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        {isDoctor ? <User className="size-3" /> : <Bot className="size-3" />}
      </div>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
          isDoctor ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {message.text}
      </div>
    </div>
  );
}
