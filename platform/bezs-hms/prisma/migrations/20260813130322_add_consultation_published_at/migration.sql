-- Adds the doctor-approval stamp to consultations.
--
-- NULL means this consultation's SOAP note and clinical extractions are still
-- AI suggestions awaiting review. Both columns are nullable and stamped
-- together, server-side, when the doctor confirms on the review page.
--
-- Existing rows stay NULL on purpose: whether they were already published lives
-- in FHIR, not in this database, so it cannot be backfilled from here. Readers
-- fall back to checking for published FHIR resources on those rows.

-- AlterTable
ALTER TABLE "consultations" ADD COLUMN     "published_at" TIMESTAMP(3),
ADD COLUMN     "published_by" TEXT;
