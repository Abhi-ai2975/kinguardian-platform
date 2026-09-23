/**
 * ScheduleDetailPanel — row-expand detail component for the Schedules table.
 *
 * Layer: client / telemedicine / admin
 * Resource: Schedule
 *
 * Renders the full schedule record in a structured panel when a table row is
 * expanded. Sections: Overview, Actors, Identifiers, Classification
 * (specialty / service type / service category).
 *
 * Mirrors LocationDetailPanel's structure and conventions.
 */

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TScheduleResponse } from "@/modules/entities/schemas/schedule";
import { Row } from "@tanstack/react-table";

interface ScheduleDetailPanelProps {
  /** TanStack row containing the full TScheduleResponse. */
  row: Row<TScheduleResponse>;
}

/**
 * Full-width expandable detail panel rendered below a table row.
 * Shows all sub-resource arrays and scalar fields not visible in the main columns.
 *
 * @param row - The TanStack table row with the schedule data.
 */
export function ScheduleDetailPanel({ row }: ScheduleDetailPanelProps) {
  const schedule = row.original;

  return (
    <div className="p-4 bg-muted/30 border-t space-y-5">
      {/* ── Overview ── */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:grid-cols-4">
        <DetailField label="ID" value={String(schedule.id)} />
        <DetailField
          label="Active"
          value={
            <Badge variant={schedule.active ? "default" : "outline"}>
              {schedule.active ? "Active" : "Inactive"}
            </Badge>
          }
        />
        <DetailField label="Comment" value={schedule.comment} />
        <DetailField
          label="Planning Horizon Start"
          value={formatDate(schedule.planning_horizon_start)}
        />
        <DetailField
          label="Planning Horizon End"
          value={formatDate(schedule.planning_horizon_end)}
        />
        <DetailField label="Created" value={formatDate(schedule.created_at)} />
        <DetailField label="Updated" value={formatDate(schedule.updated_at)} />
        <DetailField label="Created By" value={schedule.created_by} />
      </div>

      {/* ── Actors ── */}
      {schedule.actor && schedule.actor.length > 0 && (
        <>
          <Separator />
          <Section title="Actors">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {schedule.actor.map((a, i) => (
                <div key={a.id ?? i} className="text-sm space-y-0.5">
                  {a.reference_type && (
                    <Badge variant="outline" className="text-xs">
                      {a.reference_type}
                    </Badge>
                  )}
                  <p className="text-muted-foreground">
                    {a.reference_display ??
                      `${a.reference_type ?? "Reference"}/${a.reference_id ?? ""}`}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Identifiers ── */}
      {schedule.identifier && schedule.identifier.length > 0 && (
        <>
          <Separator />
          <Section title="Identifiers">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {schedule.identifier.map((id, i) => (
                <div key={id.id ?? i} className="text-sm space-y-0.5">
                  {id.use && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {id.use}
                    </Badge>
                  )}
                  <p className="text-muted-foreground">{id.value}</p>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Specialty ── */}
      {schedule.specialty && schedule.specialty.length > 0 && (
        <>
          <Separator />
          <Section title="Specialty">
            <div className="flex flex-wrap gap-2">
              {schedule.specialty.map((s, i) => (
                <Badge key={s.id ?? i} variant="outline">
                  {s.coding_display ?? s.coding_code ?? s.text ?? "Unknown"}
                </Badge>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Service Type ── */}
      {schedule.service_type && schedule.service_type.length > 0 && (
        <>
          <Separator />
          <Section title="Service Type">
            <div className="flex flex-wrap gap-2">
              {schedule.service_type.map((s, i) => (
                <Badge key={s.id ?? i} variant="outline">
                  {s.coding_display ?? s.coding_code ?? s.text ?? "Unknown"}
                </Badge>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Service Category ── */}
      {schedule.service_category && schedule.service_category.length > 0 && (
        <>
          <Separator />
          <Section title="Service Category">
            <div className="flex flex-wrap gap-2">
              {schedule.service_category.map((s, i) => (
                <Badge key={s.id ?? i} variant="outline">
                  {s.coding_display ?? s.coding_code ?? s.text ?? "Unknown"}
                </Badge>
              ))}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

// ── Internal helpers ────────────────────────────────────────────────────────────

/** Renders a labelled key-value pair. Renders nothing when value is falsy. */
function DetailField({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

/** Titled section wrapper used inside the detail panel. */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

/** Formats an ISO-8601 string to a localized date-time or returns undefined. */
function formatDate(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  return new Date(iso).toLocaleString();
}
