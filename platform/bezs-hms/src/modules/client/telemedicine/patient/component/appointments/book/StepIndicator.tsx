/**
 * StepIndicator — 3-step booking wizard progress bar.
 *
 * Layer: client / telemedicine / patient / appointments / book
 *
 * Renders numbered circles with labels. Active and completed steps are
 * highlighted with the primary colour; future steps use a muted variant.
 */

"use client";

import { ChevronRight } from "lucide-react";

/** Props for the StepIndicator component. */
interface StepIndicatorProps {
  /** The currently active step (1-indexed). */
  currentStep: number;
}

const STEPS = [
  { num: 1, label: "Select Doctor" },
  { num: 2, label: "Choose Time" },
  { num: 3, label: "Confirm" },
] as const;

/**
 * Horizontal step progress indicator for the booking wizard.
 *
 * @param currentStep - Active step number (1, 2, or 3).
 */
export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2 md:gap-4 mb-4 overflow-x-auto pb-2">
      {STEPS.map((step, idx) => (
        <div key={step.num} className="flex items-center whitespace-nowrap">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold mr-2 transition-colors ${
              currentStep >= step.num
                ? "bg-primary text-secondary"
                : "bg-primary/15 text-primary"
            }`}
          >
            {step.num}
          </div>
          <span
            className={`text-sm font-medium ${
              currentStep >= step.num ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {step.label}
          </span>
          {idx < STEPS.length - 1 && (
            <ChevronRight className="w-4 h-4 ml-2 md:ml-4 text-zinc-700" />
          )}
        </div>
      ))}
    </div>
  );
}
