/**
 * EMR Chat server actions.
 *
 * Layer: server / presentation / actions / emr-chat
 *
 * ZSA server actions that the client uses for all EMR chat session persistence.
 * All actions require the user to be authenticated. Session-scoped writes also
 * verify the session belongs to the calling user at the controller level.
 *
 * Actions in this file:
 *   createEmrChatSessionAction   — start a new chat session
 *   listEmrChatSessionsAction    — sidebar session list
 *   getEmrChatSessionAction      — load full session on open
 *   deleteEmrChatSessionAction   — archive a session
 *   renameEmrChatSessionAction   — update session title from sidebar inline edit
 *   pinEmrChatSessionAction      — pin / unpin a session so it floats to the top
 *   addEmrChatMessageAction      — persist a chat message
 *   createWorkflowStateAction    — record a new workflow run
 *   updateWorkflowStateAction    — advance step / update context / mark complete
 *   addStepSubmissionAction      — record a completed step submission
 */

"use server";

import {
  CreateEmrChatSessionActionSchema,
  AddEmrChatMessageActionSchema,
  CreateWorkflowStateActionSchema,
  UpdateWorkflowStateActionSchema,
  AddStepSubmissionActionSchema,
  GetEmrChatSessionActionSchema,
  ListEmrChatSessionsActionSchema,
  DeleteEmrChatSessionActionSchema,
  RenameEmrChatSessionActionSchema,
  PinEmrChatSessionActionSchema,
} from "@/modules/entities/schemas/emr-chat";
import {
  createSessionController,
  getSessionController,
  listSessionsController,
  deleteSessionController,
  renameSessionController,
  pinSessionController,
  addMessageController,
  createWorkflowStateController,
  updateWorkflowStateController,
  addStepSubmissionController,
  type TCreateSessionControllerOutput,
  type TGetSessionControllerOutput,
  type TListSessionsControllerOutput,
  type TAddMessageControllerOutput,
  type TCreateWorkflowStateControllerOutput,
  type TUpdateWorkflowStateControllerOutput,
  type TAddStepSubmissionControllerOutput,
} from "@/modules/server/core/emr-chat/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";

/**
 * Creates a new EMR chat session for the authenticated user.
 * Called when the user sends their first message in an empty chat.
 */
export const createEmrChatSessionAction = authenticatedProcedure
  .createServerAction()
  .input(CreateEmrChatSessionActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TCreateSessionControllerOutput>(async () => {
      const data = await createSessionController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/**
 * Lists the sidebar session history for the authenticated user.
 * Returns summaries ordered by most recently updated.
 */
export const listEmrChatSessionsAction = authenticatedProcedure
  .createServerAction()
  .input(ListEmrChatSessionsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TListSessionsControllerOutput>(async () => {
      const data = await listSessionsController(input.payload);
      return { result: data };
    });
  });

/**
 * Loads a full session with all messages and the active workflow state.
 * Called when the user clicks a session in the history sidebar.
 */
export const getEmrChatSessionAction = authenticatedProcedure
  .createServerAction()
  .input(GetEmrChatSessionActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TGetSessionControllerOutput>(async () => {
      const data = await getSessionController(input.id);
      return { result: data };
    });
  });

/**
 * Archives a session so it no longer appears in the sidebar.
 * Data is retained for compliance — the session is never physically deleted.
 */
export const deleteEmrChatSessionAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteEmrChatSessionActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<void>(async () => {
      await deleteSessionController(input.id);
      return { result: undefined };
    });
  });

/**
 * Updates the session title from the sidebar inline edit.
 */
export const renameEmrChatSessionAction = authenticatedProcedure
  .createServerAction()
  .input(RenameEmrChatSessionActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<void>(async () => {
      await renameSessionController(input.id, input.title);
      return { result: undefined };
    });
  });

/**
 * Pins or unpins a session so it floats to the top of the sidebar list.
 */
export const pinEmrChatSessionAction = authenticatedProcedure
  .createServerAction()
  .input(PinEmrChatSessionActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<void>(async () => {
      await pinSessionController(input.id, input.pinned);
      return { result: undefined };
    });
  });

/**
 * Persists a single chat message (user or assistant) to the active session.
 * Called after every user send and every assistant reply.
 */
export const addEmrChatMessageAction = authenticatedProcedure
  .createServerAction()
  .input(AddEmrChatMessageActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TAddMessageControllerOutput>(async () => {
      const data = await addMessageController(input.payload);
      return { result: data };
    });
  });

/**
 * Creates a workflow state row when a FHIR workflow begins.
 * Stores the full WorkflowDefinition JSON so the session can be resumed
 * even if the workflow definition changes in a later deployment.
 */
export const createWorkflowStateAction = authenticatedProcedure
  .createServerAction()
  .input(CreateWorkflowStateActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TCreateWorkflowStateControllerOutput>(async () => {
      const data = await createWorkflowStateController(input.payload);
      return { result: data };
    });
  });

/**
 * Advances the current step or updates the accumulated FHIR session context.
 * Also used to mark a workflow as COMPLETED or ABANDONED.
 */
export const updateWorkflowStateAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateWorkflowStateActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TUpdateWorkflowStateControllerOutput>(async () => {
      const data = await updateWorkflowStateController(input.id, input.payload);
      return { result: data };
    });
  });

/**
 * Records a completed step submission for auditing and session resume.
 * Upserts — re-submitting a step after an error replaces the previous record.
 */
export const addStepSubmissionAction = authenticatedProcedure
  .createServerAction()
  .input(AddStepSubmissionActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TAddStepSubmissionControllerOutput>(async () => {
      const data = await addStepSubmissionController(input.payload);
      return { result: data };
    });
  });
