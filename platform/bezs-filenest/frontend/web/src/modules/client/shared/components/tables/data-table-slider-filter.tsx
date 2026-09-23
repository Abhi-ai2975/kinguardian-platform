/**
 * @file data-table-slider-filter.tsx
 * @description Dual-thumb range slider filter for numeric columns using the
 * "range" variant. Shows a dashed-border trigger button that opens a popover
 * with a Shadcn Slider and matching From/To number inputs. Falls back to
 * faceted min/max values when no static range is provided in column meta.
 * @layer shared/tables
 */

"use client";

import type { Column } from "@tanstack/react-table";
import { PlusCircle, XCircle } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Internal types / helpers
// ---------------------------------------------------------------------------

type RangeValue = [number, number];

function isValidRange(value: unknown): value is RangeValue {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  );
}

function parseRangeValue(value: unknown): RangeValue | undefined {
  if (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every(
      (v) => (typeof v === "number" || typeof v === "string") && !Number.isNaN(Number(v)),
    )
  ) {
    return [Number(value[0]), Number(value[1])];
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataTableSliderFilterProps<TData> {
  column: Column<TData, unknown>;
  title?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Range slider filter that renders a popover with From/To numeric inputs,
 * a dual-thumb Slider, and a Clear button.
 *
 * The slider bounds default to faceted min/max values from TanStack Table's
 * getFacetedMinMaxValues(), but can be overridden via column meta's `range`
 * property.
 *
 * @param column - TanStack column to read/write range filter state.
 * @param title - Trigger button label.
 */
export function DataTableSliderFilter<TData>({
  column,
  title,
}: DataTableSliderFilterProps<TData>) {
  const id = React.useId();

  const columnFilterValue = parseRangeValue(column.getFilterValue());
  const defaultRange = column.columnDef.meta?.range;
  const unit = column.columnDef.meta?.unit;

  const { min, max, step } = React.useMemo<{
    min: number;
    max: number;
    step: number;
  }>(() => {
    let minVal = 0;
    let maxVal = 100;

    if (defaultRange && isValidRange(defaultRange)) {
      [minVal, maxVal] = defaultRange;
    } else {
      const faceted = column.getFacetedMinMaxValues();
      if (
        faceted &&
        typeof faceted[0] === "number" &&
        typeof faceted[1] === "number"
      ) {
        minVal = faceted[0];
        maxVal = faceted[1];
      }
    }

    const range = maxVal - minVal;
    const stepVal =
      range <= 20
        ? 1
        : range <= 100
          ? Math.ceil(range / 20)
          : Math.ceil(range / 50);

    return { min: minVal, max: maxVal, step: stepVal };
  }, [column, defaultRange]);

  const range = React.useMemo<RangeValue>(
    () => columnFilterValue ?? [min, max],
    [columnFilterValue, min, max],
  );

  const fmt = (v: number) =>
    v.toLocaleString(undefined, { maximumFractionDigits: 0 });

  const onFromChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value);
      if (!Number.isNaN(v) && v >= min && v <= range[1]) {
        column.setFilterValue([v, range[1]]);
      }
    },
    [column, min, range],
  );

  const onToChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value);
      if (!Number.isNaN(v) && v <= max && v >= range[0]) {
        column.setFilterValue([range[0], v]);
      }
    },
    [column, max, range],
  );

  const onSliderChange = React.useCallback(
    (value: number[]) => {
      if (Array.isArray(value) && value.length === 2) {
        column.setFilterValue(value as RangeValue);
      }
    },
    [column],
  );

  const onReset = React.useCallback(
    (e: React.MouseEvent) => {
      if (e.target instanceof HTMLDivElement) e.stopPropagation();
      column.setFilterValue(undefined);
    },
    [column],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-dashed font-normal"
        >
          {columnFilterValue ? (
            <div
              role="button"
              aria-label={`Clear ${title} filter`}
              tabIndex={0}
              className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={onReset}
            >
              <XCircle />
            </div>
          ) : (
            <PlusCircle />
          )}
          <span>{title}</span>
          {columnFilterValue && (
            <>
              <Separator
                orientation="vertical"
                className="mx-0.5 data-[orientation=vertical]:h-4"
              />
              <span className="text-xs">
                {fmt(columnFilterValue[0])} – {fmt(columnFilterValue[1])}
                {unit ? ` ${unit}` : ""}
              </span>
            </>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="flex w-auto flex-col gap-4">
        <p className="font-medium leading-none text-sm">{title}</p>

        <div className="flex items-center gap-4">
          <Label htmlFor={`${id}-from`} className="sr-only">
            From
          </Label>
          <div className="relative">
            <Input
              id={`${id}-from`}
              type="number"
              inputMode="numeric"
              placeholder={min.toString()}
              min={min}
              max={max}
              value={range[0].toString()}
              onChange={onFromChange}
              className={cn("h-8 w-24", unit && "pr-8")}
            />
            {unit && (
              <span className="absolute top-0 right-0 bottom-0 flex items-center rounded-r-md bg-accent px-2 text-muted-foreground text-sm">
                {unit}
              </span>
            )}
          </div>

          <Label htmlFor={`${id}-to`} className="sr-only">
            To
          </Label>
          <div className="relative">
            <Input
              id={`${id}-to`}
              type="number"
              inputMode="numeric"
              placeholder={max.toString()}
              min={min}
              max={max}
              value={range[1].toString()}
              onChange={onToChange}
              className={cn("h-8 w-24", unit && "pr-8")}
            />
            {unit && (
              <span className="absolute top-0 right-0 bottom-0 flex items-center rounded-r-md bg-accent px-2 text-muted-foreground text-sm">
                {unit}
              </span>
            )}
          </div>
        </div>

        <Label htmlFor={`${id}-slider`} className="sr-only">
          {title} slider
        </Label>
        <Slider
          id={`${id}-slider`}
          min={min}
          max={max}
          step={step}
          value={range}
          onValueChange={onSliderChange}
        />

        <Button
          aria-label={`Clear ${title} filter`}
          variant="outline"
          size="sm"
          onClick={onReset}
        >
          Clear
        </Button>
      </PopoverContent>
    </Popover>
  );
}
