/**
 * StepIndicator — visual progress indicator for the onboarding wizard.
 * Reads the current pathname and highlights the matching step.
 * @module
 */

"use client";

import { usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { path: "/onboarding/create-org", label: "Create org" },
  { path: "/onboarding/create-project", label: "First project" },
  { path: "/onboarding/get-api-key", label: "API key" },
  { path: "/onboarding/install-sdk", label: "Install SDK" },
];

export function StepIndicator() {
  const pathname = usePathname();
  const currentIndex = STEPS.findIndex((s) => pathname.includes(s.path));

  return (
    <nav aria-label="Onboarding steps" className="flex items-center justify-center">
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;

        return (
          <div key={step.path} className="flex items-center">
            {i > 0 && (
              <div
                className={cn(
                  "h-px w-12 transition-colors",
                  done ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  done && "bg-primary text-primary-foreground",
                  active && "border-2 border-primary text-primary bg-primary/5",
                  !done && !active && "border border-muted-foreground/30 text-muted-foreground",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "hidden text-xs sm:block",
                  active && "font-medium text-foreground",
                  !active && "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
