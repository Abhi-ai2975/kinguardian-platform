/**
 * clinicalFormat — date and count formatting shared by the clinical screens.
 *
 * Layer: client / telemedicine / shared / components / clinical
 *
 * Small, defensive helpers. Every one of these takes a nullable ISO string
 * because fhir-gql marks almost every date field nullish, and returns a
 * placeholder rather than throwing — a chart must still render when one
 * timestamp is missing.
 *
 * Formatting only, no data access, so this is safe to import anywhere.
 */

/** Rendered in place of a date that is absent or unparseable. */
const PLACEHOLDER = "—";

/**
 * Formats an ISO datetime as a short date, e.g. "5 Jan 2026".
 *
 * @param iso - ISO 8601 string, or null/undefined.
 * @returns Formatted date, or an em dash.
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return PLACEHOLDER;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return PLACEHOLDER;
  }
}

/**
 * Formats an ISO datetime as a 12-hour clock time, e.g. "10:30 AM".
 *
 * @param iso - ISO 8601 string, or null/undefined.
 * @returns Formatted time, or null so callers can omit the element entirely.
 */
export function formatTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return null;
  }
}

/**
 * Formats an ISO datetime as date + time, e.g. "5 Jan 2026, 10:30 AM".
 *
 * @param iso - ISO 8601 string, or null/undefined.
 * @returns Formatted string, or an em dash.
 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return PLACEHOLDER;
  const time = formatTime(iso);
  const date = formatDate(iso);
  return time && date !== PLACEHOLDER ? `${date}, ${time}` : date;
}

/**
 * Formats a weekday name, e.g. "Monday". Used as the timeline day sub-heading.
 *
 * @param iso - ISO 8601 string, or null/undefined.
 * @returns Weekday name, or an empty string when unavailable.
 */
export function formatWeekday(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, { weekday: "long" });
  } catch {
    return "";
  }
}

/**
 * Naive English pluralisation for count labels.
 *
 * @param count - The count deciding the form.
 * @param singular - Singular noun.
 * @param plural - Optional irregular plural; defaults to `singular + "s"`.
 * @returns The correct form for the count.
 */
export function pluralize(
  count: number,
  singular: string,
  plural?: string,
): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

/**
 * Derives up-to-two-letter initials from a display name, for avatar fallbacks.
 *
 * @param name - Full display name.
 * @returns Uppercase initials, or "?" when the name yields none.
 */
export function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "?";
}
