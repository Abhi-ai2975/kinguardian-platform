/**
 * EMRChatContainer — EMR workflow chat interface with session persistence.
 *
 * Layer: client / emr-chat / components
 *
 * This is the slim orchestrator. All business logic lives in dedicated hooks
 * under the ./emr-chat/ subfolder:
 *
 *   useEmrSession    — session create / persist / navigate
 *   useEmrWorkflow   — loadWorkflowStep / skipCurrentStep / abandonWorkflow
 *   useEmrSend       — handleSend / triggerWorkflowById / handleWorkflowStartResponse
 *   useEmrDispatch   — A2UI form-submit dispatch listener
 *
 * UI sub-components:
 *   MessageList      — scrollable conversation history
 *   ChatInput        — textarea + send button + skip-step bar
 *   WorkflowLauncher — searchable static workflow launcher grid
 *   UISchemaPreview  — live preview of every A2UI schema in the registry
 *
 * Props:
 *   userId         — Better Auth user.id from the server page.
 *   orgId          — active org seeded into every workflow context call.
 *   sessionId      — URL-param UUID, undefined on the blank new-chat page.
 *   initialSession — pre-fetched session from the server page (no client DB call needed).
 *   basePath       — base path without locale prefix used to build session URLs.
 */

"use client";

import { useRef, useEffect, useState, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import { createMessageProcessor } from "@/modules/client/ai-hub/a2ui/rendering/processor";
import { cn } from "@/lib/utils";
import {
  useChatStore,
  type ChatMessage,
} from "@/modules/client/ai-hub/store/chat-store";
import { useEmrChatStore } from "../stores/emr-chat.store";
import type {
  TEmrChatMessage,
  TEmrChatSessionFull,
} from "@/modules/entities/schemas/emr-chat";
import type { WorkflowDefinition } from "@/types/workflow";

// ── Shared sub-components ─────────────────────────────────────────────────────
import { SessionSidebar } from "./SessionSidebar";
import { ChatTopbar, type EmrChatView } from "./ChatTopbar";
import { WorkflowProgressBanner } from "./WorkflowProgressBanner";
import { UISchemaPreview } from "@/modules/client/telemedicine/doctor/component/emr/UISchemaPreview";

// ── emr-chat sub-folder ───────────────────────────────────────────────────────
import { useEmrSession } from "./emr-chat/useEmrSession";
import { useEmrWorkflow } from "./emr-chat/useEmrWorkflow";
import { useEmrSend } from "./emr-chat/useEmrSend";
import { useEmrDispatch } from "./emr-chat/useEmrDispatch";
import { MessageList } from "./emr-chat/MessageList";
import { ChatInput } from "./emr-chat/ChatInput";
import { WorkflowLauncher } from "./emr-chat/WorkflowLauncher";
import { buildMarkdownNode, getSortedSteps } from "./emr-chat/utils";
import { useRouteConfig } from "@/modules/client/shared/hooks/useRouteConfig";

// ── Singleton processor (one per chat session in memory) ─────────────────────
const processor = createMessageProcessor();

// ── Component props ───────────────────────────────────────────────────────────

interface EMRChatContainerProps {
  /** Better Auth user.id (from server page session). */
  userId: string;
  /** Active org UUID from Better Auth session (seeded into workflow context). */
  orgId?: string | null;
  /**
   * UUID from the URL params — present on /emr-chat/[sessionId], absent on
   * the blank /emr-chat new-chat page.
   */
  sessionId?: string;
  /**
   * Full session data pre-fetched by the server page.  When present the
   * container restores messages and workflow state from this on mount instead
   * of fetching from the DB client-side.
   */
  initialSession?: TEmrChatSessionFull;
  /**
   * Base path for session routing (without locale prefix), e.g.
   * "/bezs/telemedicine/doctor/emr". Used to build session and new-chat URLs.
   */
  basePath: string;
}

/**
 * Full EMR chat interface with session history sidebar and DB persistence.
 *
 * @param props.userId         - The authenticated user's ID.
 * @param props.orgId          - The active organization ID (optional).
 * @param props.sessionId      - Session UUID from URL params (undefined on blank page).
 * @param props.initialSession - Pre-loaded session from the server page.
 * @param props.basePath       - Base path for session URL construction.
 */
export default function EMRChatContainer({
  userId,
  orgId,
  sessionId: urlSessionId,
  initialSession,
  basePath,
}: EMRChatContainerProps) {
  // ── Store state ───────────────────────────────────────────────────────────
  const {
    messages,
    input,
    loading,
    activeWorkflow,
    currentStepIndex,
    setInput,
    loadState,
  } = useChatStore();

  const {
    sessions,
    activeSessionId,
    isHistoryOpen,
    isLoadingSessions,
    setActiveSessionId,
    openHistory,
    closeHistory,
  } = useEmrChatStore();

  // When breadcrumbs are hidden in the main area (e.g. EMR chat, which shows
  // them in the navbar instead), the available height is larger — use a smaller
  // offset so the chat fills the viewport correctly.
  const { breadcrumbs } = useRouteConfig();
  const containerHeight = breadcrumbs
    ? "h-[calc(100dvh-160px)]"
    : "h-[calc(100dvh-108px)]";

  // ── Local state ───────────────────────────────────────────────────────────

  /** UUID of the persisted EmrWorkflowState row for the current workflow. */
  const [dbWorkflowStateId, setDbWorkflowStateId] = useState<string | null>(
    null,
  );

  /** Controls which panel is visible: chat, static workflow launcher, or UI schema playground. */
  const [view, setView] = useState<EmrChatView>("chat");

  // ── Refs & routing ────────────────────────────────────────────────────────
  /** Ref for the MessageList scroll container — scroll via el.scrollTo, NOT scrollIntoView,
   *  so the page body is never touched. */
  const messageListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [, startTransition] = useTransition();
  const initialised = useRef(false);
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? "en";

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const {
    ensureSession,
    persistMessage,
    startNewChat,
    openSession,
    handleDeleteSession,
    handleRenameSession,
    handlePinSession,
  } = useEmrSession({
    userId,
    orgId,
    urlSessionId,
    locale,
    basePath,
    router,
    inputRef,
    setDbWorkflowStateId,
  });

  const { loadWorkflowStep, skipCurrentStep, abandonWorkflow } = useEmrWorkflow(
    { persistMessage, dbWorkflowStateId, setDbWorkflowStateId },
  );

  const { handleSend, triggerWorkflowById } = useEmrSend({
    userId,
    orgId,
    ensureSession,
    persistMessage,
    loadWorkflowStep,
    dbWorkflowStateId,
    setDbWorkflowStateId,
  });

  useEmrDispatch({
    processor,
    dbWorkflowStateId,
    setDbWorkflowStateId,
    loadWorkflowStep,
    persistMessage,
  });

  // ── Restore state from server-pre-loaded session ──────────────────────────
  // Runs once on mount (guarded by initialised.current so React StrictMode
  // double-invocation does not restore state twice).
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    if (!initialSession) {
      // Blank new-chat landing — clear any leftover state from a previous session.
      useChatStore.setState({
        messages: [],
        input: "",
        sessionContext: {},
        activeWorkflow: null,
        currentStepIndex: null,
      });
      setActiveSessionId(null);
      setDbWorkflowStateId(null);
      return;
    }

    // Session page — restore messages and workflow state from server-preloaded data.
    setActiveSessionId(initialSession.id);

    // Map DB message rows to ChatMessage objects.
    const dbMessages: ChatMessage[] = initialSession.messages.map(
      (m: TEmrChatMessage) => ({
        id: m.id,
        role: m.role.toLowerCase() as "user" | "assistant",
        text: m.role === "USER" ? m.content : undefined,
        // Skip ui when toolCall metadata is present — ToolCallDetails renders instead.
        ui:
          m.role === "ASSISTANT" && m.content && !m.metadata?.toolCall
            ? buildMarkdownNode(m.content)
            : null,
        toolCall:
          m.metadata?.toolCall !== undefined
            ? (m.metadata.toolCall as ChatMessage["toolCall"])
            : undefined,
        // Restore the re-run metadata for completion messages persisted after this feature.
        workflowComplete:
          m.type === "WORKFLOW_COMPLETE" && m.metadata?.workflowId
            ? {
                workflowId: m.metadata.workflowId as string,
                workflowName: m.metadata.workflowName as string,
              }
            : undefined,
      }),
    );

    // For sessions created before WORKFLOW_STEP messages were persisted, inject
    // step-submission summaries from completedWorkflows so old sessions render correctly.
    const persistedStepTypes = new Set([
      "WORKFLOW_STEP",
      "WORKFLOW_COMPLETE",
      "WORKFLOW_ABANDONED",
    ]);
    const hasPersistedStepMessages = initialSession.messages.some(
      (m: TEmrChatMessage) => persistedStepTypes.has(m.type ?? ""),
    );

    type Timed = { at: Date; msg: ChatMessage };
    const timedInjections: Timed[] = [];

    if (!hasPersistedStepMessages) {
      for (const wf of initialSession.completedWorkflows ?? []) {
        for (const sub of wf.stepSubmissions ?? []) {
          timedInjections.push({
            at: new Date(sub.submittedAt),
            msg: {
              id: `injected-step-${sub.id}`,
              role: "assistant",
              ui: buildMarkdownNode(`**${sub.stepName}** — submitted`),
            },
          });
        }

        const wfEndAt = new Date(wf.completedAt ?? wf.updatedAt);
        if (wf.status === "COMPLETED") {
          const wfDef = wf.workflowDefinition as {
            completion?: { message?: string };
          };
          const completionText =
            wfDef?.completion?.message ?? `**${wf.workflowName}** completed.`;
          timedInjections.push({
            at: wfEndAt,
            msg: {
              id: `injected-complete-${wf.id}`,
              role: "assistant",
              ui: buildMarkdownNode(completionText),
              workflowComplete: {
                workflowId: wf.workflowId,
                workflowName: wf.workflowName,
              },
            },
          });
        } else if (wf.status === "ABANDONED" || wf.status === "ERROR") {
          const wfDef = wf.workflowDefinition as {
            workflow_steps?: Array<{
              sequence_number: number;
              name: string;
            }>;
          };
          const sortedSteps = (wfDef?.workflow_steps ?? [])
            .slice()
            .sort((a, b) => a.sequence_number - b.sequence_number);
          const stepAtAbandon = sortedSteps[wf.currentStepIndex];
          const noticeText = stepAtAbandon
            ? `**${wf.workflowName}** was abandoned at step ${wf.currentStepIndex + 1}: ${stepAtAbandon.name}.`
            : `**${wf.workflowName}** was abandoned.`;
          timedInjections.push({
            at: wfEndAt,
            msg: {
              id: `injected-abandoned-${wf.id}`,
              role: "assistant",
              ui: buildMarkdownNode(noticeText),
            },
          });
        }
      }
    }

    // Merge DB messages + injections, sorted by creation timestamp.
    const dbWithTimestamps = dbMessages.map((msg, i) => ({
      at: new Date(initialSession.messages[i]?.createdAt ?? 0),
      msg,
    }));
    const allSorted = [...dbWithTimestamps, ...timedInjections].sort(
      (a, b) => a.at.getTime() - b.at.getTime(),
    );
    const restoredMessages: ChatMessage[] = allSorted.map((e) => e.msg);

    const restoredCtx =
      (initialSession.activeWorkflow?.sessionContext as Record<
        string,
        unknown
      >) ?? {};

    loadState({
      messages: restoredMessages,
      sessionContext: restoredCtx,
      activeWorkflow: initialSession.activeWorkflow
        ? (initialSession.activeWorkflow
            .workflowDefinition as unknown as WorkflowDefinition)
        : null,
      currentStepIndex: initialSession.activeWorkflow?.currentStepIndex ?? null,
    });

    if (initialSession.activeWorkflow) {
      setDbWorkflowStateId(initialSession.activeWorkflow.id);

      // Re-fetch the current step with fresh context-resolver data.
      // The step form is never persisted to DB so we always re-render it on load.
      const wf = initialSession.activeWorkflow
        .workflowDefinition as unknown as WorkflowDefinition;
      const stepIdx = initialSession.activeWorkflow.currentStepIndex;
      loadWorkflowStep(wf, stepIdx, restoredCtx, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-scroll on new messages ───────────────────────────────────────────
  // Scroll only within the MessageList container so the page body is never touched.
  // scrollIntoView would bubble through all scroll ancestors and move the page too.
  useEffect(() => {
    const el = messageListRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // ── Derived state ─────────────────────────────────────────────────────────

  const currentStepIsOptional =
    activeWorkflow !== null &&
    currentStepIndex !== null &&
    getSortedSteps(activeWorkflow)[currentStepIndex]?.optional === true;

  const activeWorkflowName =
    activeWorkflow !== null && currentStepIndex !== null
      ? activeWorkflow.name
      : undefined;

  const activeSessionTitle = sessions.find(
    (s) => s.id === activeSessionId,
  )?.title;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-border bg-background",
        containerHeight,
      )}
    >
      {/* Top bar — includes the Chat / Workflows / UI Schemas tab toggle */}
      <ChatTopbar
        title={activeSessionTitle}
        hasActiveWorkflow={activeWorkflow !== null}
        workflowName={activeWorkflowName}
        view={view}
        onViewChange={setView}
        onNewChat={() => startTransition(startNewChat)}
        onOpenHistory={openHistory}
      />

      {/* Workflow launcher panel */}
      {view === "workflows" && (
        <WorkflowLauncher
          onTriggerWorkflow={(id, name) => {
            setView("chat");
            triggerWorkflowById(id, name);
          }}
        />
      )}

      {/* UI Schema playground */}
      {view === "schemas" && <UISchemaPreview />}

      {/* Chat view — hidden (not unmounted) when the launcher is open so
          scroll position and Zustand state survive tab switches. */}
      <div
        className={cn(
          "flex flex-col flex-1 min-h-0",
          view !== "chat" && "hidden",
        )}
      >
        {/* Workflow progress banner */}
        {activeWorkflow !== null && currentStepIndex !== null && (
          <WorkflowProgressBanner
            workflowName={activeWorkflow.name}
            currentStepIndex={currentStepIndex}
            totalSteps={activeWorkflow.workflow_steps?.length ?? 0}
            onAbandon={abandonWorkflow}
          />
        )}

        {/* Message list */}
        <MessageList
          messages={messages}
          loading={loading}
          containerRef={messageListRef}
          processor={processor}
          onTriggerWorkflow={(id, name) => {
            setView("chat");
            triggerWorkflowById(id, name);
          }}
          onSuggestion={(prompt) => {
            setInput(prompt);
            inputRef.current?.focus();
          }}
        />

        {/* Input area + optional skip bar */}
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          loading={loading}
          inputRef={inputRef}
          currentStepIsOptional={!!currentStepIsOptional}
          onSkip={skipCurrentStep}
        />
      </div>

      {/* Session history sidebar */}
      <SessionSidebar
        isOpen={isHistoryOpen}
        onClose={closeHistory}
        sessions={sessions}
        activeSessionId={activeSessionId}
        isLoading={isLoadingSessions}
        onSelectSession={openSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onPinSession={handlePinSession}
        onNewChat={startNewChat}
      />
    </div>
  );
}
