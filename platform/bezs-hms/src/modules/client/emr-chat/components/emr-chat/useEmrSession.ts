/**
 * useEmrSession — session management hook for EMRChatContainer.
 *
 * Layer: client / emr-chat / components / emr-chat
 *
 * Encapsulates all session lifecycle callbacks:
 *   - Loads the session list from the DB on mount.
 *   - ensureSession: creates a new DB session on first send, silently updating
 *     the browser URL without causing a navigation or remounting the component.
 *   - persistMessage: fire-and-forget DB message write.
 *   - startNewChat: clears store state or navigates to the blank landing URL.
 *   - openSession: navigates to an existing session URL.
 *   - handleDeleteSession: removes a session from the sidebar + DB.
 */

import { useCallback, useEffect } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useChatStore } from "@/modules/client/ai-hub/store/chat-store";
import { useEmrChatStore } from "../../stores/emr-chat.store";
import {
  createEmrChatSessionAction,
  listEmrChatSessionsAction,
  deleteEmrChatSessionAction,
  renameEmrChatSessionAction,
  pinEmrChatSessionAction,
  addEmrChatMessageAction,
} from "@/modules/server/presentation/actions/emr-chat/emr-chat.actions";
import { titleFromMessage } from "./utils";

/** Parameters accepted by useEmrSession. */
export interface UseEmrSessionParams {
  userId: string;
  orgId?: string | null;
  /** Session UUID from the URL params — undefined on the blank new-chat page. */
  urlSessionId?: string;
  locale: string;
  /** Base path without locale prefix, e.g. "/bezs/telemedicine/doctor/emr". */
  basePath: string;
  router: AppRouterInstance;
  /** Used by startNewChat to restore focus to the input after clearing state. */
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  /** Setter for the dbWorkflowStateId owned by the container. */
  setDbWorkflowStateId: (id: string | null) => void;
}

/** Shape returned by useEmrSession. */
export interface EmrSessionHandlers {
  /**
   * Returns the active session ID. Creates a new DB session on first call,
   * updating the URL in place (no navigation).
   *
   * @param firstMessageText - Used as the session title on creation.
   * @throws Error if the server action fails to create the session.
   */
  ensureSession: (firstMessageText?: string) => Promise<string>;
  /**
   * Persists a single message to the DB. Errors are swallowed — the message
   * is already in the Zustand store so the UI is unaffected.
   */
  persistMessage: (
    sessionId: string,
    params: {
      role: "USER" | "ASSISTANT";
      content: string;
      type?: string;
      metadata?: Record<string, unknown>;
    },
  ) => Promise<void>;
  /** Clears state and navigates to the blank chat landing (or clears in place). */
  startNewChat: () => void;
  /** Navigates to an existing session URL so the server page pre-loads it. */
  openSession: (sessionId: string) => void;
  /** Deletes a session from the sidebar and DB; navigates away if it was active. */
  handleDeleteSession: (sessionId: string) => Promise<void>;
  /** Renames a session title (user-initiated inline edit). */
  handleRenameSession: (sessionId: string, title: string) => Promise<void>;
  /** Pins or unpins a session so it floats to the top of the sidebar. */
  handlePinSession: (sessionId: string, pinned: boolean) => Promise<void>;
}

/**
 * Hook providing session management callbacks for EMRChatContainer.
 *
 * @param params - Session configuration and dependencies.
 * @returns Session management callbacks.
 */
export function useEmrSession({
  userId,
  orgId,
  urlSessionId,
  locale,
  basePath,
  router,
  inputRef,
  setDbWorkflowStateId,
}: UseEmrSessionParams): EmrSessionHandlers {
  const {
    activeSessionId,
    setSessions,
    setActiveSessionId,
    setIsLoadingSessions,
    prependSession,
    removeSession,
    updateSessionTitle,
    setPinned,
  } = useEmrChatStore();

  // Load the session list from the DB whenever the userId changes (mount + org switch).
  useEffect(() => {
    let cancelled = false;
    async function fetchSessions() {
      setIsLoadingSessions(true);
      const [data] = await listEmrChatSessionsAction({
        payload: { userId, limit: 50 },
      });
      if (!cancelled && data) setSessions(data);
      setIsLoadingSessions(false);
    }
    fetchSessions();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  /**
   * Returns the active session ID, creating a new session if one doesn't exist.
   * The URL is updated with history.replaceState so the component stays mounted
   * and any in-flight API call is not interrupted.
   */
  const ensureSession = useCallback(
    async (firstMessageText?: string): Promise<string> => {
      if (activeSessionId) return activeSessionId;

      const [session] = await createEmrChatSessionAction({
        payload: {
          userId,
          orgId: orgId ?? undefined,
          title: firstMessageText
            ? titleFromMessage(firstMessageText)
            : undefined,
        },
      });

      if (!session) throw new Error("Failed to create chat session");

      setActiveSessionId(session.id);
      prependSession(session);
      window.history.replaceState(
        null,
        "",
        `/${locale}${basePath}/${session.id}`,
      );

      return session.id;
    },
    [activeSessionId, userId, orgId, locale, basePath, setActiveSessionId, prependSession],
  );

  /**
   * Writes a message row to the DB. Fire-and-forget: the message is already
   * visible in the Zustand store so a write failure is non-fatal.
   */
  const persistMessage = useCallback(
    async (
      sessionId: string,
      params: {
        role: "USER" | "ASSISTANT";
        content: string;
        type?: string;
        metadata?: Record<string, unknown>;
      },
    ) => {
      await addEmrChatMessageAction({
        payload: {
          sessionId,
          role: params.role,
          content: params.content,
          type: (params.type as "TEXT") ?? "TEXT",
          metadata: params.metadata,
        },
      });
    },
    [],
  );

  /**
   * Starts a fresh chat. If the user is on the blank landing page, clears state
   * in place. Otherwise navigates to the blank landing URL.
   */
  const startNewChat = useCallback(() => {
    if (!urlSessionId) {
      useChatStore.setState({
        messages: [],
        input: "",
        sessionContext: {},
        activeWorkflow: null,
        currentStepIndex: null,
      });
      setActiveSessionId(null);
      setDbWorkflowStateId(null);
      inputRef.current?.focus();
    } else {
      router.push(`/${locale}${basePath}`);
    }
  }, [
    urlSessionId,
    locale,
    basePath,
    router,
    setActiveSessionId,
    setDbWorkflowStateId,
    inputRef,
  ]);

  /** Navigates to an existing session. The [sessionId] server page handles loading. */
  const openSession = useCallback(
    (sid: string) => router.push(`/${locale}${basePath}/${sid}`),
    [router, locale, basePath],
  );

  /** Removes a session from the list + DB and navigates away if it was active. */
  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      removeSession(sessionId);
      // If the deleted session is the one open in the URL or the active store
      // session, clear chat state immediately so the redirect lands on a blank
      // screen rather than briefly flashing the old messages.
      if (activeSessionId === sessionId || urlSessionId === sessionId) {
        useChatStore.setState({
          messages: [],
          input: "",
          sessionContext: {},
          activeWorkflow: null,
          currentStepIndex: null,
        });
        setActiveSessionId(null);
        setDbWorkflowStateId(null);
        router.push(`/${locale}${basePath}`);
      }
      await deleteEmrChatSessionAction({ id: sessionId });
    },
    [removeSession, activeSessionId, urlSessionId, locale, basePath, router, setActiveSessionId, setDbWorkflowStateId],
  );

  /** Updates the session title in DB and store. */
  const handleRenameSession = useCallback(
    async (sessionId: string, title: string) => {
      updateSessionTitle(sessionId, title);
      await renameEmrChatSessionAction({ id: sessionId, title });
    },
    [updateSessionTitle],
  );

  /** Toggles the pinned flag in DB and store. */
  const handlePinSession = useCallback(
    async (sessionId: string, pinned: boolean) => {
      setPinned(sessionId, pinned);
      await pinEmrChatSessionAction({ id: sessionId, pinned });
    },
    [setPinned],
  );

  return {
    ensureSession,
    persistMessage,
    startNewChat,
    openSession,
    handleDeleteSession,
    handleRenameSession,
    handlePinSession,
  };
}
