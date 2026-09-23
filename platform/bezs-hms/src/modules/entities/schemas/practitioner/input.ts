/**
 * Practitioner input/validation schemas.
 *
 * Layer: entities / schemas / practitioner
 *
 * Contains write-side Zod schemas: create DTOs, patch DTOs, list query, and
 * per-sub-resource create/patch schemas. Mirrors the fhir-gql Pydantic input
 * models exactly so the same names can be shared with the server actions.
 */

import { z } from "zod";

// ── Qualification identifier (nested inside qualification create/patch) ────────

/** Input schema for creating an identifier nested inside a qualification. */
export const QualificationIdentifierInputSchema = z.object({
  use: z.string().optional(),
  type_system: z.string().optional(),
  type_code: z.string().optional(),
  type_display: z.string().optional(),
  type_text: z.string().optional(),
  system: z.string().optional(),
  value: z.string().min(1),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  assigner: z.string().optional(),
});
export type TQualificationIdentifierInput = z.infer<typeof QualificationIdentifierInputSchema>;

// ── Core CRUD ────────────────────────────────────────────────────────────────

/** Schema for creating a new Practitioner resource. Only scalar fields. */
export const CreatePractitionerValidationSchema = z.object({
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  active: z.boolean().optional(),
  /** FHIR gender code: male | female | other | unknown */
  gender: z.enum(["male", "female", "other", "unknown"]).optional(),
  birth_date: z.string().optional(),
  deceased_boolean: z.boolean().optional(),
  deceased_datetime: z.string().optional(),
});
export type TCreatePractitioner = z.infer<typeof CreatePractitionerValidationSchema>;

/** Patch-only fields (no id). Used as the API request body for PATCH /practitioners/{id}. */
const PractitionerPatchBaseSchema = z.object({
  active: z.boolean().optional(),
  gender: z.enum(["male", "female", "other", "unknown"]).optional(),
  birth_date: z.string().optional(),
  deceased_boolean: z.boolean().optional(),
  deceased_datetime: z.string().optional(),
});

/** DTO type (API body) for patching a Practitioner — id not included. */
export const PractitionerPatchDtoSchema = PractitionerPatchBaseSchema;
export type TPractitionerPatchDto = z.infer<typeof PractitionerPatchDtoSchema>;

/** Full validation schema for an update action (includes id for controller routing). */
export const UpdatePractitionerValidationSchema = PractitionerPatchBaseSchema.extend({
  id: z.number().int().positive(),
});
export type TUpdatePractitioner = z.infer<typeof UpdatePractitionerValidationSchema>;

/** Query params for listing Practitioners. */
export const ListPractitionersValidationSchema = z.object({
  family_name: z.string().optional(),
  given_name: z.string().optional(),
  active: z.boolean().optional(),
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListPractitionersQuery = z.infer<typeof ListPractitionersValidationSchema>;

/** Validation schema for get-by-id operations. */
export const GetByIdPractitionerValidationSchema = z.object({
  id: z.number().int().positive(),
});
export type TGetByIdPractitioner = z.infer<typeof GetByIdPractitionerValidationSchema>;

/** Validation schema for getMe — resolves the practitioner linked to userId. */
export const GetMyPractitionerValidationSchema = z.object({
  userId: z.string().min(1),
});
export type TGetMyPractitioner = z.infer<typeof GetMyPractitionerValidationSchema>;

/** Validation schema for delete operations. */
export const DeletePractitionerValidationSchema = z.object({
  id: z.number().int().positive(),
});
export type TDeletePractitioner = z.infer<typeof DeletePractitionerValidationSchema>;

// ── Names sub-resource ────────────────────────────────────────────────────────

const PractitionerNameBaseSchema = z.object({
  use: z.enum(["usual", "official", "temp", "nickname", "anonymous", "old", "maiden"]).optional(),
  text: z.string().optional(),
  family: z.string().optional(),
  given: z.array(z.string()).optional(),
  prefix: z.array(z.string()).optional(),
  suffix: z.array(z.string()).optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});

export const AddPractitionerNameSchema = PractitionerNameBaseSchema;
export type TAddPractitionerName = z.infer<typeof AddPractitionerNameSchema>;

export const PatchPractitionerNameDtoSchema = PractitionerNameBaseSchema;
export type TPatchPractitionerNameDto = z.infer<typeof PatchPractitionerNameDtoSchema>;

export const PatchPractitionerNameValidationSchema = PractitionerNameBaseSchema.extend({
  practitionerId: z.number().int().positive(),
  nameId: z.number().int().positive(),
});
export type TPatchPractitionerName = z.infer<typeof PatchPractitionerNameValidationSchema>;

// ── Identifiers sub-resource ──────────────────────────────────────────────────

const PractitionerIdentifierBaseSchema = z.object({
  use: z.enum(["usual", "official", "temp", "secondary", "old"]).optional(),
  type_system: z.string().optional(),
  type_code: z.string().optional(),
  type_display: z.string().optional(),
  type_text: z.string().optional(),
  system: z.string().optional(),
  value: z.string().min(1),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  assigner: z.string().optional(),
});

export const AddPractitionerIdentifierSchema = PractitionerIdentifierBaseSchema;
export type TAddPractitionerIdentifier = z.infer<typeof AddPractitionerIdentifierSchema>;

export const PatchPractitionerIdentifierDtoSchema = PractitionerIdentifierBaseSchema.partial();
export type TPatchPractitionerIdentifierDto = z.infer<typeof PatchPractitionerIdentifierDtoSchema>;

export const PatchPractitionerIdentifierValidationSchema = PractitionerIdentifierBaseSchema.partial().extend({
  practitionerId: z.number().int().positive(),
  identifierId: z.number().int().positive(),
});
export type TPatchPractitionerIdentifier = z.infer<typeof PatchPractitionerIdentifierValidationSchema>;

// ── Telecom sub-resource ──────────────────────────────────────────────────────

const PractitionerTelecomBaseSchema = z.object({
  system: z.enum(["phone", "fax", "email", "pager", "url", "sms", "other"]),
  value: z.string().min(1),
  use: z.enum(["home", "work", "temp", "old", "mobile"]).optional(),
  rank: z.number().int().positive().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});

export const AddPractitionerTelecomSchema = PractitionerTelecomBaseSchema;
export type TAddPractitionerTelecom = z.infer<typeof AddPractitionerTelecomSchema>;

export const PatchPractitionerTelecomDtoSchema = PractitionerTelecomBaseSchema.partial();
export type TPatchPractitionerTelecomDto = z.infer<typeof PatchPractitionerTelecomDtoSchema>;

export const PatchPractitionerTelecomValidationSchema = PractitionerTelecomBaseSchema.partial().extend({
  practitionerId: z.number().int().positive(),
  telecomId: z.number().int().positive(),
});
export type TPatchPractitionerTelecom = z.infer<typeof PatchPractitionerTelecomValidationSchema>;

// ── Addresses sub-resource ────────────────────────────────────────────────────

const PractitionerAddressBaseSchema = z.object({
  use: z.enum(["home", "work", "temp", "old", "billing"]).optional(),
  type: z.enum(["postal", "physical", "both"]).optional(),
  text: z.string().optional(),
  line: z.array(z.string()).optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});

export const AddPractitionerAddressSchema = PractitionerAddressBaseSchema;
export type TAddPractitionerAddress = z.infer<typeof AddPractitionerAddressSchema>;

export const PatchPractitionerAddressDtoSchema = PractitionerAddressBaseSchema.partial();
export type TPatchPractitionerAddressDto = z.infer<typeof PatchPractitionerAddressDtoSchema>;

export const PatchPractitionerAddressValidationSchema = PractitionerAddressBaseSchema.partial().extend({
  practitionerId: z.number().int().positive(),
  addressId: z.number().int().positive(),
});
export type TPatchPractitionerAddress = z.infer<typeof PatchPractitionerAddressValidationSchema>;

// ── Photos sub-resource ───────────────────────────────────────────────────────

const PractitionerPhotoBaseSchema = z.object({
  content_type: z.string().optional(),
  language: z.string().optional(),
  /** Base-64 encoded data. */
  data: z.string().optional(),
  url: z.string().optional(),
  size: z.number().int().optional(),
  hash: z.string().optional(),
  title: z.string().optional(),
  /** ISO-8601 date-time string for when the photo was created. */
  creation: z.string().optional(),
});

export const AddPractitionerPhotoSchema = PractitionerPhotoBaseSchema;
export type TAddPractitionerPhoto = z.infer<typeof AddPractitionerPhotoSchema>;

export const PatchPractitionerPhotoDtoSchema = PractitionerPhotoBaseSchema.partial();
export type TPatchPractitionerPhotoDto = z.infer<typeof PatchPractitionerPhotoDtoSchema>;

export const PatchPractitionerPhotoValidationSchema = PractitionerPhotoBaseSchema.partial().extend({
  practitionerId: z.number().int().positive(),
  photoId: z.number().int().positive(),
});
export type TPatchPractitionerPhoto = z.infer<typeof PatchPractitionerPhotoValidationSchema>;

// ── Qualifications sub-resource ───────────────────────────────────────────────

const PractitionerQualificationBaseSchema = z.object({
  /** Identifiers attached to this qualification (e.g. license number). Full replace on patch. */
  identifier: z.array(QualificationIdentifierInputSchema).optional(),
  code_system: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  code_text: z.string().optional(),
  status_system: z.string().optional(),
  status_code: z.string().optional(),
  status_display: z.string().optional(),
  status_text: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  /** Reference to an issuing Organization (type + FHIR id pair). */
  issuer: z.string().optional(),
  issuer_display: z.string().optional(),
});

export const AddPractitionerQualificationSchema = PractitionerQualificationBaseSchema;
export type TAddPractitionerQualification = z.infer<typeof AddPractitionerQualificationSchema>;

export const PatchPractitionerQualificationDtoSchema = PractitionerQualificationBaseSchema.partial();
export type TPatchPractitionerQualificationDto = z.infer<typeof PatchPractitionerQualificationDtoSchema>;

export const PatchPractitionerQualificationValidationSchema = PractitionerQualificationBaseSchema.partial().extend({
  practitionerId: z.number().int().positive(),
  qualificationId: z.number().int().positive(),
});
export type TPatchPractitionerQualification = z.infer<typeof PatchPractitionerQualificationValidationSchema>;

// ── Communications sub-resource ───────────────────────────────────────────────

const PractitionerCommunicationBaseSchema = z.object({
  language_system: z.string().optional(),
  language_code: z.string().min(1),
  language_display: z.string().optional(),
  language_text: z.string().optional(),
  preferred: z.boolean().optional(),
});

export const AddPractitionerCommunicationSchema = PractitionerCommunicationBaseSchema;
export type TAddPractitionerCommunication = z.infer<typeof AddPractitionerCommunicationSchema>;

export const PatchPractitionerCommunicationDtoSchema = PractitionerCommunicationBaseSchema.partial();
export type TPatchPractitionerCommunicationDto = z.infer<typeof PatchPractitionerCommunicationDtoSchema>;

export const PatchPractitionerCommunicationValidationSchema = PractitionerCommunicationBaseSchema.partial().extend({
  practitionerId: z.number().int().positive(),
  communicationId: z.number().int().positive(),
});
export type TPatchPractitionerCommunication = z.infer<typeof PatchPractitionerCommunicationValidationSchema>;

// ── Sub-resource delete helpers ───────────────────────────────────────────────

/** Validation schema for deleting any practitioner sub-resource item by its own id. */
export const DeletePractitionerSubResourceValidationSchema = z.object({
  practitionerId: z.number().int().positive(),
  itemId: z.number().int().positive(),
});
export type TDeletePractitionerSubResource = z.infer<typeof DeletePractitionerSubResourceValidationSchema>;

// ── Full create — inline sub-resource item schemas (no practitionerId) ────────
// Used exclusively by POST /practitioners/full which atomically creates the
// practitioner and all sub-resources in a single request.

/**
 * Input schema for POST /practitioners/full — creates a Practitioner and any
 * combination of its sub-resources atomically in a single DB transaction.
 *
 * Only includes the four sub-resources used by the doctor profile form.
 * The base schemas (PractitionerNameBaseSchema etc.) already omit the parent ID,
 * making them directly suitable for the /full payload.
 */
export const CreatePractitionerFullValidationSchema = CreatePractitionerValidationSchema.extend({
  names: z.array(PractitionerNameBaseSchema).optional(),
  telecom: z.array(PractitionerTelecomBaseSchema).optional(),
  addresses: z.array(PractitionerAddressBaseSchema).optional(),
  communications: z.array(PractitionerCommunicationBaseSchema).optional(),
});
export type TCreatePractitionerFull = z.infer<typeof CreatePractitionerFullValidationSchema>;

/**
 * Input schema for PATCH /practitioners/{id}/full — atomically updates a Practitioner's
 * scalar fields and replaces its sub-resource arrays in one DB transaction.
 * All sub-resource arrays are optional; omitting one leaves it untouched.
 */
export const UpdatePractitionerFullValidationSchema = PractitionerPatchBaseSchema.extend({
  id: z.number().int().positive(),
  names: z.array(PractitionerNameBaseSchema).optional(),
  telecom: z.array(PractitionerTelecomBaseSchema).optional(),
  addresses: z.array(PractitionerAddressBaseSchema).optional(),
  communications: z.array(PractitionerCommunicationBaseSchema).optional(),
});
export type TUpdatePractitionerFull = z.infer<typeof UpdatePractitionerFullValidationSchema>;

/** DTO body for PATCH /practitioners/{id}/full — id excluded (passed as path param). */
export const UpdatePractitionerFullDtoSchema = PractitionerPatchBaseSchema.extend({
  names: z.array(PractitionerNameBaseSchema).optional(),
  telecom: z.array(PractitionerTelecomBaseSchema).optional(),
  addresses: z.array(PractitionerAddressBaseSchema).optional(),
  communications: z.array(PractitionerCommunicationBaseSchema).optional(),
});
export type TUpdatePractitionerFullDto = z.infer<typeof UpdatePractitionerFullDtoSchema>;
