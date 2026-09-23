/**
 * useEmrDispatch — A2UI form-submit dispatch listener for EMRChatContainer.
 *
 * Layer: client / emr-chat / components / emr-chat
 *
 * Registers a "dispatch" event listener on the IMessageProcessor that is fired
 * whenever an A2UI component (form, button, etc.) submits user action data.
 *
 * On each dispatch the hook:
 *   1. Adds a pending tool-call bubble to the message list.
 *   2. Sends the form data to POST /api/workflow/submit.
 *   3. On success: persists the tool call, advances the workflow, and loads the
 *      next step (or shows the completion message).
 *   4. On failure: updates the tool-call bubble to "error" and persists it.
 *
 * State is always read fresh from useChatStore.getState() to avoid stale
 * closure captures in the async listener body.
 */

import { useEffect } from "react";
import { useChatStore } from "@/modules/client/ai-hub/store/chat-store";
import { emrChatStore } from "../../stores/emr-chat.store";
import type { IMessageProcessor } from "@/modules/client/ai-hub/a2ui/rendering/processor";
import {
  updateWorkflowStateAction,
  addStepSubmissionAction,
} from "@/modules/server/presentation/actions/emr-chat/emr-chat.actions";
import type { WorkflowDefinition } from "@/types/workflow";
import { buildMarkdownNode, getSortedSteps } from "./utils";

/** Minimal type aliases reused below. */
type PersistMessageFn = (
  sessionId: string,
  params: {
    role: "USER" | "ASSISTANT";
    content: string;
    type?: string;
    metadata?: Record<string, unknown>;
  },
) => Promise<void>;

type LoadWorkflowStepFn = (
  workflow: WorkflowDefinition,
  stepIndex: number,
  ctx: Record<string, unknown>,
  persist?: boolean,
) => Promise<void>;

/** Parameters accepted by useEmrDispatch. */
export interface UseEmrDispatchParams {
  /** The shared IMessageProcessor instance created in the container. */
  processor: IMessageProcessor;
  dbWorkflowStateId: string | null;
  setDbWorkflowStateId: (id: string | null) => void;
  loadWorkflowStep: LoadWorkflowStepFn;
  persistMessage: PersistMessageFn;
}

/**
 * Registers the A2UI dispatch listener on the processor for the lifetime of
 * the component. Returns nothing — purely a side-effect hook.
 *
 * @param params - Processor instance, DB state, and workflow callbacks.
 */
export function useEmrDispatch({
  processor,
  dbWorkflowStateId,
  setDbWorkflowStateId,
  loadWorkflowStep,
  persistMessage,
}: UseEmrDispatchParams): void {
  const { addMessage, updateMessage, mergeContext, setWorkflow, clearSession } =
    useChatStore();

  useEffect(() => {
    /**
     * Handles a single A2UI dispatch event. Reads the latest workflow state
     * from the store at the moment of invocation to avoid stale closures.
     */
    const handleDispatch = async (event: Event) => {
      const { message, resolve } = (event as CustomEvent).detail;
      const actionName: string = message.userAction.name;
      const context: Record<string, unknown> =
        message.userAction.context ?? {};

      // Always read fresh state from the store.
      const state = useChatStore.getState();
      const currentWorkflow = state.activeWorkflow;
      const currentStepIdx = state.currentStepIndex;
      const currentCtx = state.sessionContext;

      mergeContext(context);

      if (!currentWorkflow || currentStepIdx === null) {
        resolve([]);
        return;
      }

      const steps = getSortedSteps(currentWorkflow);
      const currentStepDef = steps[currentStepIdx];

      // Navigate actions are handled entirely client-side — no HTTP call, no tool bubble.
      const actionDef = currentStepDef?.actions?.find(
        (a) => a.tool_name === actionName,
      );
      if (actionDef?.type === "navigate") {
        resolve([]);
        await loadWorkflowStep(
          currentWorkflow,
          actionDef.target_step_index ?? 0,
          currentCtx,
        );
        return;
      }

      const toolMsgId = crypto.randomUUID();

      addMessage({
        id: toolMsgId,
        role: "assistant",
        toolCall: {
          toolName: actionName,
          formData: context,
          status: "pending",
        },
        workflowSnapshot: {
          workflowId: currentWorkflow.id,
          stepIndex: currentStepIdx,
          stepId: currentStepDef?.id ?? "",
          contextAtStep: { ...currentCtx, ...context },
        },
      });

      try {
        const res = await fetch("/api/workflow/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflow: currentWorkflow,
            stepIndex: currentStepIdx,
            actionName,
            formData: context,
            sessionContext: { ...currentCtx, ...context },
          }),
        });

        const data = await res.json();

        if (data.success) {
          updateMessage(toolMsgId, {
            toolCall: {
              toolName: actionName,
              formData: context,
              result: data.data,
              status: "success",
            },
          });

          // Persist the successful tool call bubble so it survives session reload.
          const toolSid = emrChatStore.getState().activeSessionId;
          if (toolSid) {
            await persistMessage(toolSid, {
              role: "ASSISTANT",
              content: `**${actionName}** submitted`,
              type: "WORKFLOW_STEP",
              metadata: {
                toolCall: {
                  toolName: actionName,
                  formData: context,
                  result: data.data,
                  status: "success",
                },
              },
            });
          }

          if (data.sessionContext) mergeContext(data.sessionContext);
          const newCtx = data.sessionContext ?? {};

          // Persist the step submission row for audit/analytics.
          const wfStateId = dbWorkflowStateId;
          if (wfStateId) {
            await addStepSubmissionAction({
              payload: {
                workflowStateId: wfStateId,
                stepIndex: currentStepIdx,
                stepId: currentStepDef?.id ?? "",
                stepName: currentStepDef?.name ?? "",
                actionName,
                formData: context,
                responseData: data.data as Record<string, unknown>,
                extractedOutputs: newCtx,
              },
            });

            if (data.nextStepIndex !== null) {
              await updateWorkflowStateAction({
                id: wfStateId,
                payload: {
                  currentStepIndex: data.nextStepIndex,
                  sessionContext: { ...currentCtx, ...newCtx },
                },
              });
            } else {
              // Save final accumulated context so it's queryable after completion.
              await updateWorkflowStateAction({
                id: wfStateId,
                payload: {
                  status: "COMPLETED",
                  sessionContext: { ...currentCtx, ...newCtx },
                },
              });
            }
          }

          if (data.nextStepIndex !== null) {
            setWorkflow(currentWorkflow, data.nextStepIndex);
            await loadWorkflowStep(currentWorkflow, data.nextStepIndex, newCtx);
          } else {
            if (currentWorkflow.completion?.message) {
              addMessage({
                id: crypto.randomUUID(),
                role: "assistant",
                ui: buildMarkdownNode(currentWorkflow.completion.message),
              });
              const completeSid = emrChatStore.getState().activeSessionId;
              if (completeSid)
                await persistMessage(completeSid, {
                  role: "ASSISTANT",
                  content: currentWorkflow.completion.message,
                  type: "WORKFLOW_COMPLETE",
                });
            }
            clearSession();
            setDbWorkflowStateId(null);
          }
        } else {
          updateMessage(toolMsgId, {
            toolCall: {
              toolName: actionName,
              formData: context,
              status: "error",
              error: data.error || "Submission failed",
            },
          });

          const errSid = emrChatStore.getState().activeSessionId;
          if (errSid) {
            await persistMessage(errSid, {
              role: "ASSISTANT",
              content: `**${actionName}** failed`,
              type: "WORKFLOW_STEP",
              metadata: {
                toolCall: {
                  toolName: actionName,
                  formData: context,
                  status: "error",
                  error: data.error || "Submission failed",
                },
              },
            });
          }

          if (Array.isArray(data.missing_permissions)) {
            addMessage({
              id: crypto.randomUUID(),
              role: "assistant",
              permissionDenied: {
                message:
                  data.error || "You do not have permission to run this workflow.",
                missing_permissions: data.missing_permissions,
              },
            });
          }
        }
      } catch (err) {
        const netErrMsg =
          err instanceof Error ? err.message : "Network error";
        updateMessage(toolMsgId, {
          toolCall: {
            toolName: actionName,
            formData: context,
            status: "error",
            error: netErrMsg,
          },
        });

        const netSid = emrChatStore.getState().activeSessionId;
        if (netSid) {
          await persistMessage(netSid, {
            role: "ASSISTANT",
            content: `**${actionName}** failed`,
            type: "WORKFLOW_STEP",
            metadata: {
              toolCall: {
                toolName: actionName,
                formData: context,
                status: "error",
                error: netErrMsg,
              },
            },
          });
        }
      }

      resolve([]);
    };

    processor.addEventListener("dispatch", handleDispatch);
    return () => processor.removeEventListener("dispatch", handleDispatch);
  }, [
    addMessage,
    updateMessage,
    mergeContext,
    setWorkflow,
    clearSession,
    loadWorkflowStep,
    dbWorkflowStateId,
    setDbWorkflowStateId,
    persistMessage,
    processor,
  ]);
}
