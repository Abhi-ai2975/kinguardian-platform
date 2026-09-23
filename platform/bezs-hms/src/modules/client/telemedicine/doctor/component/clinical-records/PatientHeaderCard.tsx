/**
 * PatientHeaderCard — patient identity banner for the Clinical Records pages.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records
 *
 * Renders the selected patient's name, FHIR id, demographics and primary
 * contact. Shown above the appointment list and again above the clinical
 * workspace so the doctor always knows whose chart is open.
 *
 * Pure presentational server component — no client state, no "use client".
 */

import { Cake, Mail, Phone, UserRound, VenusAndMars } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Composes a display name from a FHIR Patient's name[] array.
 * Prefers `text`, falling back to given + family, then a generic label.
 *
 * @param patient - Patient record, or null when the lookup failed.
 * @param fallback - Name to use when the record has none (e.g. from the appointment).
 * @returns Best available display name.
 */
export function patientDisplayName(
  patient: TPatientResponse | null,
  fallback: string,
): string {
  const name = patient?.name?.[0];
  if (!name) return fallback;
  if (name.text) return name.text;
  const composed = [...(name.given ?? []), name.family].filter(Boolean).join(" ");
  return composed || fallback;
}

/**
 * Formats an ISO date as a locale date plus derived age, e.g. "12 Mar 1988 (37)".
 *
 * @param iso - ISO 8601 birth date.
 * @returns Formatted string, or null when no birth date is recorded.
 */
function fmtBirthDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    const formatted = d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    /* Age in whole years — adjust when this year's birthday hasn't passed. */
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const monthDiff = today.getMonth() - d.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) age -= 1;
    return age >= 0 ? `${formatted} (${age})` : formatted;
  } catch {
    return null;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface PatientHeaderCardProps {
  /** Patient record from fhir-gql, or null when the lookup failed. */
  patient: TPatientResponse | null;
  /** Fallback display name (typically taken from an appointment participant). */
  fallbackName: string;
  /** FHIR Patient.id — always known from the route even if the record failed to load. */
  patientId: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Patient identity banner.
 *
 * @param patient - Patient record, or null if unavailable.
 * @param fallbackName - Name to show when the record has none.
 * @param patientId - FHIR Patient.id shown alongside the name.
 */
export function PatientHeaderCard({
  patient,
  fallbackName,
  patientId,
}: PatientHeaderCardProps) {
  const name = patientDisplayName(patient, fallbackName);
  const birth = fmtBirthDate(patient?.birth_date);
  const gender = patient?.gender ?? null;

  /* First phone and email from telecom[], if the patient recorded any. */
  const phone = patient?.telecom?.find((t) => t.system === "phone")?.value ?? null;
  const email = patient?.telecom?.find((t) => t.system === "email")?.value ?? null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="px-4 py-3 flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserRound className="size-5" />
        </span>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-base font-semibold truncate">{name}</p>
            <Badge variant="secondary" className="text-[10px] font-mono font-normal">
              Patient/{patientId}
            </Badge>
          </div>

          <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-muted-foreground">
            {gender && (
              <span className="flex items-center gap-1.5 capitalize">
                <VenusAndMars className="size-3 shrink-0" />
                {gender}
              </span>
            )}
            {birth && (
              <span className="flex items-center gap-1.5">
                <Cake className="size-3 shrink-0" />
                {birth}
              </span>
            )}
            {phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="size-3 shrink-0" />
                {phone}
              </span>
            )}
            {email && (
              <span className="flex items-center gap-1.5 truncate">
                <Mail className="size-3 shrink-0" />
                {email}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
