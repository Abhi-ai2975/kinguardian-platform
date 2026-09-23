/**
 * useEmrWorkflow — workflow step loading, skip, and abandon hooks.
 *
 * Layer: client / emr-chat / components / emr-chat
 *
 * Encapsulates the three workflow lifecycle callbacks:
 *
 *   loadWorkflowStep  — fetches a step from /api/workflow/step, handles context
 *                        steps by auto-advancing, and renders the step UI.
 *   skipCurrentStep   — skips an optional step, persists it, and advances.
 *   abandonWorkflow   — marks the active workflow as abandoned in the DB and
 *                        clears the in-memory workflow state.
 *
 * Both skipCurrentStep and abandonWorkflow interact with the dbWorkflowStateId
 * that is owned by the parent container and passed in as a param.
 */

import { useCallback } from "react";
import { useChatStore } from "@/modules/client/ai-hub/store/chat-store";
import { useEmrChatStore, emrChatStore } from "../../stores/emr-chat.store";
import { UI_SCHEMA_REGISTRY } from "@/modules/client/ai-hub/schemas/ui";
import {
  updateWorkflowStateAction,
} from "@/modules/server/presentation/actions/emr-chat/emr-chat.actions";
import type { WorkflowDefinition } from "@/types/workflow";
import { buildMarkdownNode, getSortedSteps, buildUiFromData } from "./utils";

/** Minimal persistMessage signature shared between hooks. */
type PersistMessageFn = (
  sessionId: string,
  params: {
    role: "USER" | "ASSISTANT";
    content: string;
    type?: string;
    metadata?: Record<string, unknown>;
  },
) => Promise<void>;

/** Parameters accepted by useEmrWorkflow. */
export interface UseEmrWorkflowParams {
  persistMessage: PersistMessageFn;
  dbWorkflowStateId: string | null;
  setDbWorkflowStateId: (id: string | null) => void;
}

/** Shape returned by useEmrWorkflow. */
export interface EmrWorkflowHandlers {
  /**
   * Fetches a workflow step from /api/workflow/step, resolves data via context
   * resolvers, and renders the result as an assistant message.  Context-type
   * steps are auto-advanced without rendering UI.
   *
   * @param workflow   - Full workflow definition.
   * @param stepIndex  - Zero-based step index to load.
   * @param ctx        - Current session context (FHIR IDs, etc.).
   * @param persist    - When true (default), writes the step label to the DB.
   */
  loadWorkflowStep: (
    workflow: WorkflowDefinition,
    stepIndex: number,
    ctx: Record<string, unknown>,
    persist?: boolean,
  ) => Promise<void>;
  /** Skips the current optional step, advances, and persists the skip. */
  skipCurrentStep: () => Promise<void>;
  /** Marks the active workflow as abandoned in the DB and clears in-memory state. */
  abandonWorkflow: () => Promise<void>;
}

/**
 * Hook providing workflow step management for EMRChatContainer.
 *
 * @param params - Persistence helpers and dbWorkflowStateId state.
 * @returns Workflow lifecycle callbacks.
 */
export function useEmrWorkflow({
  persistMessage,
  dbWorkflowStateId,
  setDbWorkflowStateId,
}: UseEmrWorkflowParams): EmrWorkflowHandlers {
  const { addMessage, setLoading, mergeContext, setWorkflow, clearSession } =
    useChatStore();
  const { activeSessionId } = useEmrChatStore();

  /**
   * Loads a workflow step from the server. Handles permission errors, context
   * steps (auto-advance), and normal UI steps. Persists the step label to the DB
   * so it appears in the message history on session resume.
   */
  const loadWorkflowStep = useCallback(
    async (
      workflow: WorkflowDefinition,
      stepIndex: number,
      ctx: Record<string, unknown>,
      persist = true,
    ) => {
      setLoading(true);
      try {
        const res = await fetch("/api/workflow/step", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workflow, stepIndex, sessionContext: ctx }),
        });
        const data = await res.json();

        if (data.type === "error") {
          if (Array.isArray(data.missing_permissions)) {
            addMessage({
              id: crypto.randomUUID(),
              role: "assistant",
              permissionDenied: {
                message: data.message,
                missing_permissions: data.missing_permissions,
              },
            });
          } else {
            addMessage({
              id: crypto.randomUUID(),
              role: "assistant",
              ui: buildMarkdownNode(`⚠️ ${data.message}`),
            });
          }
          return;
        }

        // All remaining steps were skipped by skip_unless conditions — complete workflow.
        if (data.type === "workflow_complete") {
          if (workflow.completion?.message) {
            addMessage({
              id: crypto.randomUUID(),
              role: "assistant",
              ui: buildMarkdownNode(workflow.completion.message),
              workflowComplete: { workflowId: workflow.id, workflowName: workflow.name },
            });
            if (persist) {
              const sid = emrChatStore.getState().activeSessionId;
              if (sid)
                await persistMessage(sid, {
                  role: "ASSISTANT",
                  content: workflow.completion.message,
                  type: "WORKFLOW_COMPLETE",
                  metadata: { workflowId: workflow.id, workflowName: workflow.name },
                });
            }
          }
          clearSession();
          return;
        }

        // Use effectiveStepIndex when the server skipped ahead via skip_unless.
        const effectiveStepIndex = data.effectiveStepIndex ?? stepIndex;
        const step = data.step ?? getSortedSteps(workflow)[effectiveStepIndex];
        if (data.sessionContext) mergeContext(data.sessionContext);

        // Auto-advance context steps — they resolve data without showing a form.
        if (step.step_type === "context") {
          const steps = getSortedSteps(workflow);
          const nextIndex =
            stepIndex + 1 < steps.length ? stepIndex + 1 : null;
          if (nextIndex !== null) {
            setWorkflow(workflow, nextIndex);
            await loadWorkflowStep(
              workflow,
              nextIndex,
              data.sessionContext ?? ctx,
            );
          } else {
            if (workflow.completion?.message) {
              addMessage({
                id: crypto.randomUUID(),
                role: "assistant",
                ui: buildMarkdownNode(workflow.completion.message),
                workflowComplete: { workflowId: workflow.id, workflowName: workflow.name },
              });
              if (persist) {
                const sid = emrChatStore.getState().activeSessionId;
                if (sid)
                  await persistMessage(sid, {
                    role: "ASSISTANT",
                    content: workflow.completion.message,
                    type: "WORKFLOW_COMPLETE",
                    metadata: { workflowId: workflow.id, workflowName: workflow.name },
                  });
              }
            }
            clearSession();
          }
          return;
        }

        const uiSchema = UI_SCHEMA_REGISTRY[step.ui?.schema ?? ""] ?? null;
        const parsedUi = buildUiFromData(uiSchema, {
          ...(data.stepData ?? {}),
          ...(data.sessionContext ?? {}),
        });
        const stepLabel = `**${step.name}**${step.optional ? " (optional)" : ""} — ${step.description}`;

        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          ui: parsedUi ?? buildMarkdownNode(stepLabel),
          workflowSnapshot: {
            workflowId: workflow.id,
            stepIndex: effectiveStepIndex,
            stepId: step.id,
            contextAtStep: ctx,
          },
        });

        if (persist) {
          const sid = emrChatStore.getState().activeSessionId;
          if (sid)
            await persistMessage(sid, {
              role: "ASSISTANT",
              content: stepLabel,
              type: "WORKFLOW_STEP",
            });
        }

        setWorkflow(workflow, effectiveStepIndex);
      } catch (err) {
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          ui: buildMarkdownNode(
            `⚠️ Failed to load step: ${err instanceof Error ? err.message : "Unknown error"}`,
          ),
        });
      } finally {
        setLoading(false);
      }
    },
    // loadWorkflowStep calls itself recursively for context steps — stable refs needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addMessage, setLoading, mergeContext, setWorkflow, clearSession, persistMessage],
  );

  /** Skips the current optional step, persists the skip, and loads the next step. */
  const skipCurrentStep = useCallback(async () => {
    // Read fresh state to avoid stale closure captures in async callbacks.
    const {
      activeWorkflow,
      currentStepIndex,
      sessionContext,
    } = useChatStore.getState();
    if (!activeWorkflow || currentStepIndex === null) return;

    const steps = getSortedSteps(activeWorkflow);
    const skippedStep = steps[currentStepIndex];
    const nextIndex =
      currentStepIndex + 1 < steps.length ? currentStepIndex + 1 : null;

    const skipText = `**${skippedStep.name}** was skipped.`;
    addMessage({
      id: crypto.randomUUID(),
      role: "assistant",
      ui: buildMarkdownNode(skipText),
    });
    if (activeSessionId)
      await persistMessage(activeSessionId, {
        role: "ASSISTANT",
        content: skipText,
        type: "WORKFLOW_STEP",
      });

    if (nextIndex !== null) {
      setWorkflow(activeWorkflow, nextIndex);
      if (dbWorkflowStateId)
        await updateWorkflowStateAction({
          id: dbWorkflowStateId,
          payload: { currentStepIndex: nextIndex },
        });
      await loadWorkflowStep(activeWorkflow, nextIndex, sessionContext);
    } else {
      if (activeWorkflow.completion?.message) {
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          ui: buildMarkdownNode(activeWorkflow.completion.message),
          workflowComplete: { workflowId: activeWorkflow.id, workflowName: activeWorkflow.name },
        });
        if (activeSessionId)
          await persistMessage(activeSessionId, {
            role: "ASSISTANT",
            content: activeWorkflow.completion.message,
            type: "WORKFLOW_COMPLETE",
            metadata: { workflowId: activeWorkflow.id, workflowName: activeWorkflow.name },
          });
      }
      if (dbWorkflowStateId)
        await updateWorkflowStateAction({
          id: dbWorkflowStateId,
          payload: { status: "COMPLETED", sessionContext },
        });
      clearSession();
      setDbWorkflowStateId(null);
    }
  }, [
    activeSessionId,
    dbWorkflowStateId,
    addMessage,
    clearSession,
    setWorkflow,
    persistMessage,
    loadWorkflowStep,
    setDbWorkflowStateId,
  ]);

  /** Marks the workflow as ABANDONED in the DB and clears the in-memory workflow state. */
  const abandonWorkflow = useCallback(async () => {
    if (dbWorkflowStateId)
      await updateWorkflowStateAction({
        id: dbWorkflowStateId,
        payload: { status: "ABANDONED" },
      });
    if (activeSessionId)
      await persistMessage(activeSessionId, {
        role: "ASSISTANT",
        content: "Workflow was abandoned.",
        type: "WORKFLOW_ABANDONED",
      });
    addMessage({
      id: crypto.randomUUID(),
      role: "assistant",
      ui: buildMarkdownNode("Workflow abandoned. How else can I help you?"),
    });
    clearSession();
    setDbWorkflowStateId(null);
  }, [
    dbWorkflowStateId,
    activeSessionId,
    addMessage,
    clearSession,
    persistMessage,
    setDbWorkflowStateId,
  ]);

  return { loadWorkflowStep, skipCurrentStep, abandonWorkflow };
}
