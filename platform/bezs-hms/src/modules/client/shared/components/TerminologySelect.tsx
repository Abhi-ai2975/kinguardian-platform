/**
 * TerminologySelect — shared FHIR terminology-backed combobox.
 *
 * Layer: client / shared / components
 *
 * A controlled combobox that sources its options from the FHIR terminology
 * server. Works as a drop-in React Hook Form <Controller> render prop.
 *
 * ── Always searches the server ───────────────────────────────────────────────
 *
 * Every query — including the very first page shown when the popover opens —
 * goes to the server via `useInfiniteQuery`, paginated `limit` (default 50)
 * concepts at a time. As the user types, the query is debounced and re-run
 * from offset 0; as the user scrolls near the bottom of the list, the next
 * page is fetched and appended. This mirrors the A2UI reference widget
 * (`ai-hub/a2ui/catalog/terminology-select.tsx`) and its backend route
 * (`/api/workflow/terminology`), which both already prove `q`+`limit`+
 * `offset` work together against the FHIR terminology server and that the
 * response's `total` is reliable for computing "has more".
 *
 * Earlier version's bug: "client mode" loaded up to `limit` concepts ONCE
 * with no query, then filtered only that fixed batch as the user typed — a
 * value set larger than `limit` meant search could never find anything past
 * the first page. There is no such mode anymore; search always hits every
 * record, not just what's already been loaded.
 *
 * `serverSearch` is kept as a prop for backward compatibility with existing
 * call sites but is now a no-op — every mode already searches the server.
 *
 * ── Value types ───────────────────────────────────────────────────────────────
 *
 *  "code" (default):
 *    onChange emits a plain string code, e.g. "male".
 *    Suitable for simple enum fields stored as a scalar on the FHIR resource.
 *
 *  "codeable_concept":
 *    onChange emits { code, system, display, text }.
 *    Suitable for CodeableConcept fields (Condition.code, Observation.code…)
 *    where the system URL and display term must be persisted alongside the code.
 *
 * @example
 * // Simple enum — gender on patient profile
 * <TerminologySelect resource="Patient" field="gender"
 *   value={field.value} onChange={field.onChange} />
 *
 * @example
 * // Large open terminology — SNOMED diagnosis with system-scoped search
 * <TerminologySelect
 *   resource="Condition" field="code"
 *   valueType="codeable_concept"
 *   searchSystem={TERMINOLOGY_SYSTEMS.SNOMED_CT}
 *   value={field.value} onChange={field.onChange} />
 */

"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
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
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import {
  getConceptsForFieldAction,
  searchTerminologyAction,
} from "@/modules/server/presentation/actions/terminology/terminology.actions";
import type {
  TConceptResponse,
  TTerminologySystem,
} from "@/modules/entities/schemas/terminology/terminology.schema";

// ── Public types ───────────────────────────────────────────────────────────────

/**
 * Structured value emitted when `valueType="codeable_concept"`.
 * Maps directly to FHIR CodeableConcept.coding[0].
 */
export interface TCodeableConcept {
  /** Code from the system, e.g. "73211009". */
  code: string;
  /** Canonical system URL, e.g. "http://snomed.info/sct". */
  system: string;
  /** Human-readable display term. */
  display: string;
  /** Free-text representation (defaults to display). */
  text?: string;
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface TerminologySelectProps {
  // ── Value set identification ─────────────────────────────────────────────────
  /** FHIR resource type, e.g. "Patient", "Condition". */
  resource: string;
  /** FHIR field name, e.g. "gender", "clinicalStatus". */
  field: string;

  // ── Pagination ────────────────────────────────────────────────────────────────
  /** Concepts fetched per page (initial load and every subsequent scroll-triggered page). Default: 50. */
  limit?: number;

  // ── Search scoping ────────────────────────────────────────────────────────────
  /**
   * Canonical code system URL to scope the search (e.g. TERMINOLOGY_SYSTEMS.SNOMED_CT).
   * When set, searches within that system instead of the field's bound value set.
   */
  searchSystem?: string | TTerminologySystem;
  /**
   * Minimum characters before a search fires. Default: 2 when `searchSystem`
   * is set (browsing an entire open terminology with no query isn't useful);
   * 0 otherwise (shows the field's value set immediately on open).
   */
  minChars?: number;
  /** Debounce delay in ms for search input. Default: 300. */
  debounceMs?: number;
  /**
   * @deprecated No longer has any effect — every mode already searches the
   * server. Kept so existing call sites don't need to be updated.
   */
  serverSearch?: boolean;

  // ── Value ────────────────────────────────────────────────────────────────────
  /**
   * "code" (default): onChange emits a plain string code.
   * "codeable_concept": onChange emits { code, system, display, text }.
   */
  valueType?: "code" | "codeable_concept";
  /** Current controlled value. */
  value?: string | TCodeableConcept | null;
  /** Called with the new value when the user selects a concept, or null on clear. */
  onChange?: (value: string | TCodeableConcept | null) => void;

  // ── UI ───────────────────────────────────────────────────────────────────────
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// ── Query key helpers ──────────────────────────────────────────────────────────

const FIELD_KEY = (resource: string, field: string, q: string, limit: number) =>
  ["terminology", "conceptsForField", resource, field, q, limit] as const;

const SYSTEM_KEY = (system: string | undefined, q: string, limit: number) =>
  ["terminology", "search", system, q, limit] as const;

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Shared FHIR terminology combobox for React Hook Form fields.
 *
 * @param props - See TerminologySelectProps for full documentation.
 */
export function TerminologySelect({
  resource,
  field,
  limit = 50,
  searchSystem,
  minChars,
  debounceMs = 300,
  valueType = "code",
  value,
  onChange,
  placeholder = "Select…",
  disabled = false,
  className,
}: TerminologySelectProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = useState<number | undefined>();

  const isSystemMode = !!searchSystem;
  const effectiveMinChars = minChars ?? (isSystemMode ? 2 : 0);

  // ── Debounce input → debouncedQ ──────────────────────────────────────────────

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(inputValue), debounceMs);
    return () => clearTimeout(id);
  }, [inputValue, debounceMs]);

  // ── Reset the search box when the popover closes ─────────────────────────────

  useEffect(() => {
    if (!open) {
      setInputValue("");
      setDebouncedQ("");
    }
  }, [open]);

  // ── Sync trigger width for popover ───────────────────────────────────────────

  useEffect(() => {
    if (open && triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
  }, [open]);

  // ── Infinite query — always server-driven, paginated ─────────────────────────

  const query = useInfiniteQuery({
    queryKey: isSystemMode
      ? SYSTEM_KEY(searchSystem as string, debouncedQ, limit)
      : FIELD_KEY(resource, field, debouncedQ, limit),
    queryFn: async ({ pageParam }) => {
      if (isSystemMode) {
        const [data, err] = await searchTerminologyAction({
          payload: {
            q: debouncedQ,
            system: searchSystem as TTerminologySystem,
            limit,
            offset: pageParam,
          },
        });
        if (err) throw new Error(err.message ?? "Failed to search terminology");
        // SearchResponseSchema's array field is `data`, not `concepts` — different
        // shape from ConceptsForFieldResponseSchema's `concepts`.
        return { concepts: data!.data, total: data!.total };
      }

      const [data, err] = await getConceptsForFieldAction({
        payload: { resource, field, q: debouncedQ || undefined, limit, offset: pageParam },
      });
      if (err) throw new Error(err.message ?? "Failed to load concepts");
      return { concepts: data!.concepts, total: data!.total };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.concepts.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    enabled: open && debouncedQ.length >= effectiveMinChars,
    staleTime: 30_000,
  });

  const allConcepts: TConceptResponse[] = useMemo(
    () => query.data?.pages.flatMap((p) => p.concepts) ?? [],
    [query.data],
  );

  const isSearching = query.isFetching && !query.isFetchingNextPage;
  const isFetchingMore = query.isFetchingNextPage;

  // ── Selected concept display label ────────────────────────────────────────────

  /**
   * Resolves the human-readable label for the currently selected value.
   * Falls back to the raw code/system string when the concept isn't in the
   * currently-loaded page(s) (e.g. a previously-saved value not yet searched for).
   */
  const selectedLabel: string | null = useMemo(() => {
    if (!value) return null;
    if (typeof value === "object") return value.display;
    return allConcepts.find((c) => c.code === value)?.display ?? value;
  }, [value, allConcepts]);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  /** Emit the appropriate value shape and close the popover. */
  function handleSelect(concept: TConceptResponse) {
    if (valueType === "codeable_concept") {
      onChange?.({
        code: concept.code,
        system: concept.system ?? "",
        display: concept.display,
        text: concept.display,
      });
    } else {
      onChange?.(concept.code);
    }
    setOpen(false);
  }

  /** Clear the current selection. */
  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange?.(null);
  }

  /** Fetches the next page once the list is scrolled near the bottom. */
  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    if (!query.hasNextPage || query.isFetchingNextPage) return;
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
      void query.fetchNextPage();
    }
  }

  // ── Empty state message ───────────────────────────────────────────────────────

  const emptyMessage = isSearching
    ? "Loading…"
    : inputValue.length < effectiveMinChars
      ? `Type at least ${effectiveMinChars} character${effectiveMinChars !== 1 ? "s" : ""} to search`
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
            !selectedLabel && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">
            {selectedLabel ?? placeholder}
          </span>
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
            {isSearching ? (
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
          <CommandList onScroll={handleScroll}>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {allConcepts.map((concept) => {
                const isSelected =
                  typeof value === "object"
                    ? value?.code === concept.code
                    : value === concept.code;

                return (
                  <CommandItem
                    key={`${concept.system ?? ""}:${concept.code}`}
                    value={concept.code}
                    onSelect={() => handleSelect(concept)}
                    className="flex items-start gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{concept.display}</div>
                      {concept.definition && (
                        <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {concept.definition}
                        </div>
                      )}
                      {/* Show code + system for codeable concept mode */}
                      {valueType === "codeable_concept" && concept.system_name && (
                        <div className="text-xs text-muted-foreground/70 mt-0.5 font-mono">
                          {concept.code} · {concept.system_name}
                        </div>
                      )}
                    </div>
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>

            {/* Load-more spinner — shown while fetching the next page on scroll */}
            {isFetchingMore && (
              <div className="py-3 flex justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
