/**
 * DatePicker.tsx
 *
 * Layer: client / ai-hub / a2ui / catalog
 *
 * A2UI catalog component for date selection built from shadcn Popover + Calendar.
 * Supports three modes:
 *   - "single"   → one date; writes one hidden input (id = component.id)
 *   - "range"    → start + end; writes two hidden inputs ({id}_from, {id}_to)
 *   - "multiple" → arbitrary dates; writes one hidden input as a JSON array
 *
 * All three hidden inputs are picked up by collectFormData's DOM traversal
 * (querySelectorAll "input") so no special form wiring is needed.
 *
 * fromDate / toDate (both support context path references) constrain both
 * navigation and day selection so the calendar stays within bounds, e.g.
 * a schedule's planningHorizon. weekStartsOn, captionLayout, numberOfMonths,
 * outputFormat, displayFormat and classNames are all fully configurable at
 * the UI schema JSON level.
 */

"use client";

import { useState, useMemo } from "react";
import { format, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange, Matcher } from "react-day-picker";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { DatePickerNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Props shape shared by all A2UI catalog components. */
interface DatePickerProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: DatePickerNode;
  weight?: string | number;
}

/**
 * Parse a raw string value into a Date, returning undefined for invalid input.
 * Accepts ISO strings, YYYY-MM-DD, or any value that Date() can parse.
 */
function parseDate(raw: unknown): Date | undefined {
  if (!raw || typeof raw !== "string") return undefined;
  const d = new Date(raw);
  return isValid(d) ? d : undefined;
}

/**
 * DatePicker — Popover-wrapped Calendar component for A2UI.
 *
 * @param processor - Shared message processor for context resolution and dispatch.
 * @param surfaceId - Identifies the current rendering surface.
 * @param component - The DatePickerNode from the UI schema JSON.
 * @param weight    - Flex weight for Row/Column siblings.
 */
export function DatePicker({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: DatePickerProps) {
  const { resolvePrimitive } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );

  const p = component.properties;

  // ── Resolved scalar config ────────────────────────────────────────────────
  const mode = p.mode ?? "single";
  const outputFmt = p.outputFormat ?? "yyyy-MM-dd";
  const displayFmt = p.displayFormat ?? "PPP";
  const showOutsideDays = p.showOutsideDays !== false;
  const weekStartsOn = (p.weekStartsOn ?? 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const captionLayout = p.captionLayout ?? "label";
  const numberOfMonths = p.numberOfMonths ?? (mode === "range" ? 2 : 1);
  const isFieldDisabled = Boolean(resolvePrimitive(p.disabled));

  // ── Resolved StringValue fields ───────────────────────────────────────────
  const label = useMemo(
    () => resolvePrimitive(p.label),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.label],
  );
  const placeholder = useMemo(
    () => resolvePrimitive(p.placeholder) ?? "Pick a date",
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.placeholder],
  );
  const rawValue = useMemo(
    () => resolvePrimitive(p.value),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.value],
  );
  const rawValueTo = useMemo(
    () => resolvePrimitive(p.valueTo),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.valueTo],
  );
  const rawFromDate = useMemo(
    () => resolvePrimitive(p.fromDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.fromDate],
  );
  const rawToDate = useMemo(
    () => resolvePrimitive(p.toDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.toDate],
  );

  // ── Date constraint objects ───────────────────────────────────────────────
  const fromDate = useMemo(() => parseDate(rawFromDate), [rawFromDate]);
  const toDate = useMemo(() => parseDate(rawToDate), [rawToDate]);

  /**
   * DayPicker disabled matchers — days outside [fromDate, toDate] are greyed
   * and unclickable. Navigation is clamped separately via startMonth / endMonth.
   */
  const disabledMatchers = useMemo<Matcher[]>(() => {
    const matchers: Matcher[] = [];
    if (fromDate) matchers.push({ before: fromDate });
    if (toDate) matchers.push({ after: toDate });
    return matchers;
  }, [fromDate, toDate]);

  // ── Selection state ───────────────────────────────────────────────────────
  const [singleDate, setSingleDate] = useState<Date | undefined>(
    () => parseDate(rawValue),
  );
  const [range, setRange] = useState<DateRange | undefined>(() => {
    const from = parseDate(rawValue);
    const to = parseDate(rawValueTo);
    return from || to ? { from, to } : undefined;
  });
  const [multiple, setMultiple] = useState<Date[]>(() => {
    if (!rawValue) return [];
    try {
      return (JSON.parse(rawValue) as string[])
        .map(parseDate)
        .filter((d): d is Date => d !== undefined);
    } catch {
      return [];
    }
  });

  const [open, setOpen] = useState(false);
  const classNames = p.classNames;

  // ── Trigger button label ──────────────────────────────────────────────────
  const triggerLabel = useMemo(() => {
    if (mode === "single") {
      return singleDate ? format(singleDate, displayFmt) : placeholder;
    }
    if (mode === "range") {
      if (range?.from && range?.to) {
        return `${format(range.from, displayFmt)} – ${format(range.to, displayFmt)}`;
      }
      if (range?.from) return format(range.from, displayFmt);
      return placeholder;
    }
    if (mode === "multiple") {
      return multiple.length > 0
        ? `${multiple.length} date${multiple.length !== 1 ? "s" : ""} selected`
        : placeholder;
    }
    return placeholder;
  }, [mode, singleDate, range, multiple, displayFmt, placeholder]);

  // ── Hidden input values (what collectFormData reads) ──────────────────────
  const hiddenSingle = singleDate ? format(singleDate, outputFmt) : "";
  const hiddenFrom = range?.from ? format(range.from, outputFmt) : "";
  const hiddenTo = range?.to ? format(range.to, outputFmt) : "";
  const hiddenMultiple =
    multiple.length > 0
      ? JSON.stringify(multiple.map((d) => format(d, outputFmt)))
      : "";

  // Whether the trigger shows its placeholder (for empty styling)
  const isEmpty =
    mode === "single"
      ? !singleDate
      : mode === "range"
        ? !range?.from
        : multiple.length === 0;

  return (
    <div
      className={cn("space-y-2", classNames?.root)}
      style={{ flex: weight }}
    >
      {/* Label */}
      {label && (
        <Label className={classNames?.label}>
          {label}
          {p.required && (
            <span className="ml-1 text-destructive" aria-hidden>
              *
            </span>
          )}
        </Label>
      )}

      {/* Popover trigger + calendar */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={isFieldDisabled}
            data-empty={isEmpty}
            className={cn(
              "w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground",
              classNames?.trigger,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span>{triggerLabel}</span>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className={cn("w-auto p-0", classNames?.content)}
          align="start"
        >
          {/* ── Single mode ── */}
          {mode === "single" && (
            <Calendar
              mode="single"
              selected={singleDate}
              onSelect={(d) => {
                setSingleDate(d);
                /* Close immediately after a single date is chosen */
                setOpen(false);
              }}
              disabled={disabledMatchers}
              startMonth={fromDate}
              endMonth={toDate}
              captionLayout={captionLayout}
              numberOfMonths={numberOfMonths}
              showOutsideDays={showOutsideDays}
              weekStartsOn={weekStartsOn}
              className={classNames?.calendar}
            />
          )}

          {/* ── Range mode ── */}
          {mode === "range" && (
            <Calendar
              mode="range"
              selected={range}
              onSelect={(r) => {
                setRange(r);
                /* Close only when both ends of the range are selected */
                if (r?.from && r?.to) setOpen(false);
              }}
              disabled={disabledMatchers}
              startMonth={fromDate}
              endMonth={toDate}
              captionLayout={captionLayout}
              numberOfMonths={numberOfMonths}
              showOutsideDays={showOutsideDays}
              weekStartsOn={weekStartsOn}
              className={classNames?.calendar}
            />
          )}

          {/* ── Multiple mode ── */}
          {mode === "multiple" && (
            <Calendar
              mode="multiple"
              selected={multiple}
              onSelect={(dates) => setMultiple(dates ?? [])}
              disabled={disabledMatchers}
              startMonth={fromDate}
              endMonth={toDate}
              captionLayout={captionLayout}
              numberOfMonths={numberOfMonths}
              showOutsideDays={showOutsideDays}
              weekStartsOn={weekStartsOn}
              className={classNames?.calendar}
            />
          )}
        </PopoverContent>
      </Popover>

      {/*
        Hidden inputs consumed by collectFormData (form.tsx querySelectorAll "input").

        single   → one input,  id = component.id,          value = "yyyy-MM-dd"
        range    → two inputs, id = {id}_from / {id}_to,   value = "yyyy-MM-dd"
        multiple → one input,  id = component.id,          value = JSON array string
                   data-json="true" tells collectFormData to JSON.parse the value.
      */}
      {mode === "single" && (
        <input
          type="hidden"
          id={component.id}
          name={component.id}
          value={hiddenSingle}
          readOnly
        />
      )}
      {mode === "range" && (
        <>
          <input
            type="hidden"
            id={`${component.id}_from`}
            name={`${component.id}_from`}
            value={hiddenFrom}
            readOnly
          />
          <input
            type="hidden"
            id={`${component.id}_to`}
            name={`${component.id}_to`}
            value={hiddenTo}
            readOnly
          />
        </>
      )}
      {mode === "multiple" && (
        <input
          type="hidden"
          id={component.id}
          name={component.id}
          value={hiddenMultiple}
          data-json="true"
          readOnly
        />
      )}
    </div>
  );
}
