"use client";

import { useState, useMemo, useRef } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { DataSelectNode } from "../types";
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
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Resolves a dot-separated path (e.g. "a.b.0.c") against any nested object/array. */
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

/** Applies a named formatter to a resolved value. */
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
 * Resolves a single "path | formatter" expression against an item object.
 * Falls back to the raw string value when no formatter is specified.
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
 * Resolves a template string like "{start | time} – {end | time}, {start | short_date}"
 * by replacing every `{path | formatter}` token with its formatted value.
 * Falls back to plain path resolution when no `{...}` tokens are present.
 */
function resolveTemplate(obj: unknown, template: string): string {
  return template.replace(/\{([^}]+)\}/g, (_, expr: string) => resolveField(obj, expr));
}

interface DataSelectProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: DataSelectNode;
  weight?: string | number;
}

export function DataSelect({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: DataSelectProps) {
  const { resolvePrimitive } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const label = resolvePrimitive(component.properties.label) as string | undefined;
  const placeholder =
    (resolvePrimitive(component.properties.placeholder) as string | undefined) ?? "Select…";
  const labelPath = component.properties.labelPath ?? "";
  const labelTemplate = component.properties.labelTemplate as string | undefined;
  const descriptionPath = component.properties.descriptionPath ?? "";
  const descriptionTemplate = component.properties.descriptionTemplate as string | undefined;
  const emits = component.properties.emits ?? [];

  const rawItems = component.properties.items;
  const items: Record<string, unknown>[] = Array.isArray(rawItems) ? rawItems : [];

  const getLabel = (item: Record<string, unknown>) =>
    labelTemplate
      ? resolveTemplate(item, labelTemplate)
      : resolveField(item, labelPath) || "—";

  const getDesc = (item: Record<string, unknown>) => {
    if (descriptionTemplate) return resolveTemplate(item, descriptionTemplate);
    if (descriptionPath) return resolveField(item, descriptionPath);
    return "";
  };

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item) => {
      const lbl = getLabel(item).toLowerCase();
      const desc = getDesc(item).toLowerCase();
      return lbl.includes(q) || desc.includes(q);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, search, labelPath, labelTemplate, descriptionPath, descriptionTemplate]);

  const fieldId = component.id;
  const triggerWidth = triggerRef.current?.offsetWidth;

  return (
    <div className="space-y-2" style={{ flex: weight }}>
      {label && <Label>{label}</Label>}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
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
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {filteredItems.map((item, i) => {
                  const lbl = getLabel(item);
                  const desc = getDesc(item);
                  const isSelected = selectedItem === item;
                  return (
                    <CommandItem
                      key={i}
                      value={`${lbl}-${i}`}
                      onSelect={() => {
                        setSelectedItem(item);
                        setOpen(false);
                        setSearch("");
                      }}
                      className="flex items-start gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{lbl}</div>
                        {desc && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {desc}
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
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Hidden inputs collected by form.tsx / collectContainerData — one per emit entry. */}
      {emits.map((emit) => (
        <input
          key={emit.key}
          id={`${fieldId}_${emit.key}`}
          type="hidden"
          value={
            selectedItem
              ? String(resolvePath(selectedItem, emit.path) ?? "")
              : ""
          }
        />
      ))}
    </div>
  );
}
