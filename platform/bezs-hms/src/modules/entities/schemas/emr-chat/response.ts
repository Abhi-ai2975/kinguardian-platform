/**
 * EMR Chat response schemas.
 *
 * Layer: entities / schemas / emr-chat
 *
 * Zod schemas and TypeScript types for all EMR chat API response shapes.
 * Includes shared enum schemas referenced by both response and input files.
 */

import { z } from "zod/v4";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const EmrChatSessionStatusSchema = z.enum(["ACTIVE", "ARCHIVED"]);
export type TEmrChatSessionStatus = z.infer<typeof EmrChatSessionStatusSchema>;

export const EmrMessageRoleSchema = z.enum(["USER", "ASSISTANT", "SYSTEM"]);
export type TEmrMessageRole = z.infer<typeof EmrMessageRoleSchema>;

export const EmrMessageTypeSchema = z.enum([
  "TEXT",
  "WORKFLOW_START",
  "WORKFLOW_STEP",
  "WORKFLOW_COMPLETE",
  "WORKFLOW_ABANDONED",
  "WORKFLOW_ERROR",
]);
export type TEmrMessageType = z.infer<typeof EmrMessageTypeSchema>;

export const EmrWorkflowStatusSchema = z.enum([
  "IN_PROGRESS",
  "COMPLETED",
  "ABANDONED",
  "ERROR",
]);
export type TEmrWorkflowStatus = z.infer<typeof EmrWorkflowStatusSchema>;

// ── Response Schemas ───────────────────────────────────────────────────────────

/** A single step submission record. */
export const EmrWorkflowStepSubmissionSchema = z.object({
  id: z.string(),
  workflowStateId: z.string(),
  stepIndex: z.number(),
  stepId: z.string(),
  stepName: z.string(),
  actionName: z.string(),
  formData: z.record(z.string(), z.unknown()),
  responseData: z.record(z.string(), z.unknown()).nullish(),
  extractedOutputs: z.record(z.string(), z.unknown()).nullish(),
  submittedAt: z.coerce.date(),
});
export type TEmrWorkflowStepSubmission = z.infer<typeof EmrWorkflowStepSubmissionSchema>;

/** Full workflow run state — includes step submissions for replay. */
export const EmrWorkflowStateSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  triggerMessageId: z.string().nullish(),
  workflowDefinition: z.record(z.string(), z.unknown()),
  workflowId: z.string(),
  workflowName: z.string(),
  currentStepIndex: z.number(),
  totalSteps: z.number(),
  sessionContext: z.record(z.string(), z.unknown()),
  status: EmrWorkflowStatusSchema,
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().nullish(),
  updatedAt: z.coerce.date(),
  stepSubmissions: z.array(EmrWorkflowStepSubmissionSchema).optional(),
});
export type TEmrWorkflowState = z.infer<typeof EmrWorkflowStateSchema>;

/** A single chat message. */
export const EmrChatMessageSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  role: EmrMessageRoleSchema,
  content: z.string(),
  type: EmrMessageTypeSchema,
  metadata: z.record(z.string(), z.unknown()).nullish(),
  createdAt: z.coerce.date(),
});
export type TEmrChatMessage = z.infer<typeof EmrChatMessageSchema>;

/** Lean workflow entry shown in the session sidebar history sub-list. */
export const EmrChatSessionWorkflowSummarySchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  workflowName: z.string(),
  status: EmrWorkflowStatusSchema,
});
export type TEmrChatSessionWorkflowSummary = z.infer<
  typeof EmrChatSessionWorkflowSummarySchema
>;

/** Summary row shown in the session sidebar list. */
export const EmrChatSessionSummarySchema = z.object({
  id: z.string(),
  title: z.string().nullish(),
  pinned: z.boolean().default(false),
  status: EmrChatSessionStatusSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  messageCount: z.number(),
  hasActiveWorkflow: z.boolean(),
  /** All workflow runs for this session (IN_PROGRESS + completed + abandoned). */
  workflows: z.array(EmrChatSessionWorkflowSummarySchema).default([]),
});
export type TEmrChatSessionSummary = z.infer<typeof EmrChatSessionSummarySchema>;

/** Full session with messages and active workflow state. */
export const EmrChatSessionFullSchema = z.object({
  id: z.string(),
  userId: z.string(),
  orgId: z.string().nullish(),
  title: z.string().nullish(),
  status: EmrChatSessionStatusSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  messages: z.array(EmrChatMessageSchema),
  activeWorkflow: EmrWorkflowStateSchema.nullish(),
  completedWorkflows: z.array(EmrWorkflowStateSchema).default([]),
});
export type TEmrChatSessionFull = z.infer<typeof EmrChatSessionFullSchema>;
