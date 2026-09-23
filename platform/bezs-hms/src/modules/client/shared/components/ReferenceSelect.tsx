/**
 * ReferenceSelect — shared, resource-agnostic FHIR reference combobox.
 *
 * Layer: client / shared / components
 *
 * A controlled combobox for picking a single target record (Organization,
 * Location, HealthcareService, PractitionerRole, Schedule, …) to compose a
 * FHIR reference string from (e.g. "Location/190001"). Works as a drop-in
 * React Hook Form <Controller> render prop.
 *
 * Mirrors TerminologySelect's UI shell (Popover + Command, debounced query,
 * loading/empty states) for visual and interaction consistency, but stays
 * fully decoupled from any specific resource — callers supply a
 * `fetchOptions` function instead of a hardcoded resource/field pair, so this
 * component never needs to import resource-specific server actions. Each
 * resource's own search fetcher (server-side name search where the backend
 * supports it, fetch-all + client-side filter otherwise) lives beside that
 * resource's other query helpers, e.g. `searchLocationOptions` in
 * `telemedicine/admin/queries/location.queries.ts`.
 *
 * Unlike TerminologySelect's plain-code value, the selected option's label is
 * always known up front (it travels with `value`) — no lookup against a
 * loaded list is needed to render the trigger, so the composed reference
 * string and its display label stay in sync purely through the caller's
 * onChange handler (which typically writes both a reference field and a
 * separate, still-hand-editable display field — see call sites).
 *
 * @example
 * <Controller
 *   control={form.control}
 *   name="part_of"
 *   render={({ field }) => (
 *     <ReferenceSelect
 *       fetchOptions={(q) => searchLocationOptions(q, orgId, editingLocationId)}
 *       queryKey={["locations", "picker", orgId]}
 *       value={field.value ? { id: Number(field.value.split("/")[1]), label: form.getValues("part_of_display") ?? "" } : null}
 *       onChange={(opt) => {
 *         form.setValue("part_of", opt ? `Location/${opt.id}` : "");
 *         form.setValue("part_of_display", opt?.label ?? "");
 *       }}
 *       placeholder="Search locations…"
 *     />
 *   )}
 * />
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronsUpDown, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandInput,
  CommandList,
} from "@/components/ui/command";

// ── Public types ───────────────────────────────────────────────────────────────

/**
 * A single pickable record — an id plus a human-readable label. `id` is
 * usually the fhir-gql numeric primary key, but string ids are supported too
 * (e.g. Better Auth user ids, which aren't FHIR references at all).
 */
export interface TReferenceOption {
  id: number | string;
  label: string;
}

export interface ReferenceSelectProps {
  /**
   * Async search function, called with the debounced query string (empty
   * string on first open for fetchers that pre-load a bounded list).
   */
  fetchOptions: (query: string) => Promise<TReferenceOption[]>;
  /**
   * TanStack Query key prefix — the debounced query string is appended
   * automatically. Include every value the fetch depends on (e.g. orgId) so
   * different pickers never share a stale cache entry.
   */
  queryKey: unknown[];
  /** Currently selected option, or null when nothing is selected. */
  value: TReferenceOption | null;
  /** Called with the newly selected option, or null on clear. */
  onChange: (option: TReferenceOption | null) => void;
  /** Minimum characters before a search fires. Default: 0 (fires immediately). */
  minChars?: number;
  /** Debounce delay in ms. Default: 300. */
  debounceMs?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Shared reference-picker combobox for React Hook Form fields.
 *
 * @param props - See ReferenceSelectProps for full documentation.
 */
export function ReferenceSelect({
  fetchOptions,
  queryKey,
  value,
  onChange,
  minChars = 0,
  debounceMs = 300,
  placeholder = "Search…",
  disabled = false,
  className,
}: ReferenceSelectProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = useState<number | undefined>();

  // ── Debounce input → debouncedQ ──────────────────────────────────────────────

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(inputValue), debounceMs);
    return () => clearTimeout(id);
  }, [inputValue, debounceMs]);

  // ── Sync trigger width for popover ───────────────────────────────────────────

  useEffect(() => {
    if (open && triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
  }, [open]);

  // ── Options query ──────────────────────────────────────────────────────────

  const optionsQuery = useQuery({
    queryKey: [...queryKey, debouncedQ],
    queryFn: () => fetchOptions(debouncedQ),
    staleTime: 30_000,
    enabled: debouncedQ.length >= minChars,
  });

  const options = optionsQuery.data ?? [];
  const isLoading = optionsQuery.isFetching;

  // ── Handlers ──────────────────────────────────────────────────────────────────

  /** Emit the selected option and close the popover. */
  function handleSelect(option: TReferenceOption) {
    onChange(option);
    setOpen(false);
    setInputValue("");
    setDebouncedQ("");
  }

  /** Clear the current selection. */
  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
  }

  // ── Empty state message ───────────────────────────────────────────────────────

  const emptyMessage = isLoading
    ? "Loading…"
    : inputValue.length < minChars
      ? `Type at least ${minChars} character${minChars !== 1 ? "s" : ""} to search`
      : "No results found.";

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal h-9",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{value?.label ?? placeholder}</span>
          <span className="flex items-center gap-1 ml-2 shrink-0">
            {/* Clear button — only shown when a value is selected */}
            {value && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear selection"
                onClick={handleClear}
                onKeyDown={(e) => e.key === "Enter" && handleClear(e as unknown as React.MouseEvent)}
                className="rounded-sm opacity-60 hover:opacity-100 hover:bg-accent p-0.5"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin opacity-50" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            )}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="p-0"
        align="start"
        style={{ width: triggerWidth ?? "100%" }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={String(option.id)}
                  onSelect={() => handleSelect(option)}
                  className="flex items-start gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{option.label}</div>
                    <div className="text-xs text-muted-foreground/70 font-mono">#{option.id}</div>
                  </div>
                  <Check
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      value?.id === option.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
