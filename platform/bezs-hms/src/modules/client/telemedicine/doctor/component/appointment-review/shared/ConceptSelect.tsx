/**
 * ConceptSelect — popover-based select for small FHIR value sets.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review / shared
 *
 * Calls GET /api/workflow/terminology?resource=<resource>&field=<field> to load
 * the HL7 value set for a specific FHIR field (e.g. Condition.clinicalStatus).
 * Falls back to the hardcoded `fallback` array if the server call fails.
 *
 * Used in ConditionItem (clinicalStatus, verificationStatus),
 * ObservationItem (status), MedicationItem (status, intent),
 * ServiceRequestItem (status, intent, priority).
 */

"use client";

import { useState, useEffect, useMemo } from "react";
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface Concept {
  code: string;
  display: string;
}

interface ConceptSelectProps {
  /** FHIR resource name, e.g. "Condition". */
  resource: string;
  /** FHIR field name, e.g. "clinicalStatus". */
  field: string;
  /** Currently selected code (controlled). */
  value?: string;
  /** Called when a concept is selected. Receives the concept code string. */
  onChange: (code: string) => void;
  /** Placeholder text shown when no concept is selected. */
  placeholder?: string;
  /** Hardcoded fallback list used when the server is unavailable. */
  fallback?: Concept[];
  /** Maximum number of concepts to fetch. */
  limit?: number;
  /** Pagination offset. */
  offset?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Popover-based concept selector for small FHIR field value sets.
 * Fetches the value set via the workflow terminology proxy on mount.
 *
 * @param resource - FHIR resource type (e.g. "Condition").
 * @param field - FHIR field name (e.g. "clinicalStatus").
 * @param value - Selected code string (controlled).
 * @param onChange - Callback called with the selected code.
 * @param placeholder - Trigger button placeholder text.
 * @param fallback - Hardcoded concepts used if server fetch fails.
 */
export function ConceptSelect({
  resource,
  field,
  value,
  onChange,
  placeholder = "Select...",
  fallback = [],
  limit = 100,
  offset = 0,
}: ConceptSelectProps) {
  const [open, setOpen] = useState(false);
  const [concepts, setConcepts] = useState<Concept[]>(fallback);
  const [search, setSearch] = useState("");

  /* Load the value set once on mount. */
  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams({
          resource,
          field,
          limit: String(limit),
          offset: String(offset),
        });
        const res = await fetch(`/api/workflow/terminology?${params}`);
        if (res.ok) {
          const json = await res.json();
          /* /api/workflow/terminology returns { concepts: [...] } */
          const list: Concept[] = json.concepts ?? [];
          setConcepts(list.length ? list : fallback);
        }
      } catch {
        /* Keep the fallback list on network failure. */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, field]);

  const filtered = useMemo(() => {
    if (!search.trim()) return concepts;
    const q = search.toLowerCase();
    return concepts.filter(
      (c) =>
        c.display?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q),
    );
  }, [concepts, search]);

  const selected = concepts.find((c) => c.code === value);

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
          {selected ? (
            <span className="text-sm capitalize">{selected.display}</span>
          ) : (
            <span className="text-muted-foreground text-sm">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[220px]" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((concept) => (
                <CommandItem
                  key={concept.code}
                  value={concept.code}
                  onSelect={() => {
                    onChange(concept.code);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === concept.code ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="text-sm">{concept.display}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
