-- CreateEnum
CREATE TYPE "AiConsultationMode" AS ENUM ('TEXT', 'VOICE');

-- CreateEnum
CREATE TYPE "AiConsultationStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "ai_consultations" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "org_id" TEXT,
    "patient_fhir_id" INTEGER,
    "mode" "AiConsultationMode" NOT NULL,
    "status" "AiConsultationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "conversation" JSONB,
    "report" JSONB,
    "fhir_appointment_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_consultations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_consultations_user_id_idx" ON "ai_consultations"("user_id");

-- CreateIndex
CREATE INDEX "ai_consultations_fhir_appointment_id_idx" ON "ai_consultations"("fhir_appointment_id");
