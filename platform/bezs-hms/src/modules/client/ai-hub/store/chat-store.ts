/**
 * Chat store — Zustand state for the A2UI workflow chat session.
 *
 * Holds three categories of state:
 *
 *   UI state       messages[], input, loading
 *   Workflow state activeWorkflow (full WorkflowDefinition), currentStepIndex
 *   Session state  sessionContext — flat key-value map accumulated across steps.
 *                  e.g. { patient_id: 42 } is set after step 1 completes so
 *                  steps 2–4 can interpolate it into their FHIR action URLs.
 *
 * The full WorkflowDefinition is re-sent to the server with every /step and
 * /submit call — no server-side workflow state is kept between requests.
 */
import { create } from "zustand";
import type { AnyComponentNode } from "../a2ui/types";
import type { WorkflowDefinition } from "@/types/workflow";

export interface ToolCallInfo {
  toolName: string;
  formData: Record<string, unknown>;
  result?: unknown;
  status: "pending" | "success" | "error";
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text?: string;
  ui?: AnyComponentNode | null;
  toolCall?: ToolCallInfo;
  workflowSnapshot?: {
    workflowId: string;
    stepIndex: number;
    stepId: string;
    contextAtStep: Record<string, unknown>;
  };
  /** Set when the server rejects a workflow with a 403 permission error. */
  permissionDenied?: {
    message: string;
    missing_permissions: string[];
  };
  /** Set on the completion message so the UI can offer a "Run again" button. */
  workflowComplete?: {
    workflowId: string;
    workflowName: string;
  };
}

export interface SerializableConversation {
  messages: ChatMessage[];
  sessionContext: Record<string, unknown>;
  activeWorkflow: WorkflowDefinition | null;
  currentStepIndex: number | null;
}

interface ChatState {
  messages: ChatMessage[];
  input: string;
  loading: boolean;

  sessionContext: Record<string, unknown>;
  activeWorkflow: WorkflowDefinition | null;
  currentStepIndex: number | null;

  /**
   * When set, A2UIChat will trigger this workflow by ID as soon as it mounts.
   * Used by the WorkflowLauncher: the launcher writes this and switches to the
   * chat tab; A2UIChat reads and clears it on mount, then starts the workflow.
   */
  pendingTrigger: { id: string; name: string } | null;

  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  setInput: (input: string) => void;
  setLoading: (loading: boolean) => void;

  mergeContext: (data: Record<string, unknown>) => void;
  setWorkflow: (workflow: WorkflowDefinition | null, stepIndex: number | null) => void;
  clearSession: () => void;
  setPendingTrigger: (trigger: { id: string; name: string } | null) => void;

  getSerializableState: () => SerializableConversation;
  loadState: (state: SerializableConversation) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  input: "",
  loading: false,
  sessionContext: {},
  activeWorkflow: null,
  currentStepIndex: null,
  pendingTrigger: null,

  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),

  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),

  setInput: (input) => set({ input }),
  setLoading: (loading) => set({ loading }),

  mergeContext: (data) =>
    set((state) => ({ sessionContext: { ...state.sessionContext, ...data } })),

  setWorkflow: (workflow, stepIndex) => set({ activeWorkflow: workflow, currentStepIndex: stepIndex }),

  clearSession: () => set({ sessionContext: {}, activeWorkflow: null, currentStepIndex: null }),

  setPendingTrigger: (trigger) => set({ pendingTrigger: trigger }),

  getSerializableState: () => {
    const { messages, sessionContext, activeWorkflow, currentStepIndex } = get();
    return { messages, sessionContext, activeWorkflow, currentStepIndex };
  },

  loadState: (state) =>
    set({
      messages: state.messages,
      sessionContext: state.sessionContext,
      activeWorkflow: state.activeWorkflow,
      currentStepIndex: state.currentStepIndex,
    }),
}));
