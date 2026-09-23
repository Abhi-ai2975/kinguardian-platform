/**
 * EMR Chat ZSA action schemas.
 *
 * Layer: entities / schemas / emr-chat
 *
 * Action-layer wrappers used by ZSA server actions. Mutating operations wrap
 * the validation schema in { payload, transportOptions }; read-only operations
 * wrap in { payload } or use a flat id field.
 *
 * Imports from "./input" (relative) to avoid circular reference through the
 * barrel index.ts.
 */

import { z } from "zod/v4";

import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  AddEmrChatMessageSchema,
  AddStepSubmissionSchema,
  CreateEmrChatSessionSchema,
  CreateWorkflowStateSchema,
  ListEmrChatSessionsSchema,
  UpdateWorkflowStateSchema,
} from "./input";

// ── Session actions ───────────────────────────────────────────────────────────

export const CreateEmrChatSessionActionSchema = z.object({
  payload: CreateEmrChatSessionSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateEmrChatSessionAction = z.infer<
  typeof CreateEmrChatSessionActionSchema
>;

export const ListEmrChatSessionsActionSchema = z.object({
  payload: ListEmrChatSessionsSchema,
});
export type TListEmrChatSessionsAction = z.infer<
  typeof ListEmrChatSessionsActionSchema
>;

export const GetEmrChatSessionActionSchema = z.object({
  id: z.string().min(1),
});
export type TGetEmrChatSessionAction = z.infer<
  typeof GetEmrChatSessionActionSchema
>;

export const DeleteEmrChatSessionActionSchema = z.object({
  id: z.string().min(1),
});
export type TDeleteEmrChatSessionAction = z.infer<
  typeof DeleteEmrChatSessionActionSchema
>;

export const RenameEmrChatSessionActionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
});
export type TRenameEmrChatSessionAction = z.infer<
  typeof RenameEmrChatSessionActionSchema
>;

export const PinEmrChatSessionActionSchema = z.object({
  id: z.string().min(1),
  pinned: z.boolean(),
});
export type TPinEmrChatSessionAction = z.infer<
  typeof PinEmrChatSessionActionSchema
>;

// ── Message actions ───────────────────────────────────────────────────────────

export const AddEmrChatMessageActionSchema = z.object({
  payload: AddEmrChatMessageSchema,
});
export type TAddEmrChatMessageAction = z.infer<
  typeof AddEmrChatMessageActionSchema
>;

// ── Workflow actions ──────────────────────────────────────────────────────────

export const CreateWorkflowStateActionSchema = z.object({
  payload: CreateWorkflowStateSchema,
});
export type TCreateWorkflowStateAction = z.infer<
  typeof CreateWorkflowStateActionSchema
>;

export const UpdateWorkflowStateActionSchema = z.object({
  id: z.string().min(1),
  payload: UpdateWorkflowStateSchema,
});
export type TUpdateWorkflowStateAction = z.infer<
  typeof UpdateWorkflowStateActionSchema
>;

// ── Step submission actions ───────────────────────────────────────────────────

export const AddStepSubmissionActionSchema = z.object({
  payload: AddStepSubmissionSchema,
});
export type TAddStepSubmissionAction = z.infer<
  typeof AddStepSubmissionActionSchema
>;
