/**
 * Form schema and default value resolver for DoctorProfileForm.
 *
 * Layer: client / telemedicine / doctor / forms
 *
 * Flat schema — the submit handler maps each field onto the appropriate
 * FHIR sub-resource action payload.
 *
 * Note: `prefix` maps to Practitioner.name[0].prefix (string[]) — stored
 * as a single string in the form and wrapped in an array on submit.
 * `language_codes` maps to Practitioner.communication[].language_code —
 * managed as a diff on submit (add new, delete removed).
 */

import { z } from "zod";
import type { TPractitionerResponse } from "@/modules/entities/schemas/practitioner";

/** Flat form schema covering all doctor profile fields. */
export const DoctorProfileFormSchema = z.object({
  // Personal details
  prefix: z.string().optional(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  gender: z.enum(["male", "female", "other", "unknown", ""]).optional(),
  birth_date: z.date().optional(),
  // Contact
  phone: z.string().optional(),
  alt_phone: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  alt_email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  // Address
  address_line: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_postal_code: z.string().optional(),
  // Languages (BCP-47 codes; managed as add/delete diff on submit)
  language_codes: z.array(z.string()).optional(),
});

export type TDoctorProfileForm = z.infer<typeof DoctorProfileFormSchema>;

/**
 * Derives default form values from an existing practitioner record.
 * Falls back to empty strings so controlled inputs stay controlled.
 *
 * @param practitioner - Existing practitioner or null (create mode).
 * @returns Flat form defaults ready for useForm defaultValues.
 */
export function deriveDefaults(
  practitioner: TPractitionerResponse | null,
): TDoctorProfileForm {
  const primaryName = practitioner?.name?.[0];
  const phones =
    practitioner?.telecom?.filter((t) => t.system === "phone") ?? [];
  const emails =
    practitioner?.telecom?.filter((t) => t.system === "email") ?? [];
  const primaryAddress = practitioner?.address?.[0];
  const langCodes =
    practitioner?.communication
      ?.map((c) => c.language_code)
      .filter((c): c is string => !!c) ?? [];

  return {
    prefix: primaryName?.prefix?.[0] ?? "",
    given_name: primaryName?.given?.[0] ?? "",
    family_name: primaryName?.family ?? "",
    gender: (practitioner?.gender as TDoctorProfileForm["gender"]) ?? "",
    birth_date: practitioner?.birth_date
      ? new Date(practitioner.birth_date)
      : undefined,
    phone: phones[0]?.value ?? "",
    alt_phone: phones[1]?.value ?? "",
    email: emails[0]?.value ?? "",
    alt_email: emails[1]?.value ?? "",
    address_line: primaryAddress?.line?.[0] ?? "",
    address_city: primaryAddress?.city ?? "",
    address_state: primaryAddress?.state ?? "",
    address_postal_code: primaryAddress?.postal_code ?? "",
    language_codes: langCodes,
  };
}
