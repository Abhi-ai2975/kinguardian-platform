-- CreateEnum
CREATE TYPE "IntakeMode" AS ENUM ('TEXT', 'VOICE');

-- CreateEnum
CREATE TYPE "IntakeStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "EmrChatSessionStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EmrMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "EmrMessageType" AS ENUM ('TEXT', 'WORKFLOW_START', 'WORKFLOW_STEP', 'WORKFLOW_COMPLETE', 'WORKFLOW_ABANDONED', 'WORKFLOW_ERROR');

-- CreateEnum
CREATE TYPE "EmrWorkflowStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'ERROR');

-- CreateTable
CREATE TABLE "Test" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intakes" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "org_id" TEXT,
    "patient_fhir_id" INTEGER,
    "mode" "IntakeMode" NOT NULL,
    "status" "IntakeStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "conversation" JSONB,
    "report" JSONB,
    "fhir_appointment_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intakes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmrChatSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "title" TEXT,
    "status" "EmrChatSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmrChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmrChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "EmrMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "type" "EmrMessageType" NOT NULL DEFAULT 'TEXT',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmrChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmrWorkflowState" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "triggerMessageId" TEXT,
    "workflowDefinition" JSONB NOT NULL,
    "workflowId" TEXT NOT NULL,
    "workflowName" TEXT NOT NULL,
    "currentStepIndex" INTEGER NOT NULL DEFAULT 0,
    "totalSteps" INTEGER NOT NULL,
    "sessionContext" JSONB NOT NULL DEFAULT '{}',
    "status" "EmrWorkflowStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmrWorkflowState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmrWorkflowStepSubmission" (
    "id" TEXT NOT NULL,
    "workflowStateId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "stepId" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "actionName" TEXT NOT NULL,
    "formData" JSONB NOT NULL,
    "responseData" JSONB,
    "extractedOutputs" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmrWorkflowStepSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "intakes_user_id_idx" ON "intakes"("user_id");

-- CreateIndex
CREATE INDEX "intakes_fhir_appointment_id_idx" ON "intakes"("fhir_appointment_id");

-- CreateIndex
CREATE INDEX "EmrChatSession_userId_idx" ON "EmrChatSession"("userId");

-- CreateIndex
CREATE INDEX "EmrChatSession_userId_updatedAt_idx" ON "EmrChatSession"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "EmrChatMessage_sessionId_idx" ON "EmrChatMessage"("sessionId");

-- CreateIndex
CREATE INDEX "EmrChatMessage_sessionId_createdAt_idx" ON "EmrChatMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmrWorkflowState_triggerMessageId_key" ON "EmrWorkflowState"("triggerMessageId");

-- CreateIndex
CREATE INDEX "EmrWorkflowState_sessionId_idx" ON "EmrWorkflowState"("sessionId");

-- CreateIndex
CREATE INDEX "EmrWorkflowState_sessionId_status_idx" ON "EmrWorkflowState"("sessionId", "status");

-- CreateIndex
CREATE INDEX "EmrWorkflowStepSubmission_workflowStateId_idx" ON "EmrWorkflowStepSubmission"("workflowStateId");

-- CreateIndex
CREATE UNIQUE INDEX "EmrWorkflowStepSubmission_workflowStateId_stepIndex_key" ON "EmrWorkflowStepSubmission"("workflowStateId", "stepIndex");

-- AddForeignKey
ALTER TABLE "EmrChatMessage" ADD CONSTRAINT "EmrChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "EmrChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmrWorkflowState" ADD CONSTRAINT "EmrWorkflowState_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "EmrChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmrWorkflowState" ADD CONSTRAINT "EmrWorkflowState_triggerMessageId_fkey" FOREIGN KEY ("triggerMessageId") REFERENCES "EmrChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmrWorkflowStepSubmission" ADD CONSTRAINT "EmrWorkflowStepSubmission_workflowStateId_fkey" FOREIGN KEY ("workflowStateId") REFERENCES "EmrWorkflowState"("id") ON DELETE CASCADE ON UPDATE CASCADE;
