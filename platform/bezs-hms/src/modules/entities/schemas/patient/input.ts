/**
 * Patient input validation schemas.
 *
 * Layer: entities / schemas / patient
 *
 * Defines Zod validation schemas for every write operation on the Patient
 * resource and its nine sub-resources. These are used by controllers to
 * validate raw action input before passing to use cases.
 *
 * Enum string literals mirror the fhir-gql Pydantic enums exactly so that
 * values are accepted and forwarded without transformation.
 *
 * Sub-resource operations (add / patch) always carry `patient_id` so the
 * controller knows which patient to scope the sub-resource to. Patch and
 * delete operations additionally carry the sub-resource `item_id`.
 */

import { z } from "zod";

// ── Shared enum schemas ───────────────────────────────────────────────────────

export const GenderSchema = z.enum(["male", "female", "other", "unknown"]);
export const NameUseSchema = z.enum(["usual", "official", "temp", "nickname", "anonymous", "old", "maiden"]);
export const IdentifierUseSchema = z.enum(["usual", "official", "temp", "secondary", "old"]);
export const ContactPointSystemSchema = z.enum(["phone", "fax", "email", "pager", "url", "sms", "other"]);
export const ContactPointUseSchema = z.enum(["home", "work", "temp", "old", "mobile"]);
export const AddressUseSchema = z.enum(["home", "work", "temp", "old", "billing"]);
export const AddressTypeSchema = z.enum(["postal", "physical", "both"]);
export const GPReferenceTypeSchema = z.enum(["Organization", "Practitioner", "PractitionerRole"]);
export const LinkOtherTypeSchema = z.enum(["Patient", "RelatedPerson"]);
export const LinkTypeSchema = z.enum(["replaced-by", "replaces", "refer", "seealso"]);

// ── Core Patient input ────────────────────────────────────────────────────────

/**
 * Input schema for POST /patients — create a new Patient.
 * `user_id` and `org_id` are required for multi-tenant scoping.
 */
export const CreatePatientValidationSchema = z.object({
  user_id: z.string().min(1),
  org_id: z.string().min(1),
  active: z.boolean().optional(),
  gender: GenderSchema.optional(),
  birth_date: z.string().optional(),
  deceased_boolean: z.boolean().optional(),
  deceased_datetime: z.string().optional(),
  marital_status_system: z.string().optional(),
  marital_status_code: z.string().optional(),
  marital_status_display: z.string().optional(),
  marital_status_text: z.string().optional(),
  multiple_birth_boolean: z.boolean().optional(),
  multiple_birth_integer: z.number().int().optional(),
  managing_organization: z.string().optional(),
  managing_organization_display: z.string().optional(),
});
export type TCreatePatient = z.infer<typeof CreatePatientValidationSchema>;

/** Patchable scalar fields — used by both the DTO type and the update validation schema. */
const UpdatePatientBaseSchema = z.object({
  active: z.boolean().optional(),
  gender: GenderSchema.optional(),
  birth_date: z.string().optional(),
  deceased_boolean: z.boolean().optional(),
  deceased_datetime: z.string().optional(),
  marital_status_system: z.string().optional(),
  marital_status_code: z.string().optional(),
  marital_status_display: z.string().optional(),
  marital_status_text: z.string().optional(),
  multiple_birth_boolean: z.boolean().optional(),
  multiple_birth_integer: z.number().int().optional(),
  managing_organization: z.string().optional(),
  managing_organization_display: z.string().optional(),
});

/** DTO used by the service interface — no `id` (id is passed as a separate arg). */
export const UpdatePatientDtoSchema = UpdatePatientBaseSchema;
export type TUpdatePatientDto = z.infer<typeof UpdatePatientDtoSchema>;

/** Validation schema for the action layer — includes `id`. */
export const UpdatePatientValidationSchema = UpdatePatientBaseSchema.extend({ id: z.number() });
export type TUpdatePatient = z.infer<typeof UpdatePatientValidationSchema>;

export const ListPatientsValidationSchema = z.object({
  family_name: z.string().optional(),
  given_name: z.string().optional(),
  gender: GenderSchema.optional(),
  active: z.boolean().optional(),
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
});
export type TListPatientsQuery = z.infer<typeof ListPatientsValidationSchema>;

export const GetPatientByIdValidationSchema = z.object({ id: z.number() });
export type TGetPatientById = z.infer<typeof GetPatientByIdValidationSchema>;

export const DeletePatientValidationSchema = z.object({ id: z.number() });
export type TDeletePatient = z.infer<typeof DeletePatientValidationSchema>;

// ── Sub-resource: Names ───────────────────────────────────────────────────────

export const AddPatientNameValidationSchema = z.object({
  patient_id: z.number(),
  use: NameUseSchema.optional(),
  text: z.string().optional(),
  family: z.string().optional(),
  given: z.array(z.string()).optional(),
  prefix: z.array(z.string()).optional(),
  suffix: z.array(z.string()).optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});
export type TAddPatientName = z.infer<typeof AddPatientNameValidationSchema>;

export const PatchPatientNameValidationSchema = z.object({
  patient_id: z.number(),
  item_id: z.number(),
  use: NameUseSchema.optional(),
  text: z.string().optional(),
  family: z.string().optional(),
  given: z.array(z.string()).optional(),
  prefix: z.array(z.string()).optional(),
  suffix: z.array(z.string()).optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});
export type TPatchPatientName = z.infer<typeof PatchPatientNameValidationSchema>;

export const DeletePatientSubResourceValidationSchema = z.object({
  patient_id: z.number(),
  item_id: z.number(),
});
export type TDeletePatientSubResource = z.infer<typeof DeletePatientSubResourceValidationSchema>;

export const ListPatientSubResourceValidationSchema = z.object({ patient_id: z.number() });
export type TListPatientSubResource = z.infer<typeof ListPatientSubResourceValidationSchema>;

// ── Sub-resource: Identifiers ─────────────────────────────────────────────────

export const AddPatientIdentifierValidationSchema = z.object({
  patient_id: z.number(),
  value: z.string().min(1),
  use: IdentifierUseSchema.optional(),
  type_system: z.string().optional(),
  type_code: z.string().optional(),
  type_display: z.string().optional(),
  type_text: z.string().optional(),
  system: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  assigner: z.string().optional(),
});
export type TAddPatientIdentifier = z.infer<typeof AddPatientIdentifierValidationSchema>;

export const PatchPatientIdentifierValidationSchema = z.object({
  patient_id: z.number(),
  item_id: z.number(),
  value: z.string().optional(),
  use: IdentifierUseSchema.optional(),
  type_system: z.string().optional(),
  type_code: z.string().optional(),
  type_display: z.string().optional(),
  type_text: z.string().optional(),
  system: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  assigner: z.string().optional(),
});
export type TPatchPatientIdentifier = z.infer<typeof PatchPatientIdentifierValidationSchema>;

// ── Sub-resource: Telecom ─────────────────────────────────────────────────────

export const AddPatientTelecomValidationSchema = z.object({
  patient_id: z.number(),
  system: ContactPointSystemSchema,
  value: z.string().min(1),
  use: ContactPointUseSchema.optional(),
  rank: z.number().int().min(1).optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});
export type TAddPatientTelecom = z.infer<typeof AddPatientTelecomValidationSchema>;

export const PatchPatientTelecomValidationSchema = z.object({
  patient_id: z.number(),
  item_id: z.number(),
  system: ContactPointSystemSchema.optional(),
  value: z.string().optional(),
  use: ContactPointUseSchema.optional(),
  rank: z.number().int().min(1).optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});
export type TPatchPatientTelecom = z.infer<typeof PatchPatientTelecomValidationSchema>;

// ── Sub-resource: Addresses ───────────────────────────────────────────────────

export const AddPatientAddressValidationSchema = z.object({
  patient_id: z.number(),
  use: AddressUseSchema.optional(),
  type: AddressTypeSchema.optional(),
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
export type TAddPatientAddress = z.infer<typeof AddPatientAddressValidationSchema>;

export const PatchPatientAddressValidationSchema = z.object({
  patient_id: z.number(),
  item_id: z.number(),
  use: AddressUseSchema.optional(),
  type: AddressTypeSchema.optional(),
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
export type TPatchPatientAddress = z.infer<typeof PatchPatientAddressValidationSchema>;

// ── Sub-resource: Photos ──────────────────────────────────────────────────────

export const AddPatientPhotoValidationSchema = z.object({
  patient_id: z.number(),
  content_type: z.string().optional(),
  language: z.string().optional(),
  data: z.string().optional(),
  url: z.string().optional(),
  size: z.number().int().optional(),
  hash: z.string().optional(),
  title: z.string().optional(),
  creation: z.string().optional(),
});
export type TAddPatientPhoto = z.infer<typeof AddPatientPhotoValidationSchema>;

export const PatchPatientPhotoValidationSchema = z.object({
  patient_id: z.number(),
  item_id: z.number(),
  content_type: z.string().optional(),
  language: z.string().optional(),
  data: z.string().optional(),
  url: z.string().optional(),
  size: z.number().int().optional(),
  hash: z.string().optional(),
  title: z.string().optional(),
  creation: z.string().optional(),
});
export type TPatchPatientPhoto = z.infer<typeof PatchPatientPhotoValidationSchema>;

// ── Sub-resource: Contacts ────────────────────────────────────────────────────

/** Nested relationship CodeableConcept within a contact. */
export const ContactRelationshipInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});

/** Nested telecom ContactPoint within a contact. */
export const ContactTelecomInputSchema = z.object({
  system: ContactPointSystemSchema,
  value: z.string().min(1),
  use: ContactPointUseSchema.optional(),
  rank: z.number().int().min(1).optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});

export const AddPatientContactValidationSchema = z.object({
  patient_id: z.number(),
  relationship: z.array(ContactRelationshipInputSchema).optional(),
  name_use: NameUseSchema.optional(),
  name_text: z.string().optional(),
  name_family: z.string().optional(),
  name_given: z.array(z.string()).optional(),
  name_prefix: z.array(z.string()).optional(),
  name_suffix: z.array(z.string()).optional(),
  telecom: z.array(ContactTelecomInputSchema).optional(),
  address_use: AddressUseSchema.optional(),
  address_type: AddressTypeSchema.optional(),
  address_text: z.string().optional(),
  address_line: z.array(z.string()).optional(),
  address_city: z.string().optional(),
  address_district: z.string().optional(),
  address_state: z.string().optional(),
  address_postal_code: z.string().optional(),
  address_country: z.string().optional(),
  address_period_start: z.string().optional(),
  address_period_end: z.string().optional(),
  gender: GenderSchema.optional(),
  organization: z.string().optional(),
  organization_display: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});
export type TAddPatientContact = z.infer<typeof AddPatientContactValidationSchema>;

export const PatchPatientContactValidationSchema = AddPatientContactValidationSchema.extend({
  item_id: z.number(),
}).omit({ patient_id: true }).extend({ patient_id: z.number() });
export type TPatchPatientContact = z.infer<typeof PatchPatientContactValidationSchema>;

// ── Sub-resource: Communications ──────────────────────────────────────────────

export const AddPatientCommunicationValidationSchema = z.object({
  patient_id: z.number(),
  language_code: z.string().min(1),
  language_system: z.string().optional(),
  language_display: z.string().optional(),
  language_text: z.string().optional(),
  preferred: z.boolean().optional(),
});
export type TAddPatientCommunication = z.infer<typeof AddPatientCommunicationValidationSchema>;

export const PatchPatientCommunicationValidationSchema = z.object({
  patient_id: z.number(),
  item_id: z.number(),
  language_code: z.string().optional(),
  language_system: z.string().optional(),
  language_display: z.string().optional(),
  language_text: z.string().optional(),
  preferred: z.boolean().optional(),
});
export type TPatchPatientCommunication = z.infer<typeof PatchPatientCommunicationValidationSchema>;

// ── Sub-resource: General Practitioners ──────────────────────────────────────

export const AddPatientGPValidationSchema = z.object({
  patient_id: z.number(),
  reference_type: GPReferenceTypeSchema,
  reference_id: z.number().int(),
  reference_display: z.string().optional(),
});
export type TAddPatientGP = z.infer<typeof AddPatientGPValidationSchema>;

export const PatchPatientGPValidationSchema = z.object({
  patient_id: z.number(),
  item_id: z.number(),
  reference_type: GPReferenceTypeSchema.optional(),
  reference_id: z.number().int().optional(),
  reference_display: z.string().optional(),
});
export type TPatchPatientGP = z.infer<typeof PatchPatientGPValidationSchema>;

// ── Sub-resource: Links ───────────────────────────────────────────────────────

export const AddPatientLinkValidationSchema = z.object({
  patient_id: z.number(),
  other_type: LinkOtherTypeSchema,
  other_id: z.number().int(),
  other_display: z.string().optional(),
  type: LinkTypeSchema,
});
export type TAddPatientLink = z.infer<typeof AddPatientLinkValidationSchema>;

export const PatchPatientLinkValidationSchema = z.object({
  patient_id: z.number(),
  item_id: z.number(),
  other_type: LinkOtherTypeSchema.optional(),
  other_id: z.number().int().optional(),
  other_display: z.string().optional(),
  type: LinkTypeSchema.optional(),
});
export type TPatchPatientLink = z.infer<typeof PatchPatientLinkValidationSchema>;

// ── Full create — inline sub-resource item schemas (no patient_id) ────────────
// Used exclusively by POST /patients/full which atomically creates the patient
// and all sub-resources in a single request.

/** Name item for the /full payload — omits patient_id (inferred server-side). */
const PatientFullNameItemSchema = z.object({
  use: NameUseSchema.optional(),
  text: z.string().optional(),
  family: z.string().optional(),
  given: z.array(z.string()).optional(),
  prefix: z.array(z.string()).optional(),
  suffix: z.array(z.string()).optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});

/** Telecom item for the /full payload. */
const PatientFullTelecomItemSchema = z.object({
  system: ContactPointSystemSchema,
  value: z.string().min(1),
  use: ContactPointUseSchema.optional(),
  rank: z.number().int().min(1).optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});

/** Address item for the /full payload. */
const PatientFullAddressItemSchema = z.object({
  use: AddressUseSchema.optional(),
  type: AddressTypeSchema.optional(),
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

/** Communication item for the /full payload. */
const PatientFullCommunicationItemSchema = z.object({
  language_code: z.string().min(1),
  language_system: z.string().optional(),
  language_display: z.string().optional(),
  language_text: z.string().optional(),
  preferred: z.boolean().optional(),
});

/**
 * Input schema for POST /patients/full — creates a Patient and any combination
 * of its sub-resources atomically in a single DB transaction.
 *
 * Only includes the four sub-resources used by the profile form.
 * The API supports more (identifiers, photos, contacts, gp, links) but we
 * intentionally exclude them here to keep the schema minimal.
 */
export const CreatePatientFullValidationSchema = CreatePatientValidationSchema.extend({
  names: z.array(PatientFullNameItemSchema).optional(),
  telecom: z.array(PatientFullTelecomItemSchema).optional(),
  addresses: z.array(PatientFullAddressItemSchema).optional(),
  communications: z.array(PatientFullCommunicationItemSchema).optional(),
});
export type TCreatePatientFull = z.infer<typeof CreatePatientFullValidationSchema>;

/**
 * Input schema for PATCH /patients/{id}/full — atomically updates a Patient's
 * scalar fields and replaces its sub-resource arrays in one DB transaction.
 * All sub-resource arrays are optional; omitting one leaves it untouched.
 */
export const UpdatePatientFullValidationSchema = UpdatePatientDtoSchema.extend({
  id: z.number().int().positive(),
  names: z.array(PatientFullNameItemSchema).optional(),
  telecom: z.array(PatientFullTelecomItemSchema).optional(),
  addresses: z.array(PatientFullAddressItemSchema).optional(),
  communications: z.array(PatientFullCommunicationItemSchema).optional(),
});
export type TUpdatePatientFull = z.infer<typeof UpdatePatientFullValidationSchema>;

/** DTO body for PATCH /patients/{id}/full — id excluded (passed as path param). */
export const UpdatePatientFullDtoSchema = UpdatePatientDtoSchema.extend({
  names: z.array(PatientFullNameItemSchema).optional(),
  telecom: z.array(PatientFullTelecomItemSchema).optional(),
  addresses: z.array(PatientFullAddressItemSchema).optional(),
  communications: z.array(PatientFullCommunicationItemSchema).optional(),
});
export type TUpdatePatientFullDto = z.infer<typeof UpdatePatientFullDtoSchema>;
