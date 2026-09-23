/**
 * DateScroller — horizontal scrollable date picker for the booking wizard.
 *
 * Layer: client / telemedicine / patient / appointments / book
 *
 * Renders a snap-scroll row of date buttons. Dates not present in
 * `availableDates` (ISO date strings, e.g. "2026-06-15") are shown as
 * disabled/greyed-out with an "Unavail." label.
 *
 * Adapted from drgodly-mvp DateScroll.tsx — changed `enabledDays` (day-of-week
 * Set) to `availableDates` (ISO date string Set) so the picker reflects actual
 * FHIR Slot availability rather than a weekly schedule.
 */

"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Props for the DateScroller component. */
interface DateScrollerProps {
  /** All date options to display (typically the next 30 days). */
  dates: Date[];
  /** Currently selected date, or null. */
  selectedDate: Date | null;
  /** Callback invoked with the selected Date when user clicks an enabled date. */
  onSelect: (d: Date) => void;
  /**
   * Set of ISO date strings (e.g. "2026-06-15") that have free slots.
   * Dates absent from this set are rendered as disabled.
   * If omitted, all dates are enabled.
   */
  availableDates?: Set<string>;
}

/**
 * Horizontal scrollable date picker.
 * Automatically scrolls to the selected date on mount / change.
 *
 * @param dates - Full list of date objects to render.
 * @param selectedDate - Currently selected date.
 * @param onSelect - Called when a user picks an enabled date.
 * @param availableDates - Set of ISO date strings that have FHIR free slots.
 */
export function DateScroller({
  dates,
  selectedDate,
  onSelect,
  availableDates,
}: DateScrollerProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll the track so the selected date is centred
  useEffect(() => {
    if (!trackRef.current || !selectedDate) return;
    const idx = dates.findIndex(
      (d) => d.toDateString() === selectedDate.toDateString(),
    );
    if (idx === -1) return;
    const el = trackRef.current.querySelector<HTMLButtonElement>(
      `[data-date-index="${idx}"]`,
    );
    el?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  }, [selectedDate, dates]);

  /**
   * Scrolls the track horizontally by ~3 card widths in the given direction.
   *
   * @param dir - "left" or "right"
   */
  const scrollBy = (dir: "left" | "right") => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({
      left: (dir === "left" ? -1 : 1) * 112 * 3,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      {/* Scroll arrow buttons (desktop only) */}
      <div className="pointer-events-none absolute inset-y-0 -left-5 -right-5 bottom-4 z-10 hidden sm:flex items-center justify-between">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="pointer-events-auto rounded-full bg-background/70 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/50"
          onClick={() => scrollBy("left")}
          aria-label="Scroll dates left"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="pointer-events-auto rounded-full bg-background/70 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/50"
          onClick={() => scrollBy("right")}
          aria-label="Scroll dates right"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable track */}
      <div
        ref={trackRef}
        className="no-scrollbar overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 -mx-2 px-2"
        role="listbox"
        aria-label="Available dates"
      >
        <div className="flex gap-2">
          {dates.map((date, idx) => {
            const isoDate = date.toISOString().slice(0, 10); // "2026-06-15"
            const isDisabled = availableDates
              ? !availableDates.has(isoDate)
              : false;
            const isSelected =
              !isDisabled &&
              selectedDate?.toDateString() === date.toDateString();
            const isToday = new Date().toDateString() === date.toDateString();

            return (
              <Button
                key={idx}
                role="option"
                aria-selected={isSelected}
                aria-disabled={isDisabled}
                data-date-index={idx}
                type="button"
                disabled={isDisabled}
                variant={isSelected ? "default" : "outline"}
                onClick={() => !isDisabled && onSelect(date)}
                className={`
                  flex-none snap-start
                  min-w-[112px] sm:min-w-[120px] md:min-w-[128px]
                  h-auto rounded-xl border px-3 py-2
                  flex flex-col items-center justify-center gap-1
                  ${isDisabled ? "opacity-40 cursor-not-allowed line-through" : ""}
                `}
              >
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide ${
                    isSelected
                      ? "text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {isToday
                    ? "Today"
                    : date.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span className="text-base sm:text-lg font-medium">
                  {date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                {isDisabled && (
                  <span className="text-[9px] text-muted-foreground">
                    Unavail.
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
