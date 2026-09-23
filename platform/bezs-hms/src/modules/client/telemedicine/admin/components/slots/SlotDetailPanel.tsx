/**
 * SlotDetailPanel — row-expand detail component for the Slots table.
 *
 * Layer: client / telemedicine / admin
 * Resource: Slot
 *
 * Renders the full slot record in a structured panel when a table row is
 * expanded. Sections: Overview, Appointment Type, Identifiers, Classification
 * (specialty / service type / service category).
 *
 * Mirrors ScheduleDetailPanel's structure and conventions.
 */

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TSlotResponse } from "@/modules/entities/schemas/slot";
import { Row } from "@tanstack/react-table";

interface SlotDetailPanelProps {
  /** TanStack row containing the full TSlotResponse. */
  row: Row<TSlotResponse>;
}

/**
 * Full-width expandable detail panel rendered below a table row.
 * Shows all sub-resource arrays and scalar fields not visible in the main columns.
 *
 * @param row - The TanStack table row with the slot data.
 */
export function SlotDetailPanel({ row }: SlotDetailPanelProps) {
  const slot = row.original;

  const appointmentType =
    slot.appointment_type_display ?? slot.appointment_type_code ?? slot.appointment_type_text;

  return (
    <div className="p-4 bg-muted/30 border-t space-y-5">
      {/* ── Overview ── */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:grid-cols-4">
        <DetailField label="ID" value={String(slot.id)} />
        <DetailField label="Status" value={slot.status} />
        <DetailField
          label="Schedule"
          value={slot.schedule_display ?? (slot.schedule_id ? `Schedule #${slot.schedule_id}` : undefined)}
        />
        <DetailField label="Overbooked" value={slot.overbooked ? "Yes" : undefined} />
        <DetailField label="Start" value={formatDate(slot.start)} />
        <DetailField label="End" value={formatDate(slot.end)} />
        <DetailField label="Comment" value={slot.comment} />
        <DetailField label="Created" value={formatDate(slot.created_at)} />
        <DetailField label="Updated" value={formatDate(slot.updated_at)} />
        <DetailField label="Created By" value={slot.created_by} />
      </div>

      {/* ── Appointment Type ── */}
      {appointmentType && (
        <>
          <Separator />
          <Section title="Appointment Type">
            <Badge variant="outline">{appointmentType}</Badge>
          </Section>
        </>
      )}

      {/* ── Identifiers ── */}
      {slot.identifier && slot.identifier.length > 0 && (
        <>
          <Separator />
          <Section title="Identifiers">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {slot.identifier.map((id, i) => (
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
      {slot.specialty && slot.specialty.length > 0 && (
        <>
          <Separator />
          <Section title="Specialty">
            <div className="flex flex-wrap gap-2">
              {slot.specialty.map((s, i) => (
                <Badge key={s.id ?? i} variant="outline">
                  {s.coding_display ?? s.coding_code ?? s.text ?? "Unknown"}
                </Badge>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Service Type ── */}
      {slot.service_type && slot.service_type.length > 0 && (
        <>
          <Separator />
          <Section title="Service Type">
            <div className="flex flex-wrap gap-2">
              {slot.service_type.map((s, i) => (
                <Badge key={s.id ?? i} variant="outline">
                  {s.coding_display ?? s.coding_code ?? s.text ?? "Unknown"}
                </Badge>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Service Category ── */}
      {slot.service_category && slot.service_category.length > 0 && (
        <>
          <Separator />
          <Section title="Service Category">
            <div className="flex flex-wrap gap-2">
              {slot.service_category.map((s, i) => (
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
      <div className="text-sm font-medium capitalize">{value}</div>
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
