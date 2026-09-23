/**
 * EMR Chat Prisma repository.
 *
 * Layer: server / core / emr-chat / infrastructure / repositories
 *
 * Implements IEmrChatRepository using the Prisma ORM. Unlike the REST-based
 * services (patient, organization), this repository accesses the local
 * PostgreSQL database directly — no external API or JWT token is required.
 *
 * Error mapping: Prisma's PrismaClientKnownRequestError P2025 (record not found)
 * propagates as NotFoundError thrown explicitly by the query logic below.
 * All other unexpected errors propagate as-is.
 */

import { randomUUID } from "crypto";
import type { IEmrChatRepository } from "../../domain/interfaces/emr-chat.repository.interface";
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
import { prisma } from "@/lib/db";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { NotFoundError } from "@/modules/server/shared/errors/commonErrors";

/**
 * Casts a plain object to Prisma's InputJsonValue.
 * Prisma v7 with the custom generator requires this explicit cast for JSON fields
 * because `Record<string, unknown>` does not satisfy the generated type union.
 * The runtime behavior is correct — Prisma accepts plain objects for JSON columns.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pj<T>(v: T): any {
  return v;
}

/**
 * Maps a Prisma EmrChatSession row + aggregates to a summary DTO.
 *
 * @param row - Raw Prisma query result with _count and workflowStates.
 * @returns Summary DTO for the sidebar list.
 */
function toSessionSummary(row: {
  id: string;
  title: string | null;
  pinned: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  _count: { messages: number };
  workflowStates: { id: string; workflowId: string; workflowName: string; status: string }[];
}): TEmrChatSessionSummary {
  return {
    id: row.id,
    title: row.title,
    pinned: row.pinned,
    status: row.status as TEmrChatSessionSummary["status"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    messageCount: row._count.messages,
    hasActiveWorkflow: row.workflowStates.some((w) => w.status === "IN_PROGRESS"),
    workflows: row.workflowStates.map((w) => ({
      id: w.id,
      workflowId: w.workflowId,
      workflowName: w.workflowName,
      status: w.status as TEmrChatSessionSummary["workflows"][number]["status"],
    })),
  };
}

/**
 * Prisma-backed implementation of the EMR chat persistence repository.
 */
export class EmrChatPrismaRepository implements IEmrChatRepository {
  // ── Sessions ───────────────────────────────────────────────────────────────

  /**
   * Creates a new chat session in the database.
   *
   * @param dto - userId, orgId, optional title.
   * @returns The session summary DTO.
   */
  async createSession(dto: TCreateEmrChatSession): Promise<TEmrChatSessionSummary> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "EmrChatPrismaRepository.createSession",
      startTimeMs,
      context: { operationId, userId: dto.userId },
    });

    try {
      const session = await prisma.emrChatSession.create({
        data: {
          userId: dto.userId,
          orgId: dto.orgId,
          title: dto.title,
        },
        include: {
          _count: { select: { messages: true } },
          workflowStates: {
            select: { id: true, workflowId: true, workflowName: true, status: true },
            orderBy: { startedAt: "asc" },
          },
        },
      });

      const result = toSessionSummary(session);

      logOperation("success", {
        name: "EmrChatPrismaRepository.createSession",
        startTimeMs,
        data: result,
        context: { operationId, sessionId: result.id },
      });

      return result;
    } catch (err) {
      logOperation("error", {
        name: "EmrChatPrismaRepository.createSession",
        startTimeMs,
        err,
        context: { operationId },
      });
      throw err;
    }
  }

  /**
   * Loads a session with all messages and the active workflow state.
   *
   * @param id - Session UUID.
   * @returns Full session DTO.
   * @throws NotFoundError if not found.
   */
  async getSession(id: string): Promise<TEmrChatSessionFull> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "EmrChatPrismaRepository.getSession",
      startTimeMs,
      context: { operationId, sessionId: id },
    });

    try {
      const session = await prisma.emrChatSession.findUnique({
        where: { id },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          workflowStates: {
            orderBy: { startedAt: "asc" },
            include: {
              stepSubmissions: { orderBy: { stepIndex: "asc" } },
            },
          },
        },
      });

      if (!session) {
        throw new NotFoundError(`Chat session not found: ${id}`);
      }

      const activeWorkflow =
        session.workflowStates.find((w) => w.status === "IN_PROGRESS") ?? null;

      const mapWorkflow = (wf: (typeof session.workflowStates)[number]): TEmrWorkflowState => ({
        id: wf.id,
        sessionId: wf.sessionId,
        triggerMessageId: wf.triggerMessageId,
        workflowDefinition: wf.workflowDefinition as Record<string, unknown>,
        workflowId: wf.workflowId,
        workflowName: wf.workflowName,
        currentStepIndex: wf.currentStepIndex,
        totalSteps: wf.totalSteps,
        sessionContext: wf.sessionContext as Record<string, unknown>,
        status: wf.status as TEmrWorkflowState["status"],
        startedAt: wf.startedAt,
        completedAt: wf.completedAt,
        updatedAt: wf.updatedAt,
        stepSubmissions: wf.stepSubmissions.map((s) => ({
          id: s.id,
          workflowStateId: s.workflowStateId,
          stepIndex: s.stepIndex,
          stepId: s.stepId,
          stepName: s.stepName,
          actionName: s.actionName,
          formData: s.formData as Record<string, unknown>,
          responseData: s.responseData as Record<string, unknown> | null,
          extractedOutputs: s.extractedOutputs as Record<string, unknown> | null,
          submittedAt: s.submittedAt,
        })),
      });

      const result: TEmrChatSessionFull = {
        id: session.id,
        userId: session.userId,
        orgId: session.orgId,
        title: session.title,
        status: session.status as TEmrChatSessionFull["status"],
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messages: session.messages.map((m) => ({
          id: m.id,
          sessionId: m.sessionId,
          role: m.role as TEmrChatMessage["role"],
          content: m.content,
          type: m.type as TEmrChatMessage["type"],
          metadata: m.metadata as Record<string, unknown> | null,
          createdAt: m.createdAt,
        })),
        activeWorkflow: activeWorkflow ? mapWorkflow(activeWorkflow) : null,
        completedWorkflows: session.workflowStates
          .filter((w) => w.status !== "IN_PROGRESS")
          .map(mapWorkflow),
      };

      logOperation("success", {
        name: "EmrChatPrismaRepository.getSession",
        startTimeMs,
        context: { operationId, sessionId: id, messageCount: result.messages.length },
      });

      return result;
    } catch (err) {
      logOperation("error", {
        name: "EmrChatPrismaRepository.getSession",
        startTimeMs,
        err,
        context: { operationId, sessionId: id },
      });
      throw err;
    }
  }

  /**
   * Lists the most recent sessions for a user (ordered by updatedAt desc).
   *
   * @param query - userId, optional cursor and limit.
   * @returns Array of session summaries.
   */
  async listSessions(query: TListEmrChatSessions): Promise<TEmrChatSessionSummary[]> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "EmrChatPrismaRepository.listSessions",
      startTimeMs,
      context: { operationId, userId: query.userId },
    });

    try {
      const sessions = await prisma.emrChatSession.findMany({
        where: {
          userId: query.userId,
          status: "ACTIVE",
          ...(query.cursor ? { updatedAt: { lt: new Date(query.cursor) } } : {}),
        },
        orderBy: { updatedAt: "desc" },
        take: query.limit ?? 50,
        include: {
          _count: { select: { messages: true } },
          workflowStates: {
            select: { id: true, workflowId: true, workflowName: true, status: true },
            orderBy: { startedAt: "asc" },
          },
        },
      });

      const result = sessions.map(toSessionSummary);

      logOperation("success", {
        name: "EmrChatPrismaRepository.listSessions",
        startTimeMs,
        context: { operationId, count: result.length },
      });

      return result;
    } catch (err) {
      logOperation("error", {
        name: "EmrChatPrismaRepository.listSessions",
        startTimeMs,
        err,
        context: { operationId },
      });
      throw err;
    }
  }

  /**
   * Updates the session title.
   *
   * @param id - Session UUID.
   * @param title - New title string (auto-generated or user-renamed).
   */
  async updateSessionTitle(id: string, title: string): Promise<void> {
    await prisma.emrChatSession.update({ where: { id }, data: { title } });
  }

  /**
   * Toggles the pinned flag on a session.
   *
   * @param id - Session UUID.
   * @param pinned - True to pin, false to unpin.
   */
  async pinSession(id: string, pinned: boolean): Promise<void> {
    await prisma.emrChatSession.update({ where: { id }, data: { pinned } });
  }

  /**
   * Archives a session (hides it from the sidebar without deleting data).
   *
   * @param id - Session UUID.
   */
  async deleteSession(id: string): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "EmrChatPrismaRepository.deleteSession",
      startTimeMs,
      context: { operationId, sessionId: id },
    });

    try {
      await prisma.emrChatSession.update({
        where: { id },
        data: { status: "ARCHIVED" },
      });

      logOperation("success", {
        name: "EmrChatPrismaRepository.deleteSession",
        startTimeMs,
        context: { operationId, sessionId: id },
      });
    } catch (err) {
      logOperation("error", {
        name: "EmrChatPrismaRepository.deleteSession",
        startTimeMs,
        err,
        context: { operationId, sessionId: id },
      });
      throw err;
    }
  }

  // ── Messages ────────────────────────────────────────────────────────────────

  /**
   * Appends a message and touches the session's updatedAt.
   *
   * @param dto - sessionId, role, content, type, metadata.
   * @returns The created message DTO.
   */
  async addMessage(dto: TAddEmrChatMessage): Promise<TEmrChatMessage> {
    const [message] = await prisma.$transaction([
      prisma.emrChatMessage.create({
        data: {
          sessionId: dto.sessionId,
          role: dto.role,
          content: dto.content,
          type: dto.type,
          metadata: pj(dto.metadata),
        },
      }),
      // Bump session updatedAt so the sidebar re-sorts correctly.
      prisma.emrChatSession.update({
        where: { id: dto.sessionId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return {
      id: message.id,
      sessionId: message.sessionId,
      role: message.role as TEmrChatMessage["role"],
      content: message.content,
      type: message.type as TEmrChatMessage["type"],
      metadata: message.metadata as Record<string, unknown> | null,
      createdAt: message.createdAt,
    };
  }

  // ── Workflow States ─────────────────────────────────────────────────────────

  /**
   * Creates a workflow state row when a new FHIR workflow begins.
   *
   * @param dto - Full workflow definition + initial context.
   * @returns The created workflow state DTO.
   */
  async createWorkflowState(dto: TCreateWorkflowState): Promise<TEmrWorkflowState> {
    const state = await prisma.emrWorkflowState.create({
      data: {
        sessionId: dto.sessionId,
        triggerMessageId: dto.triggerMessageId,
        workflowDefinition: pj(dto.workflowDefinition),
        workflowId: dto.workflowId,
        workflowName: dto.workflowName,
        totalSteps: dto.totalSteps,
        sessionContext: pj(dto.sessionContext ?? {}),
      },
    });

    return {
      id: state.id,
      sessionId: state.sessionId,
      triggerMessageId: state.triggerMessageId,
      workflowDefinition: state.workflowDefinition as Record<string, unknown>,
      workflowId: state.workflowId,
      workflowName: state.workflowName,
      currentStepIndex: state.currentStepIndex,
      totalSteps: state.totalSteps,
      sessionContext: state.sessionContext as Record<string, unknown>,
      status: state.status as TEmrWorkflowState["status"],
      startedAt: state.startedAt,
      completedAt: state.completedAt,
      updatedAt: state.updatedAt,
    };
  }

  /**
   * Advances the workflow step or updates the accumulated session context.
   *
   * @param id - WorkflowState UUID.
   * @param dto - Fields to update (stepIndex, context, status).
   * @returns The updated workflow state DTO.
   */
  async updateWorkflowState(id: string, dto: TUpdateWorkflowState): Promise<TEmrWorkflowState> {
    const state = await prisma.emrWorkflowState.update({
      where: { id },
      data: {
        ...(dto.currentStepIndex !== undefined && { currentStepIndex: dto.currentStepIndex }),
        ...(dto.sessionContext !== undefined && { sessionContext: pj(dto.sessionContext) }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.status === "COMPLETED" || dto.status === "ABANDONED" || dto.status === "ERROR"
          ? { completedAt: new Date() }
          : {}),
      },
    });

    return {
      id: state.id,
      sessionId: state.sessionId,
      triggerMessageId: state.triggerMessageId,
      workflowDefinition: state.workflowDefinition as Record<string, unknown>,
      workflowId: state.workflowId,
      workflowName: state.workflowName,
      currentStepIndex: state.currentStepIndex,
      totalSteps: state.totalSteps,
      sessionContext: state.sessionContext as Record<string, unknown>,
      status: state.status as TEmrWorkflowState["status"],
      startedAt: state.startedAt,
      completedAt: state.completedAt,
      updatedAt: state.updatedAt,
    };
  }

  /**
   * Returns the single IN_PROGRESS workflow for a session, or null.
   *
   * @param sessionId - Session UUID.
   * @returns The active workflow state with step submissions, or null.
   */
  async getActiveWorkflow(sessionId: string): Promise<TEmrWorkflowState | null> {
    const state = await prisma.emrWorkflowState.findFirst({
      where: { sessionId, status: "IN_PROGRESS" },
      include: { stepSubmissions: { orderBy: { stepIndex: "asc" } } },
    });

    if (!state) return null;

    return {
      id: state.id,
      sessionId: state.sessionId,
      triggerMessageId: state.triggerMessageId,
      workflowDefinition: state.workflowDefinition as Record<string, unknown>,
      workflowId: state.workflowId,
      workflowName: state.workflowName,
      currentStepIndex: state.currentStepIndex,
      totalSteps: state.totalSteps,
      sessionContext: state.sessionContext as Record<string, unknown>,
      status: state.status as TEmrWorkflowState["status"],
      startedAt: state.startedAt,
      completedAt: state.completedAt,
      updatedAt: state.updatedAt,
      stepSubmissions: state.stepSubmissions.map((s) => ({
        id: s.id,
        workflowStateId: s.workflowStateId,
        stepIndex: s.stepIndex,
        stepId: s.stepId,
        stepName: s.stepName,
        actionName: s.actionName,
        formData: s.formData as Record<string, unknown>,
        responseData: s.responseData as Record<string, unknown> | null,
        extractedOutputs: s.extractedOutputs as Record<string, unknown> | null,
        submittedAt: s.submittedAt,
      })),
    };
  }

  // ── Step Submissions ────────────────────────────────────────────────────────

  /**
   * Records a completed workflow step for auditing and session resume.
   * Uses upsert so re-submitting a step (e.g. after error) replaces the old record.
   *
   * @param dto - workflowStateId, stepIndex, form data, FHIR response, extracted outputs.
   * @returns The upserted step submission DTO.
   */
  async addStepSubmission(dto: TAddStepSubmission): Promise<TEmrWorkflowStepSubmission> {
    const submission = await prisma.emrWorkflowStepSubmission.upsert({
      where: {
        workflowStateId_stepIndex: {
          workflowStateId: dto.workflowStateId,
          stepIndex: dto.stepIndex,
        },
      },
      create: {
        workflowStateId: dto.workflowStateId,
        stepIndex: dto.stepIndex,
        stepId: dto.stepId,
        stepName: dto.stepName,
        actionName: dto.actionName,
        formData: pj(dto.formData),
        responseData: pj(dto.responseData),
        extractedOutputs: pj(dto.extractedOutputs),
      },
      update: {
        formData: pj(dto.formData),
        responseData: pj(dto.responseData),
        extractedOutputs: pj(dto.extractedOutputs),
        submittedAt: new Date(),
      },
    });

    return {
      id: submission.id,
      workflowStateId: submission.workflowStateId,
      stepIndex: submission.stepIndex,
      stepId: submission.stepId,
      stepName: submission.stepName,
      actionName: submission.actionName,
      formData: submission.formData as Record<string, unknown>,
      responseData: submission.responseData as Record<string, unknown> | null,
      extractedOutputs: submission.extractedOutputs as Record<string, unknown> | null,
      submittedAt: submission.submittedAt,
    };
  }
}
