/**
 * WorkflowLauncher — quick-access grid of available clinical workflows.
 *
 * Layer: client / emr-chat / components / emr-chat
 *
 * Fetches the permission-filtered workflow list via usePermittedWorkflows
 * (TanStack Query) and renders it as a searchable, categorised card grid.
 * Each card represents one workflow the current user is allowed to run.
 * Clicking a card fires onTriggerWorkflow so the parent (EMRChatContainer)
 * can switch to the chat view and start the workflow directly — no agent needed.
 *
 * The permitted list is cached for 5 minutes so switching tabs does not
 * trigger a redundant round-trip.
 *
 * Search is client-side (the list is small and already in the cache).
 * Categories are derived from the workflow registry and shown as group headings.
 */

"use client";

import { useState, useMemo } from "react";
import { Search, Play, Loader2, AlertCircle, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PermittedWorkflow } from "@/app/api/workflow/permitted/route";
import { usePermittedWorkflows } from "../../queries/workflow.queries";

interface WorkflowLauncherProps {
  /**
   * Called when the user clicks a workflow card.
   * The parent should switch to the chat tab and start the workflow.
   *
   * @param workflowId   - Stable workflow ID sent as workflow_id to POST /api/workflow.
   * @param workflowName - Human-readable name shown as the trigger message in chat.
   */
  onTriggerWorkflow: (workflowId: string, workflowName: string) => void;
}

/**
 * Renders a searchable, category-grouped grid of workflows the current user
 * can launch with a single click, bypassing the AI agent.
 *
 * @param props.onTriggerWorkflow - Callback fired when the user selects a card.
 */
export function WorkflowLauncher({ onTriggerWorkflow }: WorkflowLauncherProps) {
  const [search, setSearch] = useState("");

  // Permission-filtered workflow list — cached for 5 minutes by TanStack Query.
  const {
    data: workflows = [],
    isLoading: loading,
    error,
  } = usePermittedWorkflows();

  // Client-side filter across name, description, and tags.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workflows;
    return workflows.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        w.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [workflows, search]);

  // Group by category, preserving registry order.
  const grouped = useMemo(() => {
    const map = new Map<string, PermittedWorkflow[]>();
    for (const w of filtered) {
      if (!map.has(w.category)) map.set(w.category, []);
      map.get(w.category)!.push(w);
    }
    return map;
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading workflows…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-destructive">
        <AlertCircle className="size-5" />
        <p>{error instanceof Error ? error.message : "Failed to load workflows"}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      {/* Search bar */}
      <div className="shrink-0 border-b bg-background px-4 py-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workflows…"
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Workflow grid */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        {grouped.size === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground gap-2">
            <Search className="size-8 opacity-30" />
            <p>No workflows match &ldquo;{search}&rdquo;</p>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            {Array.from(grouped.entries()).map(([category, items]) => (
              <section key={category}>
                <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {category}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((workflow) => (
                    <WorkflowCard
                      key={workflow.id}
                      workflow={workflow}
                      onTrigger={() => onTriggerWorkflow(workflow.id, workflow.name)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── WorkflowCard ──────────────────────────────────────────────────────────────

interface WorkflowCardProps {
  workflow: PermittedWorkflow;
  onTrigger: () => void;
}

/**
 * Individual workflow card in the launcher grid.
 *
 * @param props.workflow - Lean workflow metadata from the permitted endpoint.
 * @param props.onTrigger - Called when the card is clicked.
 */
function WorkflowCard({ workflow, onTrigger }: WorkflowCardProps) {
  const visibleTags = workflow.tags
    .filter((t) => !["fhir", "crud", "healthcare"].includes(t))
    .slice(0, 3);

  return (
    <button
      type="button"
      onClick={onTrigger}
      className={cn(
        "group relative flex flex-col gap-2 rounded-xl border bg-card p-4 text-left shadow-sm",
        "transition-all duration-150",
        "hover:border-primary/40 hover:shadow-md hover:bg-accent/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug text-card-foreground">
          {workflow.name}
        </p>
        <ChevronRight className="shrink-0 size-4 text-muted-foreground/40 group-hover:text-primary transition-colors mt-0.5" />
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
        {workflow.description}
      </p>

      {visibleTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-auto pt-1">
          {visibleTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="px-1.5 py-0 text-[10px] font-normal h-4"
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Hover overlay */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5",
          "rounded-b-xl py-1.5 text-xs font-medium text-primary",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          "bg-linear-to-t from-accent/80 to-transparent",
        )}
      >
        <Play className="size-3 fill-current" />
        Start
      </div>
    </button>
  );
}
