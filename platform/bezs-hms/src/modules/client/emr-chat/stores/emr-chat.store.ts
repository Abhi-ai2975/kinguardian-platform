/**
 * EMR Chat session store.
 *
 * Layer: client / emr-chat / stores
 *
 * Manages the session list (sidebar) and the active session ID.
 * The actual chat message state lives in the existing useChatStore
 * (src/modules/client/ai-hub/store/chat-store.ts) — this store handles
 * only the persistence metadata layer (which sessions exist, which is open).
 *
 * Separation of concerns:
 *   emr-chat.store  — session list, active session ID, sidebar open/close
 *   useChatStore    — messages, workflow state, session context (in-flight)
 */

import { create } from "zustand";
import type { TEmrChatSessionSummary } from "@/modules/entities/schemas/emr-chat";

interface IEmrChatStore {
  /** Flat list of session summaries shown in the sidebar. */
  sessions: TEmrChatSessionSummary[];
  /** UUID of the session currently open in the chat area. null = blank new chat. */
  activeSessionId: string | null;
  /** Whether the history drawer is open. */
  isHistoryOpen: boolean;
  /** True while the session list is loading from the server. */
  isLoadingSessions: boolean;

  // ── Actions ────────────────────────────────────────────────────────────────
  setSessions: (sessions: TEmrChatSessionSummary[]) => void;
  setActiveSessionId: (id: string | null) => void;
  setIsLoadingSessions: (loading: boolean) => void;
  openHistory: () => void;
  closeHistory: () => void;

  /**
   * Prepend a newly created session to the top of the list.
   * @param session - The session returned by createEmrChatSessionAction.
   */
  prependSession: (session: TEmrChatSessionSummary) => void;

  /**
   * Remove a session from the local list after archiving.
   * @param id - Session UUID.
   */
  removeSession: (id: string) => void;

  /**
   * Update the title of a session in the local list.
   * @param id - Session UUID.
   * @param title - New title string.
   */
  updateSessionTitle: (id: string, title: string) => void;

  /**
   * Toggle the pinned flag of a session in the local list.
   * @param id - Session UUID.
   * @param pinned - New pinned state.
   */
  setPinned: (id: string, pinned: boolean) => void;
}

const _useEmrChatStore = create<IEmrChatStore>((set) => ({
  sessions: [],
  activeSessionId: null,
  isHistoryOpen: false,
  isLoadingSessions: false,

  setSessions: (sessions) => set({ sessions }),
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  setIsLoadingSessions: (loading) => set({ isLoadingSessions: loading }),
  openHistory: () => set({ isHistoryOpen: true }),
  closeHistory: () => set({ isHistoryOpen: false }),

  prependSession: (session) =>
    set((state) => ({ sessions: [session, ...state.sessions] })),

  removeSession: (id) =>
    set((state) => ({ sessions: state.sessions.filter((s) => s.id !== id) })),

  updateSessionTitle: (id, title) =>
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, title } : s)),
    })),

  setPinned: (id, pinned) =>
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, pinned } : s)),
    })),
}));

export const useEmrChatStore = _useEmrChatStore;
/** Direct store accessor for use outside React (e.g. in callbacks). */
export const emrChatStore = _useEmrChatStore;
