/**
 * TerminologyCombobox — searchable terminology code picker.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review / shared
 *
 * Calls GET /api/workflow/terminology?system=<system>&query=<q> (drgodly terminology
 * proxy) which searches LOINC, SNOMED CT, RxNorm, and ICD-10 in the FHIR server.
 * Returns { concepts: [{ code, display, system }] }.
 *
 * Used in all clinical item cards (ConditionItem, ObservationItem, etc.) to let
 * doctors resolve AI-suggested labels to authoritative FHIR codes.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResolvedConcept } from "../types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TerminologyComboboxProps {
  /** Full FHIR system URL, e.g. "http://snomed.info/sct". */
  system: string;
  /** Pre-populate the search with the AI-extracted label. */
  initialQuery?: string;
  /** Currently selected concept (controlled). */
  value: ResolvedConcept | null;
  /** Called when the doctor selects or clears a concept. */
  onChange: (concept: ResolvedConcept | null) => void;
  /** Input placeholder text. */
  placeholder?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Combobox that searches the FHIR terminology server for a given system.
 * Debounces the query by 300 ms to avoid excessive requests.
 *
 * @param system - FHIR terminology system URL.
 * @param initialQuery - Pre-populate search input with AI label.
 * @param value - Selected concept (controlled).
 * @param onChange - Parent setter.
 * @param placeholder - Input placeholder text.
 */
export function TerminologyCombobox({
  system,
  initialQuery = "",
  value,
  onChange,
  placeholder = "Search terminology...",
}: TerminologyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(initialQuery);
  const [results, setResults] = useState<ResolvedConcept[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Search the terminology proxy route with debounce. */
  const fetchConcepts = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({ system, query: q });
        const res = await fetch(`/api/workflow/terminology?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list: ResolvedConcept[] = (data.concepts ?? []).map(
          (c: { code: string; display: string; system?: string; text?: string }) => ({
            code: c.code,
            system: c.system ?? system,
            display: c.display,
            text: c.text ?? c.display,
          }),
        );
        setResults(list);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [system],
  );

  /* Debounce search input changes. */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchConcepts(search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, fetchConcepts]);

  /* Fire initial query when the popover opens. */
  useEffect(() => {
    if (open && search) {
      void fetchConcepts(search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value ? (
            <span className="text-sm truncate">
              {value.display}{" "}
              <span className="text-muted-foreground font-mono text-xs">
                ({value.code})
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[340px]" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type to search..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <div className="py-3 text-center text-xs text-muted-foreground">
                Searching…
              </div>
            ) : results.length === 0 ? (
              <CommandEmpty>No results found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {results.map((concept) => (
                  <CommandItem
                    key={`${concept.system}|${concept.code}`}
                    value={`${concept.code}|${concept.display}`}
                    onSelect={() => {
                      onChange(concept);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value?.code === concept.code ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm truncate">{concept.display}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {concept.code}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
