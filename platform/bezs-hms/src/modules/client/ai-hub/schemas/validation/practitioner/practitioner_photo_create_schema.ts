/**
 * practitioner_photo_create_schema — Zod transform for a2ui practitioner photo upload.
 *
 * Layer: client / ai-hub / schemas / validation / practitioner
 *
 * The FileUpload a2ui component writes a structured JSON object into the form
 * data after a successful FileNest upload:
 *   { fileId, filename, contentType, sizeBytes }
 *
 * This schema validates that shape (from the `profile_photo` form field) and
 * transforms it into the payload expected by POST /practitioners/{id}/photos:
 *   { url, content_type, size, title, creation }
 *
 * Used by the `upload_practitioner_photo` workflow action via the
 * VALIDATION_SCHEMAS registry in /api/workflow/submit.
 */

import { z } from "zod";

/**
 * Transforms the FileUpload field value `profile_photo` into a FHIR
 * PhotoCreateSchema-compatible payload.
 *
 * Input (from a2ui FileUpload in single-file mode):
 *   profile_photo: { fileId, filename, contentType, sizeBytes }
 *
 * Output (to POST /practitioners/{id}/photos):
 *   { url, content_type, size, title, creation }
 */
export const practitionerPhotoCreateSchema = z
  .object({
    /** Structured file record written by the a2ui FileUpload component after upload. */
    profile_photo: z.object({
      /** FileNest file ID — stored as practitioner.photo[].url in FHIR. */
      fileId: z.string().min(1, "No file uploaded"),
      /** Original filename — stored as practitioner.photo[].title. */
      filename: z.string(),
      /** MIME type — stored as practitioner.photo[].content_type. */
      contentType: z.string(),
      /** File size in bytes — stored as practitioner.photo[].size. */
      sizeBytes: z.number(),
    }),
  })
  .transform(({ profile_photo }) => ({
    url: profile_photo.fileId,
    content_type: profile_photo.contentType,
    size: profile_photo.sizeBytes,
    title: profile_photo.filename,
    /** ISO 8601 timestamp recorded at submission time. */
    creation: new Date().toISOString(),
  }));
