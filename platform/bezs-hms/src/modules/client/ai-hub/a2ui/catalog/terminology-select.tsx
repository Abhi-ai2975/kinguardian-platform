"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { TerminologySelectNode } from "../types";
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

interface Concept {
  id?: number;
  code: string;
  display: string;
  definition?: string;
  system?: string;
  system_name?: string;
  active?: boolean;
}

interface ServerSearchConfig {
  resource: string;
  field: string;
  /** Optional canonical code system URL to scope system-level search (Mode B). */
  system?: string;
  /**
   * Minimum characters before triggering a search.
   * Set to 0 to load results immediately when the popover opens.
   */
  minChars?: number;
  debounceMs?: number;
}

interface TerminologySelectProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: TerminologySelectNode;
  weight?: string | number;
}

/** How many concepts to request per page in server-search mode. */
const PAGE_SIZE = 20;

export function TerminologySelect({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: TerminologySelectProps) {
  const { resolvePrimitive } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Concept | null>(null);

  // Server-search state
  const [serverResults, setServerResults] = useState<Concept[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  /** Root div ref — used to bubble a native input event up to RepeatableGroup. */
  const rootRef = useRef<HTMLDivElement>(null);

  const classNames = component.properties.classNames;
  const label = resolvePrimitive(component.properties.label) as string | undefined;
  const placeholder =
    (resolvePrimitive(component.properties.placeholder) as string | undefined) ??
    "Search...";
  const valueType =
    (resolvePrimitive(component.properties.valueType) as string | undefined) ?? "code";

  // items is pre-resolved from $variable by mapDataToUI — arrives as an array of raw concept objects
  const rawItems = component.properties.items;
  const items: Concept[] = Array.isArray(rawItems) ? rawItems : [];

  const serverSearch = component.properties.serverSearch as ServerSearchConfig | undefined;
  const minChars = serverSearch?.minChars ?? 2;
  const debounceMs = serverSearch?.debounceMs ?? 300;

  /** Whether there are more pages to fetch in server-search mode. */
  const hasMore = serverSearch !== undefined && total > 0 && serverResults.length < total;

  // Client-side filtering for pre-loaded items (non-server-search mode)
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (c) =>
        c.display?.toLowerCase().includes(q) ||
        c.code?.toLowerCase().includes(q) ||
        c.definition?.toLowerCase().includes(q),
    );
  }, [items, search]);

  const displayConcepts = serverSearch ? serverResults : filteredItems;

  // ---------------------------------------------------------------------------
  // Server fetch — shared by initial open, search change, and load-more
  // ---------------------------------------------------------------------------

  /**
   * Fetches a page of concepts from the server.
   *
   * @param query   - Search query string (empty = browse all).
   * @param pageOffset - Offset to pass to the API.
   * @param append  - When true, appends results to the existing list (load-more).
   *                  When false, replaces the list (new search).
   */
  const fetchPage = useCallback(
    async (query: string, pageOffset: number, append: boolean) => {
      if (!serverSearch) return;
      if (append) setIsFetchingMore(true);
      else setIsSearching(true);

      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(pageOffset),
        });

        if (serverSearch.system !== undefined) {
          // Mode B: system-level full-text search (LOINC / ICD-10 / SNOMED / RxNorm)
          if (serverSearch.system) params.set("system", serverSearch.system);
          if (query) params.set("query", query);
        } else {
          // Mode A: field value set with pagination
          params.set("resource", serverSearch.resource ?? "");
          params.set("field", serverSearch.field ?? "");
          if (query) params.set("query", query);
        }

        const res = await fetch(`/api/workflow/terminology?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        const fetched: Concept[] = data.concepts ?? [];

        if (append) {
          setServerResults((prev) => [...prev, ...fetched]);
        } else {
          setServerResults(fetched);
          setOffset(0);
        }
        // total comes back from Mode A; Mode B doesn't paginate so set to fetched length
        setTotal(data.total ?? fetched.length);
      } catch {
        if (!append) setServerResults([]);
      } finally {
        if (append) setIsFetchingMore(false);
        else setIsSearching(false);
      }
    },
    [serverSearch],
  );

  // ---------------------------------------------------------------------------
  // Initial load when popover opens (minChars === 0 only)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (open && serverSearch && minChars === 0 && serverResults.length === 0 && !isSearching) {
      fetchPage("", 0, false);
    }
    // Reset results when popover closes so next open always re-fetches fresh
    if (!open && serverSearch) {
      setSearch("");
      setServerResults([]);
      setOffset(0);
      setTotal(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ---------------------------------------------------------------------------
  // Search input change — debounced, resets pagination
  // ---------------------------------------------------------------------------

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      if (!serverSearch) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (value.length < minChars) {
        // Below threshold — clear results unless minChars===0 in which case keep showing
        if (minChars > 0) {
          setServerResults([]);
          setTotal(0);
        }
        return;
      }

      debounceRef.current = setTimeout(() => {
        fetchPage(value, 0, false);
      }, debounceMs);
    },
    [serverSearch, minChars, debounceMs, fetchPage],
  );

  // ---------------------------------------------------------------------------
  // Scroll-to-load-more
  // ---------------------------------------------------------------------------

  const handleListScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!hasMore || isSearching || isFetchingMore) return;
      const el = e.currentTarget;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
        const nextOffset = offset + PAGE_SIZE;
        setOffset(nextOffset);
        fetchPage(search, nextOffset, true);
      }
    },
    [hasMore, isSearching, isFetchingMore, offset, search, fetchPage],
  );

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------

  const handleSelect = useCallback((concept: Concept) => {
    setSelected(concept);
    setOpen(false);
    setSearch("");
    setServerResults([]);
    setOffset(0);
    setTotal(0);
  }, []);

  // After selection, React updates the hidden input value attributes but does NOT
  // fire native DOM events — so RepeatableGroup's syncToHiddenInput never runs.
  // Dispatch a native input event from the root div so it bubbles up to the group.
  useEffect(() => {
    if (selected !== null) {
      rootRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, [selected]);

  const triggerWidth = triggerRef.current?.offsetWidth;
  const fieldId = component.id;

  return (
    <div ref={rootRef} className={cn("space-y-2", classNames?.root)} style={{ flex: weight }}>
      {label && <Label htmlFor={fieldId} className={classNames?.label}>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            id={`${fieldId}-trigger`}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between font-normal", classNames?.trigger)}
          >
            {selected ? (
              <span>{selected.display}</span>
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
            <CommandList onScroll={handleListScroll}>
              <CommandEmpty>
                {isSearching
                  ? "Searching…"
                  : serverSearch && minChars > 0 && search.length < minChars
                    ? `Type at least ${minChars} characters to search`
                    : "No results found."}
              </CommandEmpty>
              <CommandGroup>
                {displayConcepts.map((concept) => (
                  <CommandItem
                    key={concept.code}
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
                    </div>
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        selected?.code === concept.code ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>

              {/* Load-more spinner — shown while fetching the next page */}
              {isFetchingMore && (
                <div className="py-3 flex justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Initial loading state for minChars===0 open */}
              {isSearching && serverResults.length === 0 && (
                <div className="py-3 flex justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Hidden inputs collected by form.tsx collectFormData.
          "code"            → single input: {id} = code
          "Coding"          → three inputs: {id}_code, {id}_system, {id}_display
          "CodeableConcept" → four inputs: above + {id}_text (same as display) */}
      {valueType === "code" ? (
        <input id={fieldId} type="hidden" value={selected?.code ?? ""} />
      ) : valueType === "Coding" ? (
        <>
          <input id={`${fieldId}_code`}    type="hidden" value={selected?.code    ?? ""} />
          <input id={`${fieldId}_system`}  type="hidden" value={selected?.system  ?? ""} />
          <input id={`${fieldId}_display`} type="hidden" value={selected?.display ?? ""} />
        </>
      ) : (
        <>
          <input id={`${fieldId}_code`}    type="hidden" value={selected?.code    ?? ""} />
          <input id={`${fieldId}_system`}  type="hidden" value={selected?.system  ?? ""} />
          <input id={`${fieldId}_display`} type="hidden" value={selected?.display ?? ""} />
          <input id={`${fieldId}_text`}    type="hidden" value={selected?.display ?? ""} />
        </>
      )}
    </div>
  );
}
