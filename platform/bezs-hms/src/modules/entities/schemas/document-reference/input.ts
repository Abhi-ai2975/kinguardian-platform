/**
 * DocumentReference input/validation schemas.
 * Layer: entities / schemas / document-reference
 * Required fields: status (1..1), content (1..*).
 * Unlike DiagnosticReport, child arrays (content, authors, security_labels, etc.)
 * CAN be replaced via PATCH on the fhir-server.
 * URL path: POST/GET/PATCH/DELETE /document-references/
 */
import { z } from "zod";

// ── Child array input schemas ─────────────────────────────────────────────────

const AttachmentInputSchema = z.object({
  /** MIME type e.g. 'application/pdf'. */
  content_type: z.string().optional(),
  language: z.string().optional(),
  /** Base64-encoded content — prefer url for FilNest uploads. */
  data: z.string().optional(),
  /** FilNest fileId stored as the URL value; resolved to a presigned URL on read. */
  url: z.string().optional(),
  size: z.number().int().optional(),
  hash: z.string().optional(),
  title: z.string().optional(),
  creation: z.string().optional(),
});

const ContentInputSchema = z.object({
  /** Document attachment — must include at least url or data. */
  attachment: AttachmentInputSchema,
  format_system: z.string().optional(),
  format_version: z.string().optional(),
  format_code: z.string().optional(),
  format_display: z.string().optional(),
});

const AuthorInputSchema = z.object({
  /** Author reference e.g. 'Practitioner/30001'. */
  reference: z.string().optional(),
  display: z.string().optional(),
});

const RelatesToInputSchema = z.object({
  code: z.string(),
  target: z.string(),
  target_display: z.string().optional(),
});

const SecurityLabelInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});

const IdentifierInputSchema = z.object({
  use: z.string().optional(),
  type_system: z.string().optional(),
  type_code: z.string().optional(),
  type_display: z.string().optional(),
  type_text: z.string().optional(),
  system: z.string().optional(),
  value: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  assigner: z.string().optional(),
});

const CategoryInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});

const ContextEncounterInputSchema = z.object({
  /** Encounter or EpisodeOfCare reference e.g. 'Encounter/20001'. */
  reference: z.string().optional(),
  display: z.string().optional(),
});

const ContextEventInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});

const ContextRelatedInputSchema = z.object({
  /**
   * Link to any clinical resource for traceability.
   * e.g. 'ServiceRequest/80001' or 'DiagnosticReport/50001'.
   */
  reference: z.string().optional(),
  display: z.string().optional(),
});

const ContextInputSchema = z.object({
  encounter: z.array(ContextEncounterInputSchema).optional(),
  event: z.array(ContextEventInputSchema).optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  facility_type_system: z.string().optional(),
  facility_type_code: z.string().optional(),
  facility_type_display: z.string().optional(),
  facility_type_text: z.string().optional(),
  practice_setting_system: z.string().optional(),
  practice_setting_code: z.string().optional(),
  practice_setting_display: z.string().optional(),
  practice_setting_text: z.string().optional(),
  source_patient_info: z.string().optional(),
  source_patient_info_display: z.string().optional(),
  related: z.array(ContextRelatedInputSchema).optional(),
});

// ── Create schema ─────────────────────────────────────────────────────────────

export const CreateDocumentReferenceValidationSchema = z.object({
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  master_identifier_use: z.string().optional(),
  master_identifier_type_system: z.string().optional(),
  master_identifier_type_code: z.string().optional(),
  master_identifier_type_display: z.string().optional(),
  master_identifier_type_text: z.string().optional(),
  master_identifier_system: z.string().optional(),
  master_identifier_value: z.string().optional(),
  master_identifier_period_start: z.string().optional(),
  master_identifier_period_end: z.string().optional(),
  master_identifier_assigner: z.string().optional(),
  /** FHIR R4 DocumentReference.status is 1..1. */
  status: z.enum(["current", "superseded", "entered-in-error"]),
  doc_status: z.string().optional(),
  type_system: z.string().optional(),
  type_code: z.string().optional(),
  type_display: z.string().optional(),
  type_text: z.string().optional(),
  /** FHIR reference e.g. 'Patient/10001'. */
  subject: z.string().optional(),
  subject_display: z.string().optional(),
  date: z.string().optional(),
  authors: z.array(AuthorInputSchema).optional(),
  /** Authenticator reference e.g. 'Practitioner/30001'. */
  authenticator: z.string().optional(),
  authenticator_display: z.string().optional(),
  /** Custodian Organisation reference e.g. 'Organization/190001'. */
  custodian: z.string().optional(),
  custodian_display: z.string().optional(),
  relates_to: z.array(RelatesToInputSchema).optional(),
  description: z.string().optional(),
  security_labels: z.array(SecurityLabelInputSchema).optional(),
  /** FHIR R4 DocumentReference.content is 1..*. At least one item required. */
  content: z.array(ContentInputSchema).min(1),
  identifiers: z.array(IdentifierInputSchema).optional(),
  categories: z.array(CategoryInputSchema).optional(),
  /** Clinical context — use context.related to link to ServiceRequest/DiagnosticReport. */
  context: ContextInputSchema.optional(),
});
export type TCreateDocumentReference = z.infer<typeof CreateDocumentReferenceValidationSchema>;

// ── Update (patch) schema ─────────────────────────────────────────────────────

const UpdateDocumentReferenceBaseSchema = z.object({
  status: z.enum(["current", "superseded", "entered-in-error"]).optional(),
  doc_status: z.string().optional(),
  master_identifier_use: z.string().optional(),
  master_identifier_type_system: z.string().optional(),
  master_identifier_type_code: z.string().optional(),
  master_identifier_type_display: z.string().optional(),
  master_identifier_type_text: z.string().optional(),
  master_identifier_system: z.string().optional(),
  master_identifier_value: z.string().optional(),
  master_identifier_period_start: z.string().optional(),
  master_identifier_period_end: z.string().optional(),
  master_identifier_assigner: z.string().optional(),
  type_system: z.string().optional(),
  type_code: z.string().optional(),
  type_display: z.string().optional(),
  type_text: z.string().optional(),
  subject: z.string().optional(),
  subject_display: z.string().optional(),
  date: z.string().optional(),
  authors: z.array(AuthorInputSchema).optional(),
  authenticator: z.string().optional(),
  authenticator_display: z.string().optional(),
  custodian: z.string().optional(),
  custodian_display: z.string().optional(),
  relates_to: z.array(RelatesToInputSchema).optional(),
  description: z.string().optional(),
  security_labels: z.array(SecurityLabelInputSchema).optional(),
  /** When supplied, replaces the existing content list on the fhir-server. */
  content: z.array(ContentInputSchema).optional(),
  identifiers: z.array(IdentifierInputSchema).optional(),
  categories: z.array(CategoryInputSchema).optional(),
  context: ContextInputSchema.optional(),
});

export const UpdateDocumentReferenceDtoSchema = UpdateDocumentReferenceBaseSchema;
export type TUpdateDocumentReferenceDto = z.infer<typeof UpdateDocumentReferenceDtoSchema>;

export const UpdateDocumentReferenceValidationSchema = UpdateDocumentReferenceBaseSchema.extend({
  id: z.number().int().positive(),
});
export type TUpdateDocumentReference = z.infer<typeof UpdateDocumentReferenceValidationSchema>;

// ── List / getById / delete ───────────────────────────────────────────────────

export const ListDocumentReferencesValidationSchema = z.object({
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListDocumentReferencesQuery = z.infer<typeof ListDocumentReferencesValidationSchema>;

export const GetByIdDocumentReferenceValidationSchema = z.object({ id: z.number().int().positive() });
export type TGetByIdDocumentReference = z.infer<typeof GetByIdDocumentReferenceValidationSchema>;

export const DeleteDocumentReferenceValidationSchema = z.object({ id: z.number().int().positive() });
export type TDeleteDocumentReference = z.infer<typeof DeleteDocumentReferenceValidationSchema>;
