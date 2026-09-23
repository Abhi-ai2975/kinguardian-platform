"use client";

import { useState, useMemo } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { SlotPickerNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { Label } from "@/components/ui/label";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ── helpers ───────────────────────────────────────────────────────────────────

function resolvePath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null) return undefined;
    if (Array.isArray(acc)) {
      const idx = parseInt(key, 10);
      return isNaN(idx) ? undefined : acc[idx];
    }
    if (typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

/** Returns "YYYY-MM-DD" from an ISO datetime string, using local time. */
function toDateKey(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** HH:MM in 24-hour format, matching the design. */
function toHHMM(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function todayKey(): string {
  return toDateKey(new Date().toISOString());
}

const DATES_PER_PAGE = 5;

// ── component ─────────────────────────────────────────────────────────────────

interface SlotPickerProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: SlotPickerNode;
  weight?: string | number;
}

export function SlotPicker({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: SlotPickerProps) {
  const { resolvePrimitive } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );

  const label = resolvePrimitive(component.properties.label) as
    | string
    | undefined;
  const emits = component.properties.emits ?? [];
  const rawItems = component.properties.items;
  const items: Record<string, unknown>[] = Array.isArray(rawItems)
    ? rawItems
    : [];

  // Group and sort slot items by calendar date.
  const dateGroups = useMemo<[string, Record<string, unknown>[]][]>(() => {
    const map = new Map<string, Record<string, unknown>[]>();
    for (const item of items) {
      const start = item.start as string | undefined;
      if (!start) continue;
      const key = toDateKey(start);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const [dateOffset, setDateOffset] = useState(0);
  // null = use first date (avoids useEffect for initialisation)
  const [activeDateKey, setActiveDateKey] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Record<string, unknown> | null>(null);

  const effectiveDateKey = activeDateKey ?? dateGroups[0]?.[0] ?? null;
  const today = todayKey();

  const canScrollLeft = dateOffset > 0;
  const canScrollRight = dateOffset + DATES_PER_PAGE < dateGroups.length;
  const visibleDates = dateGroups.slice(dateOffset, dateOffset + DATES_PER_PAGE);

  const slotsForDate =
    effectiveDateKey != null
      ? (dateGroups.find(([k]) => k === effectiveDateKey)?.[1] ?? [])
      : [];

  const fieldId = component.id;

  function selectDate(key: string) {
    setActiveDateKey(key);
    setSelectedSlot(null);
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4" style={{ flex: weight }}>
      {label && <Label className="text-base font-semibold">{label}</Label>}

      {/* ── Available Dates header ───────────────────────────────────────── */}
      <p className="text-sm font-medium text-muted-foreground">
        Available Dates
        {effectiveDateKey && (
          <span className="ml-1">
            (
            {new Date(effectiveDateKey + "T12:00:00").toLocaleDateString([], {
              weekday: "short",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            )
          </span>
        )}
      </p>

      {/* ── Date carousel ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canScrollLeft}
          onClick={() => setDateOffset((p) => Math.max(0, p - 1))}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border transition-colors",
            canScrollLeft
              ? "hover:bg-accent cursor-pointer"
              : "opacity-30 cursor-default",
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex flex-1 gap-2">
          {visibleDates.map(([key]) => {
            // Use noon local time to avoid DST midnight edge cases
            const d = new Date(key + "T12:00:00");
            const isToday = key === today;
            const isActive = key === effectiveDateKey;

            return (
              <button
                key={key}
                type="button"
                onClick={() => selectDate(key)}
                className={cn(
                  "flex flex-1 flex-col items-center rounded-lg border px-2 py-3 text-center transition-colors",
                  isActive
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background hover:bg-accent text-foreground",
                )}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  {isToday
                    ? "TODAY"
                    : d.toLocaleDateString([], { weekday: "short" }).toUpperCase()}
                </span>
                <span className="mt-1 text-base font-bold leading-none">
                  {d.toLocaleDateString([], { month: "short", day: "numeric" })}
                </span>
              </button>
            );
          })}

          {/* Pad with empty placeholders so layout doesn't collapse */}
          {visibleDates.length < DATES_PER_PAGE &&
            Array.from({ length: DATES_PER_PAGE - visibleDates.length }).map(
              (_, i) => <div key={`pad-${i}`} className="flex-1" />,
            )}
        </div>

        <button
          type="button"
          disabled={!canScrollRight}
          onClick={() => setDateOffset((p) => p + 1)}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border transition-colors",
            canScrollRight
              ? "hover:bg-accent cursor-pointer"
              : "opacity-30 cursor-default",
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* ── Available Times ───────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Available Times</p>

        {slotsForDate.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No available slots for this date.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {slotsForDate.map((slot, i) => {
              const isSelected = selectedSlot === slot;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-accent",
                  )}
                >
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  {toHHMM(slot.start as string)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Hidden inputs collected by form.tsx ──────────────────────────── */}
      {emits.map((emit) => (
        <input
          key={emit.key}
          id={`${fieldId}_${emit.key}`}
          type="hidden"
          value={
            selectedSlot
              ? String(resolvePath(selectedSlot, emit.path) ?? "")
              : ""
          }
        />
      ))}
    </div>
  );
}
