/**
 * Organization form schemas for React Hook Form.
 *
 * Layer: entities / schemas / organization
 *
 * Form schemas intentionally differ from validation schemas:
 *  - String-array fields (name_given, address_line, etc.) are represented
 *    as comma-separated strings; the modal's handleSubmit splits them back
 *    into arrays before calling the server action.
 *  - EditOrgFormSchema only exposes the three patchable scalar fields per
 *    the fhir-gql PATCH contract. Child arrays are not editable via PATCH.
 */

import { z } from "zod";
import {
  OrgTypeInputSchema,
  OrgIdentifierInputSchema,
  OrgTelecomInputSchema,
  OrgAddressInputSchema,
  OrgContactTelecomInputSchema,
  OrgEndpointInputSchema,
} from "./input";

/**
 * Address sub-schema for the create form.
 * `line` is a single string (one street-address line) instead of string[].
 * The modal wraps it in an array before sending to the API.
 */
export const OrgAddressFormItemSchema = OrgAddressInputSchema.extend({
  line: z.string().optional(),
});
export type TOrgAddressFormItem = z.infer<typeof OrgAddressFormItemSchema>;

/**
 * Contact person sub-schema for the create form.
 * String-array fields (name_given, name_prefix, name_suffix, address_line)
 * are represented as comma-separated strings and split by the modal.
 */
export const OrgContactFormItemSchema = z.object({
  purpose_system: z.string().optional(),
  purpose_code: z.string().optional(),
  purpose_display: z.string().optional(),
  purpose_text: z.string().optional(),
  /** Sourced from the terminology server (resource="Patient" field="name.use") via TerminologySelect. */
  name_use: z.string().optional(),
  name_text: z.string().optional(),
  name_family: z.string().optional(),
  /** Comma-separated given names, e.g. "John Michael". */
  name_given: z.string().optional(),
  /** Comma-separated prefixes, e.g. "Dr., Prof.". */
  name_prefix: z.string().optional(),
  /** Comma-separated suffixes, e.g. "MD, PhD". */
  name_suffix: z.string().optional(),
  address_use: z.string().optional(),
  address_type: z.string().optional(),
  address_text: z.string().optional(),
  /** Comma-separated street address lines. */
  address_line: z.string().optional(),
  address_city: z.string().optional(),
  address_district: z.string().optional(),
  address_state: z.string().optional(),
  address_postal_code: z.string().optional(),
  address_country: z.string().optional(),
  telecom: z.array(OrgContactTelecomInputSchema).optional(),
});
export type TOrgContactFormItem = z.infer<typeof OrgContactFormItemSchema>;

/**
 * Full form schema for the "Create Organization" modal.
 * Covers all fields accepted by fhir-gql's RegisterOrgSchema.
 */
export const CreateOrgFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.array(OrgTypeInputSchema).min(1, "At least one organization type is required"),
  active: z.boolean(),
  partof: z.string().optional(),
  partof_display: z.string().optional(),
  identifier: z.array(OrgIdentifierInputSchema).optional(),
  alias: z.array(z.object({ value: z.string().min(1) })).optional(),
  telecom: z.array(OrgTelecomInputSchema).optional(),
  address: z.array(OrgAddressFormItemSchema).optional(),
  contact: z.array(OrgContactFormItemSchema).optional(),
  endpoint: z.array(OrgEndpointInputSchema).optional(),
});
export type TCreateOrgFormSchema = z.infer<typeof CreateOrgFormSchema>;

/**
 * Form schema for the "Edit Organization" modal.
 * Only exposes the three patchable scalar fields per the fhir-gql PATCH contract.
 * Child arrays are not editable here — delete and re-create to change those.
 */
export const EditOrgFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  active: z.boolean(),
  partof_display: z.string().optional(),
});
export type TEditOrgFormSchema = z.infer<typeof EditOrgFormSchema>;
