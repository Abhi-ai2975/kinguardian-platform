-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('WAITING', 'ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "consultations" (
    "id" SERIAL NOT NULL,
    "fhir_appointment_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "org_id" TEXT,
    "room_id" TEXT NOT NULL,
    "status" "ConsultationStatus" NOT NULL DEFAULT 'WAITING',
    "virtual_conversation" JSONB,
    "soap_note" JSONB,
    "full_report" JSONB,
    "service_requests" JSONB,
    "medication_requests" JSONB,
    "observations" JSONB,
    "conditions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "consultations_fhir_appointment_id_key" ON "consultations"("fhir_appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "consultations_room_id_key" ON "consultations"("room_id");

-- CreateIndex
CREATE INDEX "consultations_user_id_idx" ON "consultations"("user_id");
