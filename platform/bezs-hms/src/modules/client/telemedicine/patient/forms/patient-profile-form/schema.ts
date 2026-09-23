/**
 * Form schema and default value resolver for PatientProfileForm.
 *
 * Layer: client / telemedicine / patient / forms
 *
 * Flat schema — the submit handler in PatientProfileForm maps each field
 * onto the appropriate FHIR sub-resource action payload.
 */

import { z } from "zod";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";

/** Flat form schema covering all patient profile fields. */
export const ProfileFormSchema = z.object({
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  gender: z.enum(["male", "female", "other", "unknown", ""]).optional(),
  birth_date: z.date().optional(),
  phone: z.string().optional(),
  alt_phone: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  alt_email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  address_line: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_postal_code: z.string().optional(),
});

export type TProfileForm = z.infer<typeof ProfileFormSchema>;

/**
 * Derives default form values from an existing patient record.
 * Falls back to empty strings so controlled inputs stay controlled.
 *
 * @param patient - Existing patient or null (create mode).
 * @returns Flat form defaults ready for useForm defaultValues.
 */
export function deriveDefaults(patient: TPatientResponse | null): TProfileForm {
  const primaryName = patient?.name?.[0];
  const phones = patient?.telecom?.filter((t) => t.system === "phone") ?? [];
  const emails = patient?.telecom?.filter((t) => t.system === "email") ?? [];
  const primaryAddress = patient?.address?.[0];

  return {
    given_name: primaryName?.given?.[0] ?? "",
    family_name: primaryName?.family ?? "",
    gender: (patient?.gender as TProfileForm["gender"]) ?? "",
    birth_date: patient?.birth_date ? new Date(patient.birth_date) : undefined,
    phone: phones[0]?.value ?? "",
    alt_phone: phones[1]?.value ?? "",
    email: emails[0]?.value ?? "",
    alt_email: emails[1]?.value ?? "",
    address_line: primaryAddress?.line?.[0] ?? "",
    address_city: primaryAddress?.city ?? "",
    address_state: primaryAddress?.state ?? "",
    address_postal_code: primaryAddress?.postal_code ?? "",
  };
}
