/**
 * EMR Chat repository interface.
 *
 * Layer: server / core / emr-chat / domain
 *
 * Defines the persistence contract for all EMR chat session data.
 * Implemented by EmrChatPrismaRepository (Prisma ORM).
 * Registered in the DI container so use cases can resolve it via
 * getInjection("IEmrChatRepository").
 */

import type {
  TAddEmrChatMessage,
  TAddStepSubmission,
  TCreateEmrChatSession,
  TCreateWorkflowState,
  TEmrChatMessage,
  TEmrChatSessionFull,
  TEmrChatSessionSummary,
  TEmrWorkflowState,
  TEmrWorkflowStepSubmission,
  TListEmrChatSessions,
  TUpdateWorkflowState,
} from "@/modules/entities/schemas/emr-chat";

/**
 * Persistence contract for EMR chat sessions, messages, and workflow states.
 * All methods throw domain errors; never raw Prisma errors.
 */
export interface IEmrChatRepository {
  // ── Sessions ──────────────────────────────────────────────────────────────

  /**
   * Create a new chat session for the given user.
   * @param dto - userId, optional orgId and title.
   * @returns The created session summary.
   */
  createSession(dto: TCreateEmrChatSession): Promise<TEmrChatSessionSummary>;

  /**
   * Load a session with all its messages and the active workflow state (if any).
   * @param id - Session UUID.
   * @returns Full session data.
   * @throws NotFoundError if the session does not exist.
   */
  getSession(id: string): Promise<TEmrChatSessionFull>;

  /**
   * List the most recent sessions for a user, ordered by updatedAt desc.
   * @param query - userId + optional pagination params.
   * @returns Array of session summaries.
   */
  listSessions(query: TListEmrChatSessions): Promise<TEmrChatSessionSummary[]>;

  /**
   * Update the session title (auto-generated or user-renamed).
   * @param id - Session UUID.
   * @param title - New title string.
   */
  updateSessionTitle(id: string, title: string): Promise<void>;

  /**
   * Toggle the pinned flag on a session.
   * @param id - Session UUID.
   * @param pinned - True to pin, false to unpin.
   */
  pinSession(id: string, pinned: boolean): Promise<void>;

  /**
   * Archive a session (soft delete — not visible in sidebar but data kept).
   * @param id - Session UUID.
   */
  deleteSession(id: string): Promise<void>;

  // ── Messages ──────────────────────────────────────────────────────────────

  /**
   * Append a message to a session and bump the session's updatedAt timestamp.
   * @param dto - sessionId, role, content, type, optional metadata.
   * @returns The created message.
   */
  addMessage(dto: TAddEmrChatMessage): Promise<TEmrChatMessage>;

  // ── Workflow States ───────────────────────────────────────────────────────

  /**
   * Create a workflow state row when a new FHIR workflow starts.
   * @param dto - sessionId, full workflowDefinition JSON, stepIndex=0.
   * @returns The created workflow state.
   */
  createWorkflowState(dto: TCreateWorkflowState): Promise<TEmrWorkflowState>;

  /**
   * Update the current step index and/or sessionContext as the user advances.
   * @param id - WorkflowState UUID.
   * @param dto - Fields to update.
   * @returns The updated workflow state.
   */
  updateWorkflowState(id: string, dto: TUpdateWorkflowState): Promise<TEmrWorkflowState>;

  /**
   * Fetch the single IN_PROGRESS workflow for a session, if any.
   * @param sessionId - Session UUID.
   * @returns The active workflow state, or null if no workflow is running.
   */
  getActiveWorkflow(sessionId: string): Promise<TEmrWorkflowState | null>;

  // ── Step Submissions ──────────────────────────────────────────────────────

  /**
   * Record a completed step submission for auditing and resume support.
   * @param dto - workflowStateId, stepIndex, formData, FHIR response, outputs.
   * @returns The created step submission.
   */
  addStepSubmission(dto: TAddStepSubmission): Promise<TEmrWorkflowStepSubmission>;
}
