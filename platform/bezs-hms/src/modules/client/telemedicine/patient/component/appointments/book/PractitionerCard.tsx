/**
 * PractitionerCard — selectable card for a FHIR PractitionerRole in the booking wizard.
 *
 * Layer: client / telemedicine / patient / appointments / book
 *
 * Renders the practitioner's display name, specialty, qualification, location,
 * languages, healthcare service, and availability status derived from the
 * fhir-gql enriched booking response. The /booking endpoint resolves Location,
 * HealthcareService, and Practitioner detail server-side so no second fetch needed.
 * Clicking the card selects it; a checkmark appears when selected.
 */

"use client";

import { CheckCircle2, MapPin, Stethoscope } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { TPractitionerRoleBookingResponse } from "@/modules/entities/schemas/practitioner-role";

/** Props for PractitionerCard. */
interface PractitionerCardProps {
  /** The FHIR PractitionerRole (booking-enriched) to display. */
  role: TPractitionerRoleBookingResponse;
  /** Whether this card is the currently selected practitioner. */
  selected: boolean;
  /** Called when the user clicks the card. */
  onSelect: () => void;
}

/**
 * Derives a display name from the embedded practitioner_detail.
 * Falls back to practitioner_display if name sub-resource is absent.
 *
 * @param role - The PractitionerRoleBooking response object.
 * @returns A formatted full name string.
 */
export function getPractitionerName(
  role: TPractitionerRoleBookingResponse,
): string {
  const n = role.practitioner_detail?.name;
  if (!n) return role.practitioner_display ?? "Unknown Practitioner";
  const parts = [...(n.prefix ?? []), ...(n.given ?? []), n.family].filter(
    Boolean,
  );
  return (
    (parts.join(" ") || role.practitioner_display) ?? "Unknown Practitioner"
  );
}

/**
 * Derives the specialty display string from specialty or code arrays.
 *
 * @param role - The PractitionerRoleBooking response object.
 * @returns Specialty label or empty string.
 */
export function getPractitionerSpecialty(
  role: TPractitionerRoleBookingResponse,
): string {
  return (
    role.specialty?.[0]?.coding_display ??
    role.specialty?.[0]?.text ??
    role.code?.[0]?.coding_display ??
    ""
  );
}

/**
 * Returns the first letter(s) of the practitioner's name for the avatar fallback.
 *
 * @param name - Full display name.
 * @returns 1–2 uppercase characters.
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/**
 * Derives a location label from the enriched booking location array.
 * Shows clinic name and city when available.
 *
 * @param role - The PractitionerRoleBooking response object.
 * @returns Location string or null if not available.
 */
export function getPractitionerLocation(
  role: TPractitionerRoleBookingResponse,
): string | null {
  const loc = role.location?.[0];
  if (!loc) return null;
  // name is the enriched Location.name; fall back to reference_display, then city only
  const label = loc.name ?? loc.reference_display;
  const city = loc.address_city;
  if (label && city) return `${label}, ${city}`;
  return label ?? city ?? null;
}

/**
 * Derives up to `max` language display labels from the enriched practitioner_detail.
 * Returns an object with `labels` (shown) and `overflow` (count of hidden extras).
 *
 * @param role - The PractitionerRoleBooking response object.
 * @param max - Maximum number of language labels to show before "+N more".
 */
function getPractitionerLanguages(
  role: TPractitionerRoleBookingResponse,
  max = 2,
): { labels: string[]; overflow: number } {
  const langs = role.practitioner_detail?.languages ?? [];
  const labels = langs
    .map((l) => l.display ?? l.code)
    .filter((v): v is string => Boolean(v));
  return { labels: labels.slice(0, max), overflow: Math.max(0, labels.length - max) };
}

/**
 * Returns the primary healthcare service name from the enriched booking response.
 *
 * @param role - The PractitionerRoleBooking response object.
 * @returns Service name string or null.
 */
function getHealthcareServiceName(
  role: TPractitionerRoleBookingResponse,
): string | null {
  return role.healthcare_service?.[0]?.name ?? null;
}

/**
 * Selectable doctor card for Step 1 of the booking wizard.
 *
 * @param role - FHIR PractitionerRole (booking-enriched).
 * @param selected - Whether this card is currently selected.
 * @param onSelect - Selection callback.
 */
export function PractitionerCard({
  role,
  selected,
  onSelect,
}: PractitionerCardProps) {
  const name = getPractitionerName(role);
  const specialty = getPractitionerSpecialty(role);
  const photoUrl = role.practitioner_detail?.photo_url;
  const qualification =
    role.practitioner_detail?.qualifications?.[0]?.code_display ?? null;
  const location = getPractitionerLocation(role);
  const { labels: langLabels, overflow: langOverflow } =
    getPractitionerLanguages(role);
  const serviceName = getHealthcareServiceName(role);
  const isActive = role.active !== false;

  return (
    <Card
      onClick={onSelect}
      className={cn(
        "relative p-4 cursor-pointer transition-all duration-150",
        selected
          ? "border-2 border-primary bg-primary/10 shadow-md shadow-primary/20"
          : "border hover:border-primary/40 hover:shadow-sm",
      )}
    >
      {/* Selected checkmark badge — top-right corner */}
      {selected && (
        <div className="absolute top-2.5 right-2.5 bg-primary text-primary-foreground rounded-full p-0.5">
          <CheckCircle2 className="size-3.5" />
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className="size-10 shrink-0 mt-0.5">
          {photoUrl && <AvatarImage src={photoUrl} alt={name} />}
          <AvatarFallback className="text-sm font-semibold">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>

        {/* Core info */}
        <div className="flex-1 min-w-0 pr-5">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold truncate">{name}</p>
          </div>

          {specialty && (
            <p className="text-xs text-muted-foreground truncate">{specialty}</p>
          )}
          {qualification && (
            <p className="text-xs text-muted-foreground/70 truncate">
              {qualification}
            </p>
          )}

          {/* Location pill */}
          {location && (
            <p className="text-xs text-muted-foreground/60 truncate flex items-center gap-1 mt-1">
              <MapPin className="size-2.5 shrink-0" />
              {location}
            </p>
          )}

          {/* Healthcare service */}
          {serviceName && (
            <p className="text-xs text-muted-foreground/60 truncate flex items-center gap-1 mt-0.5">
              <Stethoscope className="size-2.5 shrink-0" />
              {serviceName}
            </p>
          )}

          {/* Language badges */}
          {langLabels.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap mt-1.5">
              {langLabels.map((lang) => (
                <Badge
                  key={lang}
                  variant="outline"
                  className="text-[10px] px-1.5 h-4 font-normal"
                >
                  {lang}
                </Badge>
              ))}
              {langOverflow > 0 && (
                <span className="text-[10px] text-muted-foreground/60">
                  +{langOverflow} more
                </span>
              )}
            </div>
          )}

          {!isActive && (
            <Badge
              variant="secondary"
              className="mt-1 text-[10px] px-1.5 h-4"
            >
              Unavailable
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
