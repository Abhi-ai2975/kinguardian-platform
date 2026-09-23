/**
 * MessageList — scrollable conversation message list for EMRChatContainer.
 *
 * Layer: client / emr-chat / components / emr-chat
 *
 * Renders the full conversation history including:
 *   - User text bubbles
 *   - Assistant Markdown / A2UI component messages (via Renderer)
 *   - Tool-call detail cards (A2UI form submissions)
 *   - Permission-denied error cards
 *   - A loading skeleton while the AI is responding
 *   - A SessionGreeting with suggestion chips when the conversation is empty
 *
 * The containerRef prop is attached to the outer scroll div so the parent can
 * call el.scrollTo({ top: el.scrollHeight }) without bubbling to the page body.
 */

import { Bot, User, RotateCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Renderer } from "@/modules/client/ai-hub/a2ui/rendering/renderer";
import type { IMessageProcessor } from "@/modules/client/ai-hub/a2ui/rendering/processor";
import type { ChatMessage } from "@/modules/client/ai-hub/store/chat-store";
import { SessionGreeting } from "../SessionGreeting";
import { ToolCallDetails } from "./ToolCallDetails";
import { PermissionDeniedMessage } from "./PermissionDeniedMessage";

interface MessageListProps {
  messages: ChatMessage[];
  loading: boolean;
  /**
   * Ref attached to the outer scrollable container div so the parent can
   * scroll to bottom via `el.scrollTo(...)` without touching the page body.
   */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Shared processor instance from the container (singleton per session). */
  processor: IMessageProcessor;
  /**
   * Called when the user clicks a quick-start workflow card in the greeting.
   * Starts the workflow directly without going through the AI agent.
   *
   * @param workflowId   - Stable workflow ID.
   * @param workflowName - Display name shown as the user's trigger message.
   */
  onTriggerWorkflow: (workflowId: string, workflowName: string) => void;
  /**
   * Called when the user clicks the "ask me anything" button in the greeting.
   * Pre-fills the chat input with the prompt text.
   *
   * @param prompt - The suggestion text to inject into the input.
   */
  onSuggestion: (prompt: string) => void;
}

/**
 * Scrollable list of chat messages. Renders the empty-state greeting when
 * there are no messages yet.
 *
 * @param props.messages           - Current message list from the Zustand store.
 * @param props.loading            - True while waiting for an API response.
 * @param props.containerRef       - Ref for the outer scroll container (used for scroll-to-bottom).
 * @param props.processor          - IMessageProcessor for rendering A2UI components.
 * @param props.onTriggerWorkflow  - Direct workflow trigger from the greeting cards.
 * @param props.onSuggestion       - Injects a suggested prompt into the input.
 */
export function MessageList({
  messages,
  loading,
  containerRef,
  processor,
  onTriggerWorkflow,
  onSuggestion,
}: MessageListProps) {
  return (
    // overscroll-y-contain prevents scroll chaining to the page body when the
    // user reaches the top or bottom of the list.
    <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain">
      <div className="px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <SessionGreeting
              onTriggerWorkflow={onTriggerWorkflow}
              onSuggestion={onSuggestion}
            />
          ) : (
            <div className="flex flex-col gap-5">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3",
                    msg.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="shrink-0 flex size-8 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="size-4 text-primary" />
                    </div>
                  )}

                  <div
                    className={cn(
                      msg.role === "user"
                        ? "max-w-[70%]"
                        : "flex-1 min-w-0",
                    )}
                  >
                    {msg.text && (
                      <p className="inline-block rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground leading-relaxed">
                        {msg.text}
                      </p>
                    )}

                    {msg.ui && (
                      <div
                        className={cn(
                          msg.role === "assistant" &&
                            "rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3",
                        )}
                      >
                        <Renderer
                          processor={processor}
                          surfaceId={`surface-${msg.id}`}
                          component={msg.ui}
                        />
                      </div>
                    )}

                    {msg.toolCall && (
                      <div className="mt-2">
                        <ToolCallDetails toolCall={msg.toolCall} />
                      </div>
                    )}

                    {msg.permissionDenied && (
                      <div className="mt-2">
                        <PermissionDeniedMessage
                          message={msg.permissionDenied.message}
                          missingPermissions={
                            msg.permissionDenied.missing_permissions
                          }
                        />
                      </div>
                    )}

                    {/* Re-run button on workflow completion messages */}
                    {msg.workflowComplete && (
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs h-7"
                          onClick={() =>
                            onTriggerWorkflow(
                              msg.workflowComplete!.workflowId,
                              msg.workflowComplete!.workflowName,
                            )
                          }
                        >
                          <RotateCcw className="size-3" />
                          Run again
                        </Button>
                      </div>
                    )}
                  </div>

                  {msg.role === "user" && (
                    <div className="shrink-0 flex size-8 items-center justify-center rounded-full bg-muted">
                      <User className="size-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {/* Loading skeleton while waiting for the AI response */}
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="shrink-0 flex size-8 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="size-4 text-primary" />
                  </div>
                  <div className="flex gap-2 items-center rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3">
                    <Skeleton className="h-2 w-16 rounded" />
                    <Skeleton className="h-2 w-24 rounded" />
                    <Skeleton className="h-2 w-10 rounded" />
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
