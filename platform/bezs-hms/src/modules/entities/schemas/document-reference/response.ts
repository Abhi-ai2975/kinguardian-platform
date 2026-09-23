/**
 * DocumentReference response schemas.
 * Layer: entities / schemas / document-reference
 * Mirrors the fhir-gql plain JSON response shape. All fields are .nullish()
 * for forward-compatibility with fhir-server additions.
 */
import { z } from "zod";

// ── Child array response schemas ──────────────────────────────────────────────

const AttachmentResponseSchema = z.object({
  content_type: z.string().nullish(),
  language: z.string().nullish(),
  /** FilNest fileId — resolve to presigned URL via /api/filenest-download-url?fileId={url}. */
  url: z.string().nullish(),
  size: z.number().nullish(),
  hash: z.string().nullish(),
  title: z.string().nullish(),
  creation: z.string().nullish(),
});

/**
 * One content entry.
 *
 * fhir-server returns the attachment **flattened** onto the entry — its plain
 * mapper emits `attachment_title`, `attachment_url` and so on, not a nested
 * `attachment` object (see mappers/document_reference/plain.py). fhir-gql
 * declares the nested shape but passes the payload straight through, so what
 * actually arrives here is flat.
 *
 * That mattered because Zod strips unknown keys: declaring only the nested
 * shape silently deleted every `attachment_*` field at parse time, leaving
 * entries with nothing but an id. The Documents tab then had no title (showing
 * "Untitled") and, worse, no url — so its View and Download buttons never
 * rendered at all.
 *
 * Both shapes are accepted: the flat fields are what the server sends today,
 * and the nested object is kept so nothing breaks if fhir-gql is later fixed to
 * honour its own declared schema. Read them through `contentAttachment()`
 * rather than reaching for either directly.
 */
const ContentResponseSchema = z.object({
  id: z.number().nullish(),
  /** Nested form — declared by fhir-gql, not currently sent. */
  attachment: AttachmentResponseSchema.nullish(),
  /** Flat form — what fhir-server actually returns. */
  attachment_content_type: z.string().nullish(),
  attachment_language: z.string().nullish(),
  attachment_url: z.string().nullish(),
  attachment_size: z.number().nullish(),
  attachment_hash: z.string().nullish(),
  attachment_title: z.string().nullish(),
  attachment_creation: z.string().nullish(),
  format_system: z.string().nullish(),
  format_version: z.string().nullish(),
  format_code: z.string().nullish(),
  format_display: z.string().nullish(),
});
export type TDocumentReferenceContent = z.infer<typeof ContentResponseSchema>;

/**
 * Reads a content entry's attachment, whichever shape it arrived in.
 *
 * @param entry - One DocumentReference content entry.
 * @returns The attachment fields, normalised to the nested shape.
 */
export function contentAttachment(
  entry: TDocumentReferenceContent,
): z.infer<typeof AttachmentResponseSchema> {
  /* Nested wins when present — it is the shape fhir-gql promises. */
  if (entry.attachment) return entry.attachment;

  return {
    content_type: entry.attachment_content_type,
    language: entry.attachment_language,
    url: entry.attachment_url,
    size: entry.attachment_size,
    hash: entry.attachment_hash,
    title: entry.attachment_title,
    creation: entry.attachment_creation,
  };
}

// ── Top-level response schemas ────────────────────────────────────────────────

export const DocumentReferenceResponseSchema = z.object({
  id: z.number(),
  user_id: z.string().nullish(),
  org_id: z.string().nullish(),
  status: z.string().nullish(),
  doc_status: z.string().nullish(),
  type_system: z.string().nullish(),
  type_code: z.string().nullish(),
  type_display: z.string().nullish(),
  type_text: z.string().nullish(),
  subject_type: z.string().nullish(),
  subject_id: z.number().nullish(),
  subject_display: z.string().nullish(),
  date: z.string().nullish(),
  description: z.string().nullish(),
  authenticator: z.string().nullish(),
  authenticator_display: z.string().nullish(),
  custodian: z.string().nullish(),
  custodian_display: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
  content: z.array(ContentResponseSchema).nullish(),
  authors: z.array(z.record(z.any())).nullish(),
  security_labels: z.array(z.record(z.any())).nullish(),
  identifiers: z.array(z.record(z.any())).nullish(),
  categories: z.array(z.record(z.any())).nullish(),
  relates_to: z.array(z.record(z.any())).nullish(),
  context: z.record(z.any()).nullish(),
});
export type TDocumentReferenceResponse = z.infer<typeof DocumentReferenceResponseSchema>;

export const PaginatedDocumentReferenceResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(DocumentReferenceResponseSchema),
});
export type TPaginatedDocumentReferenceResponse = z.infer<typeof PaginatedDocumentReferenceResponseSchema>;
