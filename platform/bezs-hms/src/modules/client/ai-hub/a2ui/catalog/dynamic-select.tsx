/**
 * DynamicSelect — fully schema-driven combobox for the A2UI catalog.
 *
 * Layer: client / ai-hub / a2ui / catalog
 *
 * Unlike TerminologySelect (fixed FHIR concept shape) and DataSelect (client-only,
 * pre-loaded items), this component is completely configurable from the UI schema:
 *
 *   source        — which API endpoint to call, what query params to send, how many
 *                   chars before server search fires, and pagination settings.
 *                   Values in staticParams are resolved from the workflow session
 *                   context via resolvePrimitive (e.g. org_id, patient_id).
 *   display       — which fields to render as the label, description, and badge tags
 *                   for each dropdown row. Supports dot-path and template strings.
 *   emits         — which item fields to write as hidden inputs on selection.
 *                   Supports dot-path (raw value) or template (e.g. "Organization/{id}"
 *                   for FHIR references). Picked up by form.tsx collectFormData.
 *
 * Three search modes (controlled by schema, not code):
 *   Client-only   — no source, items pre-loaded from context; browser text filter.
 *   Server-only   — source defined, no items; server search from first keypress.
 *   Hybrid        — items + source; shows static items initially, switches to
 *                   server results once user types ≥ minChars (or on open if minChars=0).
 *
 * Pagination:
 *   When source is configured with pageSize, the component fetches the first page on
 *   open (minChars=0) or on first search match, then loads additional pages as the user
 *   scrolls to the bottom of the dropdown list via an IntersectionObserver sentinel.
 */

"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { DynamicSelectNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
import { ChevronsUpDown, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Path / template utilities ─────────────────────────────────────────────────
// Self-contained helpers — each catalog component is standalone (no shared util imports).

/**
 * Traverses a dot-separated path (e.g. "a.b.0.c") into a nested object/array.
 *
 * @param obj  - The root value to traverse.
 * @param path - Dot-notation path string.
 * @returns The value at the path, or undefined when unreachable.
 */
function resolvePath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null) return undefined;
    if (Array.isArray(acc)) {
      const idx = parseInt(key, 10);
      return isNaN(idx) ? undefined : acc[idx];
    }
    if (typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Applies a named formatter to a resolved field value.
 *
 * @param value     - Raw value from the item object.
 * @param formatter - Named formatter: "time" | "date" | "short_date" | "datetime".
 * @returns Formatted string, falling back to the raw string representation.
 */
function applyFormatter(value: unknown, formatter: string): string {
  if (value === undefined || value === null) return "";
  const raw = String(value);
  switch (formatter.trim()) {
    case "time": {
      const d = new Date(raw);
      return isNaN(d.getTime())
        ? raw
        : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    case "date": {
      const d = new Date(raw);
      return isNaN(d.getTime()) ? raw : d.toLocaleDateString();
    }
    case "short_date": {
      const d = new Date(raw);
      return isNaN(d.getTime())
        ? raw
        : d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    }
    case "datetime": {
      const d = new Date(raw);
      return isNaN(d.getTime())
        ? raw
        : d.toLocaleString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
    }
    default:
      return raw;
  }
}

/**
 * Resolves a "path | formatter" expression against an item.
 *
 * @param obj  - The item object.
 * @param expr - Expression string, e.g. "start | time" or "name.text".
 * @returns Formatted string value.
 */
function resolveField(obj: unknown, expr: string): string {
  const pipeIdx = expr.indexOf("|");
  if (pipeIdx === -1) {
    return String(resolvePath(obj, expr.trim()) ?? "");
  }
  const path = expr.slice(0, pipeIdx).trim();
  const formatter = expr.slice(pipeIdx + 1).trim();
  return applyFormatter(resolvePath(obj, path), formatter);
}

/**
 * Resolves a template string like "{first_name} {last_name}" or "Organization/{id}"
 * by replacing every `{...}` token with its resolved value from the item.
 *
 * @param obj      - The item object.
 * @param template - Template string with `{path}` or `{path | formatter}` tokens.
 * @returns Fully interpolated string.
 */
function resolveTemplate(obj: unknown, template: string): string {
  return template.replace(/\{([^}]+)\}/g, (_, expr: string) => resolveField(obj, expr));
}

// ── Component ─────────────────────────────────────────────────────────────────

interface DynamicSelectProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: DynamicSelectNode;
  weight?: string | number;
}

/**
 * Fully schema-driven combobox component.
 *
 * Reads all display, search, pagination, and value config from `component.properties`
 * so the same React component can power org pickers, practitioner lookups, patient
 * search, and any other resource type — just by changing the workflow UI schema.
 *
 * @param processor - A2UI message processor (data model + dispatch).
 * @param surfaceId - Surface identifier for data context resolution.
 * @param component - DynamicSelectNode from the rendered workflow schema.
 * @param weight    - CSS flex weight for row/column layout.
 */
export function DynamicSelect({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: DynamicSelectProps) {
  const { resolvePrimitive } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);

  // ── Server-fetch state ───────────────────────────────────────────────────────
  /** Items accumulated across all fetched pages (first-page and load-more). */
  const [serverItems, setServerItems] = useState<Record<string, unknown>[]>([]);
  /** Offset for the next page fetch. Resets to 0 on every new search term. */
  const [nextOffset, setNextOffset] = useState(0);
  /** True when the last fetch returned a full page — indicates there may be more. */
  const [hasMore, setHasMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  /** Sentinel div at the bottom of the list — watched by IntersectionObserver. */
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Schema-derived config ────────────────────────────────────────────────────
  const label = resolvePrimitive(component.properties.label) as string | undefined;
  const placeholder =
    (resolvePrimitive(component.properties.placeholder) as string | undefined) ?? "Select…";
  const source = component.properties.source;
  const display = component.properties.display;
  const emits = component.properties.emits ?? [];
  const classNames = component.properties.classNames;

  const minChars = source?.minChars ?? 2;
  const debounceMs = source?.debounceMs ?? 300;
  const pageSize = source?.pageSize ?? 10;

  // Pre-loaded items from workflow context (populated by context_resolvers / AI agent).
  const rawItems = component.properties.items;
  const staticItems: Record<string, unknown>[] = Array.isArray(rawItems) ? rawItems : [];

  // ── Static params resolution ─────────────────────────────────────────────────
  // Values in staticParams may reference session context (org_id, patient_id etc.)
  // via StringValue/NumberValue objects. resolvePrimitive reads from the processor data model.

  const resolvedStaticParams = useMemo<Record<string, string>>(() => {
    if (!source?.staticParams) return {};
    const result: Record<string, string> = {};
    for (const [key, val] of Object.entries(source.staticParams)) {
      const resolved = resolvePrimitive(val);
      if (resolved !== null && resolved !== undefined && resolved !== "") {
        result[key] = String(resolved);
      }
    }
    return result;
    // source is stable after mount — workflow schema is immutable once rendered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  // ── Display helpers ──────────────────────────────────────────────────────────

  /** Returns the primary label string for a given item. */
  const getLabel = useCallback(
    (item: Record<string, unknown>): string => {
      if (display.label.template) return resolveTemplate(item, display.label.template);
      if (display.label.path) return resolveField(item, display.label.path);
      return "—";
    },
    [display.label],
  );

  /** Returns the secondary description string for a given item, or empty string. */
  const getDesc = useCallback(
    (item: Record<string, unknown>): string => {
      if (!display.description) return "";
      if (display.description.template) return resolveTemplate(item, display.description.template);
      if (display.description.path) return resolveField(item, display.description.path);
      return "";
    },
    [display.description],
  );

  /**
   * Returns badge text strings for a given item.
   * Empty strings are filtered so absent fields don't render blank chips.
   */
  const getTags = useCallback(
    (item: Record<string, unknown>): string[] => {
      if (!display.tags?.length) return [];
      return display.tags
        .map((t) => {
          if (t.template) return resolveTemplate(item, t.template);
          if (t.path) return resolveField(item, t.path);
          return "";
        })
        .filter(Boolean);
    },
    [display.tags],
  );

  // ── Client-side filtering ────────────────────────────────────────────────────

  const filteredStatic = useMemo(() => {
    if (!search.trim()) return staticItems;
    const q = search.toLowerCase();
    return staticItems.filter(
      (item) =>
        getLabel(item).toLowerCase().includes(q) ||
        getDesc(item).toLowerCase().includes(q),
    );
  }, [staticItems, search, getLabel, getDesc]);

  /**
   * Items to display in the dropdown:
   *   - Server items when a server fetch has run (search mode or initial load).
   *   - Filtered static items otherwise (client-only mode or before first search).
   */
  const displayItems = source && serverItems.length > 0 ? serverItems : filteredStatic;

  // ── Core fetch function ──────────────────────────────────────────────────────

  /**
   * Fetches one page from the proxy route and either replaces or appends to serverItems.
   *
   * @param offset     - Pagination offset for this page (0 = first page, replaces items).
   * @param query      - Current search term to send with the request.
   */
  const fetchPage = useCallback(
    async (offset: number, query: string) => {
      if (!source) return;

      const isFirstPage = offset === 0;
      if (isFirstPage) {
        setIsSearching(true);
      } else {
        setIsFetchingMore(true);
      }

      try {
        const params: Record<string, string> = {
          ...resolvedStaticParams,
          [source.limitParam ?? "limit"]: String(pageSize),
          [source.offsetParam ?? "offset"]: String(offset),
        };
        // Only include the search param when there is an actual query.
        if (query) {
          params[source.searchParam ?? "search"] = query;
        }

        const res = await fetch("/api/workflow/dynamic-select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: source.url,
            params,
            responsePath: source.responsePath ?? "",
          }),
        });

        if (!res.ok) return;

        const data = await res.json();
        const newItems: Record<string, unknown>[] = Array.isArray(data.items)
          ? data.items
          : [];

        if (isFirstPage) {
          setServerItems(newItems);
        } else {
          setServerItems((prev) => [...prev, ...newItems]);
        }

        setNextOffset(offset + newItems.length);
        // If we got a full page, there may be more — show the sentinel.
        setHasMore(newItems.length >= pageSize);
      } catch {
        // On error, leave existing items in place so the user doesn't lose their list.
      } finally {
        setIsSearching(false);
        setIsFetchingMore(false);
      }
    },
    [source, resolvedStaticParams, pageSize],
  );

  // ── Initial fetch on open (minChars = 0) ────────────────────────────────────
  // When minChars is 0 the user should see items immediately when the dropdown opens,
  // without typing anything. Only fetches once (guards against repeated open/close).

  useEffect(() => {
    if (!open || !source || minChars > 0) return;
    if (serverItems.length > 0) return; // already loaded
    void fetchPage(0, "");
  // fetchPage is stable (useCallback with stable deps); open and minChars are primitives.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── IntersectionObserver for scroll-to-load-more ─────────────────────────────
  // Watches the sentinel div at the bottom of the list. When it enters the viewport
  // (within the CommandList scroll container), the next page is fetched and appended.

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isSearching || isFetchingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchPage(nextOffset, search);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isSearching, isFetchingMore, nextOffset, search, fetchPage]);

  // ── Search input handler ─────────────────────────────────────────────────────

  /**
   * Handles combobox input changes. Resets pagination and debounces a server fetch
   * when source is configured and minChars is met. For client-only mode, the
   * filteredStatic memo handles filtering without any async fetch.
   *
   * @param value - Current search input value.
   */
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);

      if (!source) return; // client-only: filteredStatic handles it

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (value.length < minChars) {
        // Below threshold: clear server results so static items (if any) show through.
        // For minChars=0, go back to the initial unfiltered page fetch.
        if (minChars === 0 && value.length === 0) {
          setServerItems([]);
          setNextOffset(0);
          setHasMore(false);
          void fetchPage(0, "");
        } else if (minChars > 0) {
          setServerItems([]);
          setNextOffset(0);
          setHasMore(false);
        }
        return;
      }

      debounceRef.current = setTimeout(() => {
        // New search term — reset pagination to start from page 0.
        setNextOffset(0);
        setHasMore(false);
        void fetchPage(0, value);
      }, debounceMs);
    },
    [source, minChars, debounceMs, fetchPage],
  );

  /**
   * Handles item selection: records the selected item and resets search/results.
   *
   * @param item - The item object clicked in the dropdown.
   */
  const handleSelect = useCallback((item: Record<string, unknown>) => {
    setSelectedItem(item);
    setOpen(false);
    setSearch("");
    // Keep serverItems so re-opening the dropdown restores the list without a refetch.
  }, []);

  // ── Emit value resolver ──────────────────────────────────────────────────────

  /**
   * Derives the hidden-input value for one emit entry from the selected item.
   * Supports template (e.g. "Organization/{id}") and raw dot-path.
   *
   * @param item - The currently selected item object.
   * @param emit - Emit config from the schema.
   * @returns String value to write to the hidden input.
   */
  function resolveEmitValue(
    item: Record<string, unknown>,
    emit: (typeof emits)[number],
  ): string {
    if (emit.template) return resolveTemplate(item, emit.template);
    if (emit.path) return String(resolvePath(item, emit.path) ?? "");
    return "";
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const fieldId = component.id;
  const triggerWidth = triggerRef.current?.offsetWidth;

  const emptyMessage = isSearching
    ? "Searching…"
    : source && search.length < minChars && minChars > 0 && staticItems.length === 0
      ? `Type at least ${minChars} characters to search`
      : "No results found.";

  return (
    <div className={cn("space-y-2", classNames?.root)} style={{ flex: weight }}>
      {label && <Label className={classNames?.label}>{label}</Label>}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between font-normal", classNames?.trigger)}
          >
            {selectedItem ? (
              <span>{getLabel(selectedItem)}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
              value={search}
              onValueChange={handleSearchChange}
            />
            <CommandList>
              {/* Initial search spinner — shows while the first page loads */}
              {isSearching && displayItems.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading…</span>
                </div>
              ) : (
                <>
                  <CommandEmpty>{emptyMessage}</CommandEmpty>
                  <CommandGroup>
                    {displayItems.map((item, i) => {
                      const lbl = getLabel(item);
                      const desc = getDesc(item);
                      const tags = getTags(item);
                      const isSelected = selectedItem === item;

                      return (
                        <CommandItem
                          key={i}
                          value={`${lbl}-${i}`}
                          onSelect={() => handleSelect(item)}
                          className="flex items-start gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            {/* Primary label line */}
                            <div className="font-medium">{lbl}</div>

                            {/* Secondary description line */}
                            {desc && (
                              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {desc}
                              </div>
                            )}

                            {/* Tag badges — one chip per display.tags entry */}
                            {tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {tags.map((tag, ti) => (
                                  <span
                                    key={ti}
                                    className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                                  >
                                    {tag}
                                  </span>
                                ))}
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

                    {/*
                      Scroll sentinel — IntersectionObserver watches this element.
                      When it scrolls into view, fetchPage is called for the next page.
                      Only rendered when there may be more items to load.
                    */}
                    {hasMore && (
                      <div ref={sentinelRef} className="py-2 flex items-center justify-center">
                        {isFetchingMore && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/*
        Hidden inputs collected by form.tsx collectFormData.
        id = emit.key directly so the form data key matches the schema field name exactly.
        Supports dot-path (raw value) or template (e.g. "Organization/{id}") per emit entry.
      */}
      {emits.map((emit) => (
        <input
          key={emit.key}
          id={emit.key}
          type="hidden"
          value={selectedItem ? resolveEmitValue(selectedItem, emit) : ""}
        />
      ))}
    </div>
  );
}
