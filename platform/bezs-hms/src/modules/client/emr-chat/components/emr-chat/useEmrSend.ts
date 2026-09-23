/**
 * useEmrSend — message-sending and workflow-triggering hooks for EMRChatContainer.
 *
 * Layer: client / emr-chat / components / emr-chat
 *
 * Encapsulates three callbacks:
 *
 *   handleWorkflowStartResponse — processes the JSON body from POST /api/workflow,
 *                                  shared by both send paths to avoid duplication.
 *   handleSend                  — sends a free-text message through the AI agent.
 *   triggerWorkflowById         — triggers a workflow directly by ID (from the
 *                                  WorkflowLauncher static-launch grid).
 */

import { useCallback } from "react";
import { useChatStore } from "@/modules/client/ai-hub/store/chat-store";
import { useEmrChatStore } from "../../stores/emr-chat.store";
import {
  createWorkflowStateAction,
  updateWorkflowStateAction,
} from "@/modules/server/presentation/actions/emr-chat/emr-chat.actions";
import { UI_SCHEMA_REGISTRY } from "@/modules/client/ai-hub/schemas/ui";
import type { WorkflowDefinition, WorkflowStepDefinition } from "@/types/workflow";
import { buildMarkdownNode, buildUiFromData, getSortedSteps } from "./utils";

/** Minimal persistMessage/ensureSession signatures shared between hooks. */
type PersistMessageFn = (
  sessionId: string,
  params: {
    role: "USER" | "ASSISTANT";
    content: string;
    type?: string;
    metadata?: Record<string, unknown>;
  },
) => Promise<void>;

type EnsureSessionFn = (firstMessageText?: string) => Promise<string>;

type LoadWorkflowStepFn = (
  workflow: WorkflowDefinition,
  stepIndex: number,
  ctx: Record<string, unknown>,
  persist?: boolean,
) => Promise<void>;

/** Parameters accepted by useEmrSend. */
export interface UseEmrSendParams {
  userId: string;
  orgId?: string | null;
  ensureSession: EnsureSessionFn;
  persistMessage: PersistMessageFn;
  loadWorkflowStep: LoadWorkflowStepFn;
  dbWorkflowStateId: string | null;
  setDbWorkflowStateId: (id: string | null) => void;
}

/** Shape returned by useEmrSend. */
export interface EmrSendHandlers {
  /**
   * Shared response handler for POST /api/workflow. Handles workflow_step,
   * error, and plain text responses. Called by both handleSend and
   * triggerWorkflowById so persistence and context-merge logic is never
   * duplicated.
   *
   * @param data      - Parsed response body from the workflow API.
   * @param sessionId - Active DB session ID for persistence calls.
   */
  handleWorkflowStartResponse: (
    data: Record<string, unknown>,
    sessionId: string,
  ) => Promise<void>;
  /** Sends the current input text through the AI agent. */
  handleSend: () => Promise<void>;
  /**
   * Starts a workflow directly by ID without going through the AI agent.
   * Used when the user clicks a card in the WorkflowLauncher.
   *
   * @param workflowId   - Stable workflow ID.
   * @param workflowName - Display name shown as the user's trigger message.
   */
  triggerWorkflowById: (workflowId: string, workflowName: string) => Promise<void>;
}

/**
 * Hook providing message-sending and workflow-trigger callbacks.
 *
 * @param params - Dependencies and configuration.
 * @returns Send callbacks consumed by EMRChatContainer.
 */
export function useEmrSend({
  userId,
  orgId,
  ensureSession,
  persistMessage,
  loadWorkflowStep,
  dbWorkflowStateId,
  setDbWorkflowStateId,
}: UseEmrSendParams): EmrSendHandlers {
  const {
    input,
    loading,
    addMessage,
    setInput,
    setLoading,
    mergeContext,
    setWorkflow,
    sessionContext,
  } = useChatStore();
  const { updateSessionTitle } = useEmrChatStore();

  /**
   * Processes the API response body from POST /api/workflow.
   * Handles the three response types:
   *   - workflow_step: renders the intro + step UI, creates the DB workflow state row.
   *   - error: renders a permission-denied card or a generic error message.
   *   - (default): renders the text reply from the agent.
   */
  const handleWorkflowStartResponse = useCallback(
    async (data: Record<string, unknown>, sessionId: string) => {
      if (data.type === "workflow_step") {
        const workflow = data.workflow as WorkflowDefinition;
        const step = data.step as WorkflowStepDefinition;
        const stepIndex: number = (data.stepIndex as number) ?? 0;
        const steps = getSortedSteps(workflow);

        // Show and persist the workflow introduction message.
        const introText =
          workflow.introduction ?? `Starting: **${workflow.name}**`;
        if (workflow.introduction) {
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            ui: buildMarkdownNode(introText),
          });
        }

        if (data.sessionContext)
          mergeContext(data.sessionContext as Record<string, unknown>);

        // Abandon any previous in-progress workflow before starting a new one.
        if (dbWorkflowStateId) {
          await updateWorkflowStateAction({
            id: dbWorkflowStateId,
            payload: { status: "ABANDONED" },
          });
          await persistMessage(sessionId, {
            role: "ASSISTANT",
            content: "Workflow was abandoned.",
            type: "WORKFLOW_ABANDONED",
          });
          setDbWorkflowStateId(null);
        }

        // Persist WORKFLOW_START and create the DB workflow state row.
        await persistMessage(sessionId, {
          role: "ASSISTANT",
          content: introText,
          type: "WORKFLOW_START",
        });

        const [wfStateRow] = await createWorkflowStateAction({
          payload: {
            sessionId,
            workflowDefinition: workflow as unknown as Record<string, unknown>,
            workflowId: workflow.id,
            workflowName: workflow.name,
            totalSteps: steps.length,
            sessionContext: {
              ...sessionContext,
              ...((data.sessionContext as Record<string, unknown>) ?? {}),
              user_id: userId,
              org_id: orgId,
            },
          },
        });

        if (wfStateRow) setDbWorkflowStateId(wfStateRow.id);

        // Context-type first steps auto-advance without rendering UI.
        if (step.step_type === "context") {
          const nextIndex =
            stepIndex + 1 < steps.length ? stepIndex + 1 : null;
          if (nextIndex !== null) {
            setWorkflow(workflow, nextIndex);
            await loadWorkflowStep(
              workflow,
              nextIndex,
              (data.sessionContext as Record<string, unknown>) ?? {},
            );
          }
          return;
        }

        const uiSchema = UI_SCHEMA_REGISTRY[step.ui?.schema ?? ""] ?? null;
        const parsedUi = buildUiFromData(uiSchema, {
          ...((data.stepData as Record<string, unknown>) ?? {}),
          ...((data.sessionContext as Record<string, unknown>) ?? {}),
        });

        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          ui:
            parsedUi ??
            buildMarkdownNode(
              `**${step.name}**${step.optional ? " (optional)" : ""} — ${step.description}`,
            ),
          workflowSnapshot: {
            workflowId: workflow.id,
            stepIndex,
            stepId: step.id,
            contextAtStep:
              (data.sessionContext as Record<string, unknown>) ?? {},
          },
        });

        setWorkflow(workflow, stepIndex);
      } else if (data.type === "error") {
        if (Array.isArray(data.missing_permissions)) {
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            permissionDenied: {
              message: data.message as string,
              missing_permissions: data.missing_permissions as string[],
            },
          });
          await persistMessage(sessionId, {
            role: "ASSISTANT",
            content: (data.message as string) ?? "Permission denied.",
            type: "TEXT",
          });
        } else {
          const errText = `⚠️ ${(data.message as string) ?? "Something went wrong."}`;
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            ui: buildMarkdownNode(errText),
          });
          await persistMessage(sessionId, {
            role: "ASSISTANT",
            content: errText,
            type: "TEXT",
          });
        }
      } else {
        const responseText =
          (data.message as string) ?? JSON.stringify(data, null, 2);
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          ui: buildMarkdownNode(responseText),
        });
        await persistMessage(sessionId, {
          role: "ASSISTANT",
          content: responseText,
          type: "TEXT",
        });
      }
    },
    [
      addMessage,
      mergeContext,
      setWorkflow,
      loadWorkflowStep,
      persistMessage,
      sessionContext,
      userId,
      orgId,
      dbWorkflowStateId,
      setDbWorkflowStateId,
    ],
  );

  /** Sends the current typed message through the AI agent. */
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    addMessage({ id: crypto.randomUUID(), role: "user", text });
    setInput("");
    setLoading(true);

    let sessionId: string;
    try {
      sessionId = await ensureSession(text);
    } catch {
      setLoading(false);
      return;
    }

    // Title is set from the first user message only.
    const isFirstMessage =
      useChatStore.getState().messages.filter((m) => m.role === "user")
        .length === 1;
    if (isFirstMessage) {
      const titleFromMsg = text.length > 60 ? text.slice(0, 57) + "…" : text;
      updateSessionTitle(sessionId, titleFromMsg);
    }

    await persistMessage(sessionId, { role: "USER", content: text });

    try {
      const res = await fetch("/api/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionContext: { ...sessionContext, user_id: userId, org_id: orgId },
        }),
      });
      await handleWorkflowStartResponse(await res.json(), sessionId);
    } catch (err) {
      const errText = `⚠️ Network error: ${err instanceof Error ? err.message : "Unknown error"}`;
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        ui: buildMarkdownNode(errText),
      });
      await persistMessage(sessionId, {
        role: "ASSISTANT",
        content: errText,
        type: "TEXT",
      });
    } finally {
      setLoading(false);
    }
  }, [
    input,
    loading,
    addMessage,
    setInput,
    setLoading,
    sessionContext,
    ensureSession,
    persistMessage,
    userId,
    orgId,
    updateSessionTitle,
    handleWorkflowStartResponse,
  ]);

  /**
   * Triggers a workflow directly by ID — the WorkflowLauncher sends this when
   * the user clicks a card. Bypasses the AI agent and calls the workflow API
   * with workflow_id instead of a message.
   */
  const triggerWorkflowById = useCallback(
    async (workflowId: string, workflowName: string) => {
      if (loading) return;

      addMessage({ id: crypto.randomUUID(), role: "user", text: workflowName });
      setLoading(true);

      let sessionId: string;
      try {
        sessionId = await ensureSession(workflowName);
      } catch {
        setLoading(false);
        return;
      }

      await persistMessage(sessionId, { role: "USER", content: workflowName });

      try {
        const res = await fetch("/api/workflow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflow_id: workflowId,
            sessionContext: {
              ...sessionContext,
              user_id: userId,
              org_id: orgId,
            },
          }),
        });
        await handleWorkflowStartResponse(await res.json(), sessionId);
      } catch (err) {
        const errText = `⚠️ Network error: ${err instanceof Error ? err.message : "Unknown error"}`;
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          ui: buildMarkdownNode(errText),
        });
        await persistMessage(sessionId, {
          role: "ASSISTANT",
          content: errText,
          type: "TEXT",
        });
      } finally {
        setLoading(false);
      }
    },
    [
      loading,
      addMessage,
      setLoading,
      sessionContext,
      ensureSession,
      persistMessage,
      userId,
      orgId,
      handleWorkflowStartResponse,
    ],
  );

  return { handleWorkflowStartResponse, handleSend, triggerWorkflowById };
}
