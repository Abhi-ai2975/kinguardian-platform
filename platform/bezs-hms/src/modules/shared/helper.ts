/**
 * Shared utility helpers used across both client and server modules.
 * Keep this file framework-agnostic — no Next.js, no server-only imports.
 */
import { formatDistanceToNow, differenceInDays, format } from "date-fns";

/**
 * Calculates the elapsed time between two Unix millisecond timestamps.
 *
 * @param startMs - Start time in milliseconds (Date.now() snapshot).
 * @param endMs   - End time in milliseconds (Date.now() snapshot).
 * @returns An object with the raw `durationMs` and a human-readable
 *          `duration` string formatted as "HH:mm:ss.SSS".
 */
export function formatDuration(
  startMs: number,
  endMs: number
): { durationMs: number; duration: string } {
  const durationMs = endMs - startMs;
  const h = Math.floor(durationMs / 3_600_000);
  const m = Math.floor((durationMs % 3_600_000) / 60_000);
  const s = Math.floor((durationMs % 60_000) / 1_000);
  const ms = durationMs % 1_000;
  const duration =
    [h, m, s].map((n) => String(n).padStart(2, "0")).join(":") +
    "." +
    String(ms).padStart(3, "0");
  return { durationMs, duration };
}

/** Capitalises every word in a space-separated string. */
export function capitalizeString(word: string) {
  return word
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function formatSmartDate(date: Date | string | number): string {
  const parsedDate = new Date(date);
  const daysDiff = differenceInDays(new Date(), parsedDate);
  if (daysDiff < 7) {
    return formatDistanceToNow(parsedDate, { addSuffix: true }).replace("about ", "");
  }
  return format(parsedDate, "MMM dd, yyyy");
}

export function getProfileInitials(name?: string): string {
  if (!name) return "";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0][0].toUpperCase();
  return words[0][0].toUpperCase() + words[1][0].toUpperCase();
}
