/**
 * Practitioner form schemas for React Hook Form.
 *
 * Layer: entities / schemas / practitioner
 *
 * Form schemas intentionally differ from the validation schemas:
 *  - `names[].given/prefix/suffix` are comma-separated strings instead of
 *    string[]; the modal splits each before submit — same convention used
 *    across every prior resource's HumanName fields this session.
 *  - `addresses[].line` is a single string (one line) instead of string[];
 *    the modal wraps it into `[string]` before submit — mirrors Location's
 *    address_line simplification.
 *  - `user_id` is a REQUIRED, visible input on the create form (not silently
 *    stamped from the session like every other resource) — an admin creating
 *    a Practitioner record is linking it to a specific person's user
 *    account, a different user than the admin doing the creating. This
 *    matches the A2UI admin reference form's `target_user_id` field.
 *    `org_id` is still excluded from the form and stamped from the session,
 *    unchanged from every other resource.
 *  - `identifier[]` and `qualification[]` are included on the create form
 *    even though fhir-gql's `/full` endpoint doesn't cover them — the modal
 *    creates the core record via `createPractitionerFullAction` first, then
 *    loops any entered rows through the dedicated
 *    `addPractitionerIdentifierAction`/`addPractitionerQualificationAction`.
 *    `qualification.identifier[]` (a third level of nesting) is deliberately
 *    not exposed in the UI — rare data, optional on the backend.
 *  - EditPractitionerFormSchema mirrors the fields fhir-gql's
 *    `/full` PATCH endpoint actually supports (scalars + the same 4 arrays)
 *    — a genuine departure from every prior resource's scalar-only edit
 *    form, because this backend endpoint supports array replacement.
 *    `identifier[]`/`qualification[]`/photo are NOT part of this schema —
 *    they're true sub-resource routes with their own immediate-mutation UI,
 *    independent of the parent record's Save button.
 */

import { z } from "zod";
import {
  AddPractitionerTelecomSchema,
  AddPractitionerCommunicationSchema,
  AddPractitionerIdentifierSchema,
} from "./input";

/**
 * HumanName sub-schema for the create/edit forms.
 * `given`/`prefix`/`suffix` are comma-separated strings instead of string[].
 */
export const PractitionerNameFormItemSchema = z.object({
  use: z.enum(["usual", "official", "temp", "nickname", "anonymous", "old", "maiden"]).optional(),
  text: z.string().optional(),
  family: z.string().optional(),
  given: z.string().optional(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});
export type TPractitionerNameFormItem = z.infer<typeof PractitionerNameFormItemSchema>;

/**
 * Address sub-schema for the create/edit forms.
 * `line` is a single string (one line) instead of string[].
 */
export const PractitionerAddressFormItemSchema = z.object({
  use: z.enum(["home", "work", "temp", "old", "billing"]).optional(),
  type: z.enum(["postal", "physical", "both"]).optional(),
  text: z.string().optional(),
  line: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});
export type TPractitionerAddressFormItem = z.infer<typeof PractitionerAddressFormItemSchema>;

/**
 * Qualification sub-schema for the create form.
 * `identifier[]` (a third level of nesting) is intentionally not exposed —
 * rare data, optional on the backend.
 */
export const PractitionerQualificationFormItemSchema = z.object({
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
  issuer: z.string().optional(),
  issuer_display: z.string().optional(),
});
export type TPractitionerQualificationFormItem = z.infer<
  typeof PractitionerQualificationFormItemSchema
>;

/**
 * Full create form schema. Covers the Practitioner core scalars plus the 4
 * arrays accepted by `/full` (names, telecom, addresses, communications)
 * plus identifier[]/qualification[] (created via follow-up sub-resource
 * calls after the core record exists). `org_id` is excluded — the modal
 * stamps it from the session, matching every other resource.
 */
export const CreatePractitionerFormSchema = z.object({
  user_id: z.string().min(1, "User ID is required"),
  active: z.boolean().optional(),
  gender: z.enum(["male", "female", "other", "unknown"]).optional(),
  birth_date: z.string().optional(),
  deceased_boolean: z.boolean().optional(),
  deceased_datetime: z.string().optional(),

  names: z.array(PractitionerNameFormItemSchema).optional(),
  telecom: z.array(AddPractitionerTelecomSchema).optional(),
  addresses: z.array(PractitionerAddressFormItemSchema).optional(),
  communications: z.array(AddPractitionerCommunicationSchema).optional(),

  identifier: z.array(AddPractitionerIdentifierSchema).optional(),
  qualification: z.array(PractitionerQualificationFormItemSchema).optional(),
});
export type TCreatePractitionerFormSchema = z.infer<typeof CreatePractitionerFormSchema>;

/**
 * Edit form schema. Mirrors the scalars + 4 arrays fhir-gql's
 * `/full` PATCH endpoint actually supports. identifier[]/qualification[]/
 * photo are handled outside this form via immediate-mutation sub-resource
 * actions.
 */
export const EditPractitionerFormSchema = z.object({
  active: z.boolean().optional(),
  gender: z.enum(["male", "female", "other", "unknown"]).optional(),
  birth_date: z.string().optional(),
  deceased_boolean: z.boolean().optional(),
  deceased_datetime: z.string().optional(),

  names: z.array(PractitionerNameFormItemSchema).optional(),
  telecom: z.array(AddPractitionerTelecomSchema).optional(),
  addresses: z.array(PractitionerAddressFormItemSchema).optional(),
  communications: z.array(AddPractitionerCommunicationSchema).optional(),
});
export type TEditPractitionerFormSchema = z.infer<typeof EditPractitionerFormSchema>;
