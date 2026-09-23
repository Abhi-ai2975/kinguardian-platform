import moment from "moment-timezone";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";

export function capitalizeString(word: string) {
  return word
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function formatDuration(start: number, end: number) {
  const durationMs = end - start;
  const duration = moment.utc(durationMs).format("HH:mm:ss.SSS"); // e.g. "00:00:01.253"
  return { durationMs, duration };
}

export function formatNumber(amount: number) {
  return amount?.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });
}

/**
 * Convert a value in MB to GB if it reaches or exceeds 1 GB (1024 MB)
 * @param mb - Value in megabytes
 * @returns A string like "512 MB" or "1.23 GB"
 */
export function formatStorage(mb: number): string {
  if (mb >= 1024) {
    const gb = mb / 1024;
    // Limit to 2 decimal places and remove trailing zeros
    return `${parseFloat(gb.toFixed(2))} GB`;
  }
  return `${mb} MB`;
}

/**
 * Format a date in a human-friendly way.
 * - < 1 week → "x minutes ago", "1 day ago", etc.
 * - >= 1 week → formatted like "Dec 13, 2025"
 */
export function formatSmartDate(date: Date | string | number): string {
  const parsedDate = new Date(date);
  const daysDiff = differenceInDays(new Date(), parsedDate);

  if (daysDiff < 7) {
    const relative = formatDistanceToNow(parsedDate, { addSuffix: true });
    return relative.replace("about ", ""); // optional: cleaner output
  }

  return format(parsedDate, "MMM dd, yyyy");
}

export function bytesToSize(bytes: number | bigint, decimals = 2) {
  if (Number(bytes) === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(Number(bytes)) / Math.log(k));

  return `${parseFloat((Number(bytes) / Math.pow(k, i)).toFixed(dm))} ${
    sizes[i]
  }`;
}

export function getProfileInitials(name?: string): string {
  if (!name) return "";

  const words = name
    .trim()
    .split(/\s+/) // handles multiple spaces
    .filter(Boolean);

  if (words.length === 0) return "";

  if (words.length === 1) {
    return words[0][0].toUpperCase();
  }

  return words[0][0].toUpperCase() + words[1][0].toUpperCase();
}
