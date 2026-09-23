/**
 * SessionGreeting component.
 *
 * Layer: client / emr-chat / components
 *
 * Empty-state screen shown when no messages exist yet (new chat or blank session).
 * Displays a time-aware greeting and up to 5 quick-start workflow cards derived
 * from the user's permitted workflow list (fetched via TanStack Query — shares
 * the same cache as WorkflowLauncher so there is no duplicate network request).
 *
 * Clicking a card fires onTriggerWorkflow, which starts the workflow directly
 * without going through the AI agent. The "ask me anything" button fires
 * onSuggestion to pre-fill the chat input instead.
 */

"use client";

import { Stethoscope, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePermittedWorkflows } from "../queries/workflow.queries";

/** Maximum number of quick-start workflow cards to display. */
const MAX_SUGGESTIONS = 4;

/**
 * Returns a time-aware greeting string.
 *
 * @returns "Good morning", "Good afternoon", or "Good evening".
 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

interface SessionGreetingProps {
  /**
   * Called when the user clicks a workflow card.
   * Starts the workflow directly — the container switches to the chat view
   * and triggers the workflow by ID without going through the AI agent.
   *
   * @param workflowId   - Stable workflow ID sent to POST /api/workflow.
   * @param workflowName - Display name shown as the user's trigger message.
   */
  onTriggerWorkflow: (workflowId: string, workflowName: string) => void;
  /**
   * Called when the user clicks "Or ask me anything" — pre-fills the chat
   * input with the given text.
   *
   * @param prompt - Text to inject into the chat input.
   */
  onSuggestion: (prompt: string) => void;
}

/**
 * Empty-state greeting with quick-start permitted workflow cards.
 *
 * @param props.onTriggerWorkflow - Direct workflow trigger callback.
 * @param props.onSuggestion      - Text-input pre-fill callback.
 */
export function SessionGreeting({
  onTriggerWorkflow,
  onSuggestion,
}: SessionGreetingProps) {
  const { data: workflows, isLoading } = usePermittedWorkflows();

  const suggestions = workflows?.slice(0, MAX_SUGGESTIONS) ?? [];

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 px-4 text-center">
      {/* Brand mark */}
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
        <Stethoscope className="size-7 text-primary" />
      </div>

      {/* Greeting copy */}
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-semibold">{getGreeting()}</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Start a workflow below or describe what you need and I&apos;ll guide
          you through it.
        </p>
      </div>

      {/* Quick-start workflow cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {isLoading
          ? Array.from({ length: MAX_SUGGESTIONS }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))
          : suggestions.map((wf) => (
              <button
                key={wf.id}
                type="button"
                onClick={() => onTriggerWorkflow(wf.id, wf.name)}
                className={cn(
                  "group flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-left",
                  "transition-colors hover:bg-accent hover:border-primary/30",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{wf.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {wf.description}
                  </p>
                </div>
                <ArrowRight className="shrink-0 size-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
              </button>
            ))}
      </div>

      {/* Fallback text-input shortcut */}
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-muted-foreground"
        onClick={() => onSuggestion("What can you help me with?")}
      >
        Or ask me anything
      </Button>
    </div>
  );
}
