/**
 * Profile guard utilities for telemedicine server components.
 *
 * Layer: server / auth
 *
 * Provides two functions — `requirePatientProfile` and `requirePractitionerProfile` —
 * that each:
 *   1. Call the relevant "get my profile" server action.
 *   2. If no FHIR record exists for the signed-in user, redirect to the
 *      appropriate profile setup page so the user can complete onboarding.
 *   3. Return the fetched profile so the caller page can use it without
 *      re-fetching.
 *
 * Usage: call at the top of every protected patient / doctor page.tsx.
 * Do NOT use on the profile pages themselves (infinite redirect loop).
 *
 * Architecture note:
 *   redirect() from next-intl/navigation throws a special NEXT_REDIRECT error
 *   (same mechanism as Next.js built-in redirect). TypeScript does not always
 *   infer `never` for it, so we add an `unreachable` throw as a type narrowing
 *   hint only — it will never actually execute.
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getPatientMeAction } from "@/modules/server/presentation/actions/patient";
import { getMyPractitionerAction } from "@/modules/server/presentation/actions/practitioner";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import type { TPractitionerResponse } from "@/modules/entities/schemas/practitioner";

// ── Default redirect targets ───────────────────────────────────────────────────

/** Default redirect path (no locale prefix) when no Patient record is found. */
const DEFAULT_PATIENT_PROFILE_PATH = "/bezs/telemedicine/patient/profile";

/** Default redirect path (no locale prefix) when no Practitioner record is found. */
const DEFAULT_DOCTOR_PROFILE_PATH =
  "/bezs/telemedicine/doctor/settings/profile";

// ── Guards ────────────────────────────────────────────────────────────────────

/**
 * Fetches the logged-in user's Patient FHIR record.
 * Redirects to `redirectHref` (defaults to the patient profile setup page) if
 * no record is found.
 *
 * Use at the top of every patient-side page.tsx that requires a FHIR profile
 * to operate (appointments, intake, booking, etc.).
 *
 * @param redirectHref - Where to redirect when no record exists. Defaults to
 *   the patient profile setup page. Must be an absolute path without locale prefix.
 * @returns The Patient FHIR record — guaranteed non-null on return.
 * @throws NEXT_REDIRECT (via next-intl redirect) when no Patient record exists.
 */
export async function requirePatientProfile(
  redirectHref = DEFAULT_PATIENT_PROFILE_PATH,
): Promise<TPatientResponse> {
  const locale = await getLocale();
  const [data, err] = await getPatientMeAction();

  if (err || !data) {
    redirect({ href: redirectHref, locale });
    // TypeScript narrowing hint — redirect() throws, this line is unreachable
    throw new Error("unreachable");
  }

  return data;
}

/**
 * Fetches the logged-in user's Practitioner FHIR record.
 * Redirects to `redirectHref` (defaults to the doctor profile setup page) if
 * no record is found.
 *
 * Use at the top of every doctor-side page.tsx that requires a FHIR profile
 * to operate (appointments, intake insights, etc.).
 *
 * @param redirectHref - Where to redirect when no record exists. Defaults to
 *   the doctor profile setup page. Must be an absolute path without locale prefix.
 * @returns The Practitioner FHIR record — guaranteed non-null on return.
 * @throws NEXT_REDIRECT (via next-intl redirect) when no Practitioner record exists.
 */
export async function requirePractitionerProfile(
  redirectHref = DEFAULT_DOCTOR_PROFILE_PATH,
): Promise<TPractitionerResponse> {
  const locale = await getLocale();
  const [data, err] = await getMyPractitionerAction();

  if (err || !data) {
    redirect({ href: redirectHref, locale });
    // TypeScript narrowing hint — redirect() throws, this line is unreachable
    throw new Error("unreachable");
  }

  return data;
}
