"use client";

// DateRangePicker — preset time range selector wired to URL state via nuqs.
// Shared by the overview page and all explorer pages (logs, audit, traces, metrics).
// Selecting a preset updates the `range` query param which server and client
// components read to scope their ClickHouse queries.
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarClock, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TIME_RANGE_PRESETS,
  DEFAULT_RANGE,
  type TimeRangeKey,
} from "@/lib/time-range";

const PRESET_KEYS = Object.keys(TIME_RANGE_PRESETS) as TimeRangeKey[];

export function DateRangePicker() {
  const [range, setRange] = useQueryState(
    "range",
    parseAsStringLiteral(PRESET_KEYS).withDefault(DEFAULT_RANGE).withOptions({ shallow: false }),
  );

  const label = TIME_RANGE_PRESETS[range]?.label ?? TIME_RANGE_PRESETS[DEFAULT_RANGE].label;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 font-normal">
          <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
          {label}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        <div className="flex flex-col gap-0.5">
          {PRESET_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={cn(
                "w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                range === key && "bg-accent font-medium",
              )}
            >
              {TIME_RANGE_PRESETS[key].label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
