/**
 * EMR Chat input validation schemas.
 *
 * Layer: entities / schemas / emr-chat
 *
 * Zod schemas for all write operations and query parameters.
 * Enums are defined in response.ts and re-used here via relative import
 * to keep the schema surface DRY.
 */

import { z } from "zod/v4";

import {
  EmrMessageRoleSchema,
  EmrMessageTypeSchema,
  EmrWorkflowStatusSchema,
} from "./response";

// ── Session ───────────────────────────────────────────────────────────────────

/** Create a new chat session. */
export const CreateEmrChatSessionSchema = z.object({
  userId: z.string().min(1),
  orgId: z.string().optional(),
  title: z.string().optional(),
});
export type TCreateEmrChatSession = z.infer<typeof CreateEmrChatSessionSchema>;

/** Query params for listing sessions. */
export const ListEmrChatSessionsSchema = z.object({
  userId: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type TListEmrChatSessions = z.infer<typeof ListEmrChatSessionsSchema>;

// ── Message ───────────────────────────────────────────────────────────────────

/** Add a message to a session. */
export const AddEmrChatMessageSchema = z.object({
  sessionId: z.string().min(1),
  role: EmrMessageRoleSchema,
  content: z.string(),
  type: EmrMessageTypeSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type TAddEmrChatMessage = z.infer<typeof AddEmrChatMessageSchema>;

// ── Workflow state ─────────────────────────────────────────────────────────────

/** Create a workflow state row when a workflow starts. */
export const CreateWorkflowStateSchema = z.object({
  sessionId: z.string().min(1),
  triggerMessageId: z.string().optional(),
  workflowDefinition: z.record(z.string(), z.unknown()),
  workflowId: z.string().min(1),
  workflowName: z.string().min(1),
  totalSteps: z.number().int().min(1),
  sessionContext: z.record(z.string(), z.unknown()).optional(),
});
export type TCreateWorkflowState = z.infer<typeof CreateWorkflowStateSchema>;

/** Advance the workflow to the next step and persist accumulated context. */
export const UpdateWorkflowStateSchema = z.object({
  currentStepIndex: z.number().int().min(0).optional(),
  sessionContext: z.record(z.string(), z.unknown()).optional(),
  status: EmrWorkflowStatusSchema.optional(),
});
export type TUpdateWorkflowState = z.infer<typeof UpdateWorkflowStateSchema>;

// ── Step submission ────────────────────────────────────────────────────────────

/** Record a completed step submission. */
export const AddStepSubmissionSchema = z.object({
  workflowStateId: z.string().min(1),
  stepIndex: z.number().int().min(0),
  stepId: z.string().min(1),
  stepName: z.string().min(1),
  actionName: z.string().min(1),
  formData: z.record(z.string(), z.unknown()),
  responseData: z.record(z.string(), z.unknown()).optional(),
  extractedOutputs: z.record(z.string(), z.unknown()).optional(),
});
export type TAddStepSubmission = z.infer<typeof AddStepSubmissionSchema>;
