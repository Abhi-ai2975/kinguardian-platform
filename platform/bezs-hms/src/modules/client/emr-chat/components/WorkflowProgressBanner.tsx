/**
 * WorkflowProgressBanner component.
 *
 * Layer: client / emr-chat / components
 *
 * Sticky banner rendered between the topbar and the message list when a
 * FHIR workflow is currently in progress. Shows the workflow name, a step
 * progress indicator (e.g. "Step 2 of 5"), and an Abandon button.
 *
 * Visibility: shown only when activeWorkflow !== null and workflow is running.
 * Hidden once the workflow completes or is abandoned.
 */

"use client";

import { Activity, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface WorkflowProgressBannerProps {
  workflowName: string;
  currentStepIndex: number;
  totalSteps: number;
  /** Called when the user clicks Abandon. */
  onAbandon: () => void;
}

/**
 * Renders a compact workflow progress strip with a progress bar and abandon action.
 *
 * @param workflowName - Human-readable workflow name.
 * @param currentStepIndex - Zero-based index of the current step.
 * @param totalSteps - Total number of steps in the workflow.
 * @param onAbandon - Callback invoked when the user abandons the workflow.
 */
export function WorkflowProgressBanner({
  workflowName,
  currentStepIndex,
  totalSteps,
  onAbandon,
}: WorkflowProgressBannerProps) {
  const percent = totalSteps > 0 ? Math.round(((currentStepIndex) / totalSteps) * 100) : 0;

  return (
    <div className="flex flex-col gap-1 px-4 py-2.5 border-b border-border bg-primary/5 shrink-0">
      <div className="flex items-center gap-2">
        <Activity className="size-3.5 text-primary shrink-0" />
        <span className="flex-1 text-xs font-medium truncate text-primary">
          {workflowName}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">
          Step {currentStepIndex + 1} of {totalSteps}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground hover:text-destructive"
          onClick={onAbandon}
          aria-label="Abandon workflow"
        >
          <X className="size-3" />
        </Button>
      </div>
      <Progress value={percent} className="h-1" />
    </div>
  );
}
