/**
 * DateTimePicker — shadcn Popover + Calendar date picker paired with a time
 * input, exchanging **absolute ISO-8601 instants** with the form layer.
 *
 * Layer: client / shared / components
 *
 * ## Why this exists rather than <input type="datetime-local">
 *
 * A native datetime-local input emits a *naive* wall-clock string with no
 * timezone — "2026-08-15T14:30". Sent to the backend, nothing in that string
 * says which instant it means, so whichever process parses it decides using its
 * own timezone. That works by accident in local development (browser and server
 * share a clock, so the write and read conversions cancel out) and breaks in
 * production, where the container runs UTC and every saved time comes back
 * shifted by the user's UTC offset.
 *
 * This component pins the value instead:
 *   - **Out** (`onChange`) — the picked wall-clock time is resolved against the
 *     *browser's* timezone and emitted as an absolute instant via toISOString(),
 *     e.g. "2026-08-15T09:00:00.000Z". No server can reinterpret it.
 *   - **In** (`value`) — an absolute instant is rendered back in the browser's
 *     local timezone, so the doctor sees the wall-clock time they chose.
 *
 * Legacy naive values already stored in the database still parse (JS treats a
 * bare "yyyy-MM-ddTHH:mm" as local time), so existing records keep rendering as
 * before — but note they were written under the old behaviour and may be
 * off by the server's offset. Only re-saving corrects them.
 *
 * `minDate`/`maxDate` bound both calendar navigation and day selection, for
 * fields constrained to a range (e.g. Slot generation windows, which must fall
 * inside their Schedule's planning horizon — a native input cannot grey out
 * days on its own).
 */

"use client";

import { useMemo, useState } from "react";
import { format, isValid } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import type { Matcher } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DateTimePickerProps {
  /**
   * Current value as an absolute ISO-8601 instant (e.g. "2026-08-15T09:00:00.000Z"),
   * or empty/undefined for none. Legacy naive "yyyy-MM-ddTHH:mm" values are also
   * accepted and interpreted as browser-local time.
   */
  value?: string;
  /** Called with a new absolute ISO instant, or undefined when cleared. */
  onChange: (value: string | undefined) => void;
  /** Earliest selectable day. Days before this are greyed out and unclickable. */
  minDate?: Date;
  /** Latest selectable day. Days after this are greyed out and unclickable. */
  maxDate?: Date;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Splits a stored value into its calendar day and local "HH:mm" time parts.
 *
 * @param raw - Absolute ISO instant, or a legacy naive datetime string.
 * @returns The Date and its local time string; both empty when unparseable.
 */
function parseValue(raw?: string): { date: Date | undefined; time: string } {
  if (!raw) return { date: undefined, time: "" };
  /* new Date() resolves an offset-bearing instant absolutely, and a bare
     "yyyy-MM-ddTHH:mm" as local — which is what we want for legacy values. */
  const d = new Date(raw);
  if (!isValid(d)) return { date: undefined, time: "" };
  return { date: d, time: format(d, "HH:mm") };
}

/**
 * Resolves a picked calendar day + "HH:mm" against the browser's timezone and
 * returns the corresponding absolute instant.
 *
 * @param date - The selected calendar day.
 * @param time - Local wall-clock time as "HH:mm".
 * @returns ISO-8601 instant string in UTC.
 */
function combine(date: Date, time: string): string {
  const [hours, minutes] = (time || "00:00").split(":").map(Number);
  const combined = new Date(date);
  /* setHours applies in the browser's local timezone, so toISOString() converts
     the user's wall-clock choice into the correct absolute instant. */
  combined.setHours(hours || 0, minutes || 0, 0, 0);
  return combined.toISOString();
}

/**
 * Date + time picker exchanging absolute ISO instants, with optional min/max
 * day constraints.
 *
 * @param props - See DateTimePickerProps.
 */
export function DateTimePicker({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = "Pick date & time",
  disabled = false,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const { date, time } = useMemo(() => parseValue(value), [value]);

  const disabledMatchers = useMemo<Matcher[]>(() => {
    const matchers: Matcher[] = [];
    if (minDate) matchers.push({ before: minDate });
    if (maxDate) matchers.push({ after: maxDate });
    return matchers;
  }, [minDate, maxDate]);

  /** Applies a newly selected calendar day, keeping the current time-of-day. */
  function handleDateSelect(day: Date | undefined) {
    if (!day) return;
    onChange(combine(day, time));
  }

  /** Applies a new time-of-day to the selected (or today's) date. */
  function handleTimeChange(newTime: string) {
    onChange(combine(date ?? new Date(), newTime));
  }

  /** Clears the field — the native input had a built-in clear, this replaces it. */
  function handleClear(ev: React.MouseEvent) {
    /* Stop the click reaching the trigger, which would reopen the popover. */
    ev.stopPropagation();
    ev.preventDefault();
    onChange(undefined);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">
            {date ? format(date, "PPP") + (time ? ` ${time}` : "") : placeholder}
          </span>

          {/* Clear affordance — only meaningful once a value is set */}
          {date && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear date and time"
              onClick={handleClear}
              className="ml-auto shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          disabled={disabledMatchers}
          startMonth={minDate}
          endMonth={maxDate}
          captionLayout="dropdown"
          autoFocus
        />
        <div className="border-t p-3">
          <Input
            type="time"
            value={time}
            onChange={(ev) => handleTimeChange(ev.target.value)}
            disabled={!date}
            aria-label="Time"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
