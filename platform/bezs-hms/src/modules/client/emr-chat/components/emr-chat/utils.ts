/**
 * utils.ts — pure helper functions for the EMR chat container.
 *
 * Layer: client / emr-chat / components / emr-chat
 *
 * No React hooks — these are plain utilities shared across the container,
 * its sub-hooks (useEmrWorkflow, useEmrSend, useEmrDispatch), and sub-components.
 */

import type { AnyComponentNode, MarkdownNode } from "@/modules/client/ai-hub/a2ui/types";
import { parseUI } from "@/modules/client/ai-hub/utils/mapUiSchemaDataV3";
import type { WorkflowDefinition, WorkflowStepDefinition } from "@/types/workflow";

/**
 * Wraps a plain markdown string in the minimal A2UI MarkdownNode shape so it
 * can be passed directly to the Renderer as an assistant message's `ui` prop.
 *
 * @param content - Markdown string to wrap.
 * @returns A MarkdownNode ready for the Renderer.
 */
export function buildMarkdownNode(content: string): MarkdownNode {
  return {
    id: crypto.randomUUID(),
    type: "Markdown",
    properties: { content: { literalString: content } },
  };
}

/**
 * Returns a workflow's steps sorted by sequence_number ascending.
 *
 * @param workflow - The full WorkflowDefinition.
 * @returns Steps in display/execution order.
 */
export function getSortedSteps(
  workflow: WorkflowDefinition,
): WorkflowStepDefinition[] {
  return [...workflow.workflow_steps].sort(
    (a, b) => a.sequence_number - b.sequence_number,
  );
}

/**
 * Parses a raw UI schema + step data payload into a component node tree that
 * the Renderer can render.  Returns null when no schema is provided or parsing
 * fails so callers can fall back to a Markdown node.
 *
 * @param ui       - UI schema object from the registry (nullable).
 * @param stepData - Resolved step data from the workflow/step endpoint.
 * @returns Parsed AnyComponentNode tree, or null on failure/absence.
 */
export function buildUiFromData(
  ui: unknown,
  stepData: unknown,
): AnyComponentNode | null {
  if (!ui) return null;
  try {
    return parseUI(JSON.stringify({ ui, data: stepData ?? null }));
  } catch {
    return null;
  }
}

/**
 * Derives a session title from the user's first message, capped at 60 chars.
 *
 * @param text - Raw user message text.
 * @returns Short title string for display in the session sidebar.
 */
export function titleFromMessage(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > 60 ? trimmed.slice(0, 57) + "…" : trimmed;
}
