/**
 * UISchemaPreview — client component for the Doctor EMR "UI Browser" tab.
 *
 * Layer : Client — telemedicine / doctor / emr
 * Role  : Renders a browsable sidebar of all entries in UI_SCHEMA_REGISTRY, grouped
 *         by FHIR resource type. Selecting a key renders the component tree built by
 *         parseUI (mapUiSchemaDataV3) through the A2UI Renderer, giving the doctor a
 *         live preview of every clinical form / card / table in the system.
 *
 * Layout: two-column flex
 *   Left  — 56-wide scrollable sidebar, grouped by FHIR category
 *   Right — scrollable preview area; shows the rendered schema or an empty state
 */

"use client";

import { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Renderer } from "@/modules/client/ai-hub/a2ui/rendering/renderer";
import { createMessageProcessor } from "@/modules/client/ai-hub/a2ui/rendering/processor";
import { parseUI } from "@/modules/client/ai-hub/utils/mapUiSchemaDataV3";
import { UI_SCHEMA_REGISTRY } from "@/modules/client/ai-hub/schemas/ui";
import type { AnyComponentNode } from "@/modules/client/ai-hub/a2ui/types";

/** Shared processor instance — created once per module load to avoid re-construction on every render. */
const processor = createMessageProcessor();

/** Display order of FHIR resource groups in the sidebar. */
const GROUP_ORDER = [
  "patient",
  "practitioner",
  "appointment",
  "encounter",
  "vitals",
  "observation",
  "condition",
  "medication",
  "orders",
  "care",
  "results",
  "coverage",
  "billing",
  "schedule",
  "org",
  "other",
];

/**
 * Maps a schema registry key to its sidebar group.
 * Uses the key prefix to classify into FHIR resource categories.
 *
 * @param key - Registry key, e.g. "service_request_create_form".
 * @returns Group string matching an entry in GROUP_ORDER.
 */
function groupLabel(key: string): string {
  const prefix = key.split("_")[0];
  if (prefix === "service" || prefix === "device" || prefix === "immunization")
    return "orders";
  if (prefix === "diagnostic" || prefix === "document") return "results";
  if (prefix === "claim" || prefix === "invoice") return "billing";
  if (prefix === "care" || prefix === "task") return "care";
  if (prefix === "org" || prefix === "healthcare" || prefix === "related")
    return "org";
  if (GROUP_ORDER.includes(prefix)) return prefix;
  return "other";
}

/**
 * Converts a registry key into a human-readable title.
 * e.g. "patient_create_form" → "Patient Create Form"
 *
 * @param key - Registry key.
 * @returns Title-cased label with underscores replaced by spaces.
 */
function schemaLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * UISchemaPreview component.
 *
 * Browses all UI schemas in the registry. Selecting a schema renders it via the
 * A2UI Renderer so doctors can inspect every form/card layout before using them
 * in an AI-guided clinical workflow.
 */
export function UISchemaPreview() {
  const [selected, setSelected] = useState<string | null>(null);

  /** Build the grouped sidebar list once on mount (registry is static). */
  const grouped = useMemo(() => {
    const map: Record<string, string[]> = {};
    // vitals_dashboard renders as a full-page widget — exclude from preview list
    const EXCLUDED = new Set(["vitals_dashboard"]);
    for (const key of Object.keys(UI_SCHEMA_REGISTRY).filter(
      (k) => !EXCLUDED.has(k),
    )) {
      const g = groupLabel(key);
      (map[g] ??= []).push(key);
    }
    const ordered: [string, string[]][] = GROUP_ORDER.filter(
      (g) => map[g],
    ).map((g) => [g, map[g]]);
    return ordered;
  }, []);

  /**
   * Parse the selected schema into a component tree whenever the selection changes.
   * Returns null when no schema is selected or parsing fails.
   */
  const node = useMemo<AnyComponentNode | null>(() => {
    if (!selected) return null;
    const schema = UI_SCHEMA_REGISTRY[selected];
    if (!schema) return null;
    return parseUI(JSON.stringify({ ui: schema })) as AnyComponentNode | null;
  }, [selected]);

  return (
    <div className="flex h-full min-h-0">
      {/* ── Sidebar ── */}
      <div className="w-56 shrink-0 border-r flex flex-col min-h-0">
        <div className="px-3 py-2.5 border-b shrink-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            UI Schemas
          </p>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="py-2 space-y-3 px-2">
            {grouped.map(([group, keys]) => (
              <div key={group}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-1">
                  {group}
                </p>
                {keys.map((key) => (
                  <button
                    key={key}
                    onClick={() => setSelected(key)}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded-md transition-colors truncate ${
                      selected === key
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    {schemaLabel(key)}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* ── Preview area ── */}
      <div className="flex-1 min-h-0 flex flex-col">
        {selected && node ? (
          <>
            <div className="px-4 py-2.5 border-b shrink-0 flex items-center gap-2">
              <p className="text-sm font-medium">{schemaLabel(selected)}</p>
              <Badge variant="secondary" className="text-[10px]">
                {selected}
              </Badge>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-6 max-w-2xl mx-auto">
                <Renderer
                  processor={processor}
                  surfaceId={`preview-${selected}`}
                  component={node}
                />
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Select a schema from the sidebar to preview it
          </div>
        )}
      </div>
    </div>
  );
}
