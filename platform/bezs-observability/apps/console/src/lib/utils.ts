// Utility helpers shared across the dashboard — mirrors the IAM's utils.ts.
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// cn merges Tailwind class names, resolving conflicts via tailwind-merge.
// This is the standard shadcn utility that lets components accept className overrides.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// formatDate renders a UTC timestamp as a human-readable local date/time string.
export function formatDate(date: Date | string | number): string {
  return new Date(date).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// formatRelativeTime returns "2m ago", "1h ago" etc. for recent timestamps.
// Used in the live feed to keep the UI compact.
export function formatRelativeTime(date: Date | string | number): string {
  const now = Date.now();
  const ts = new Date(date).getTime();
  const diff = Math.floor((now - ts) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// severityVariant maps an event severity to a shadcn badge variant.
export function severityVariant(
  severity: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (severity) {
    case "critical":
    case "error":
      return "destructive";
    case "warn":
      return "outline";
    default:
      return "secondary";
  }
}
