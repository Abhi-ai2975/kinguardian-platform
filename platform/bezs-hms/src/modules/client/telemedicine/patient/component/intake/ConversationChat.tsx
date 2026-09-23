/**
 * ConversationChat — shared message thread UI for text and voice intake.
 *
 * Layer: client / telemedicine / patient / intake
 *
 * Renders committed messages plus an optional live-streaming transcript bubble
 * below them. Uses the ai-elements Conversation + Message primitives so the
 * thread auto-scrolls to the bottom as new content arrives.
 *
 * Used by: TextIntake (streaming text), VoiceIntake (Vapi transcript events).
 */

"use client";

import { Brain, MessageSquareIcon } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";

// ── Types ─────────────────────────────────────────────────────────────────────

/** A committed message in the conversation. */
export type ChatMessage = {
  /** Stable unique key for React reconciliation. */
  key: string;
  /** Speaker identity. */
  from: "user" | "assistant";
  /** Full text content of the committed message. */
  content: string;
};

// ── Sub-components ────────────────────────────────────────────────────────────

/** Animated typing-dot indicator shown while waiting for the first token. */
const TypingIndicator = () => (
  <Message from="assistant">
    <MessageContent>
      <div className="flex gap-2 items-center">
        <div className="bg-secondary w-fit rounded-full p-2">
          <Brain className="size-6" />
        </div>
        <div className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-secondary">
          <span className="size-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
          <span className="size-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
          <span className="size-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </MessageContent>
  </Message>
);

// ── Component ─────────────────────────────────────────────────────────────────

interface ConversationChatProps {
  /** Committed messages — appended after each exchange is complete. */
  messages: ChatMessage[];
  /** Partial text being streamed right now (empty string = nothing live). */
  liveTranscript: string;
  /** Which role is currently speaking (determines bubble side for live text). */
  liveRole: "user" | "assistant" | null;
  /** First letter of the patient's name — shown in the user avatar. */
  userName: string;
  /** Shows the typing-indicator dots while waiting for the first token. */
  isLoading?: boolean;
}

/**
 * Auto-scrolling conversation thread for patient intake sessions.
 *
 * @param messages - Settled exchange turns.
 * @param liveTranscript - Text currently being streamed; shown as a transient bubble.
 * @param liveRole - Speaker of the live transcript ("assistant" for AI, "user" for Vapi voice).
 * @param userName - Patient's display name (first letter used as avatar initial).
 * @param isLoading - Show typing dots while waiting for the first token.
 */
export function ConversationChat({
  messages,
  liveTranscript,
  liveRole,
  userName,
  isLoading,
}: ConversationChatProps) {
  const showTyping = isLoading && !liveTranscript;

  return (
    <Conversation className="relative flex-1 pb-14 border rounded-2xl">
      <ConversationContent>
        {messages.length === 0 && !liveTranscript && !showTyping ? (
          <ConversationEmptyState
            title="Start the conversation"
            description="Messages will appear here as the conversation progresses."
            icon={<MessageSquareIcon className="size-6" />}
          />
        ) : (
          <>
            {/* Committed messages */}
            {messages.map((message) => (
              <Message key={message.key} from={message.from}>
                <MessageContent>
                  <div className="flex gap-2 items-center">
                    {message.from === "assistant" ? (
                      <div className="bg-secondary w-fit rounded-full p-2">
                        <Brain className="size-6" />
                      </div>
                    ) : (
                      <div className="bg-primary/50 flex-1 w-fit rounded-full p-2">
                        <span className="size-6 flex items-center justify-center text-sm font-bold text-primary-foreground">
                          {userName?.[0] ?? "Y"}
                        </span>
                      </div>
                    )}
                    <MessageResponse>{message.content}</MessageResponse>
                  </div>
                </MessageContent>
              </Message>
            ))}

            {/* Typing dots — shown while waiting for the first streaming token */}
            {showTyping && <TypingIndicator />}

            {/* Live partial transcript — replaces typing dots once tokens arrive */}
            {liveTranscript && liveRole && (
              <Message from={liveRole}>
                <MessageContent>
                  <div className="flex gap-2 items-center">
                    {liveRole === "assistant" ? (
                      <div className="bg-secondary w-fit rounded-full p-2">
                        <Brain className="size-6" />
                      </div>
                    ) : (
                      <div className="bg-primary h-6 w-6 flex items-center justify-center rounded-full text-primary-foreground">
                        {userName?.[0] ?? "Y"}
                      </div>
                    )}
                    <MessageResponse>{liveTranscript}</MessageResponse>
                  </div>
                </MessageContent>
              </Message>
            )}
          </>
        )}
      </ConversationContent>

      <ConversationScrollButton />
    </Conversation>
  );
}
