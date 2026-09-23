"use client";

import { cn } from "@/lib/utils";

export function LastUsedBadge() {
  return (
    <span
      className={cn(
        "absolute -top-2 right-2 z-10 text-xs font-medium px-2 py-0.5 rounded-full",
        "bg-secondary text-secondary-foreground border border-border",
        "shadow-sm",
        "leading-none whitespace-nowrap pointer-events-none",
      )}
    >
      Last used
    </span>
  );
}
