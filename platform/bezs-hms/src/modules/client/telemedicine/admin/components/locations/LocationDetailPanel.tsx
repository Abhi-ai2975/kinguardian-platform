/**
 * LocationDetailPanel — row-expand detail component for the Locations table.
 *
 * Layer: client / telemedicine / admin
 * Resource: Location
 *
 * Renders the full location record in a structured panel when a table row is
 * expanded. Sections: Overview, Address, Types, Aliases, Identifiers, Contact
 * Points, Hours of Operation, Position, Endpoints.
 *
 * Mirrors OrganizationDetailPanel's structure and conventions — adapted for
 * Location's flat (non-array) address and its extra sections (physical type,
 * hours of operation, geographic position) that Organization doesn't have.
 */

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TLocationResponse } from "@/modules/entities/schemas/location";
import { Row } from "@tanstack/react-table";

interface LocationDetailPanelProps {
  /** TanStack row containing the full TLocationResponse. */
  row: Row<TLocationResponse>;
}

/**
 * Full-width expandable detail panel rendered below a table row.
 * Shows all sub-resource arrays and scalar fields not visible in the main columns.
 *
 * @param row - The TanStack table row with the location data.
 */
export function LocationDetailPanel({ row }: LocationDetailPanelProps) {
  const location = row.original;

  const statusVariant =
    location.status === "active"
      ? "default"
      : location.status === "suspended"
        ? "secondary"
        : "outline";

  const address = [
    location.address_line?.join(", "),
    location.address_city,
    location.address_district,
    location.address_state,
    location.address_postal_code,
    location.address_country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="p-4 bg-muted/30 border-t space-y-5">
      {/* ── Overview ── */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:grid-cols-4">
        <DetailField label="ID" value={String(location.id)} />
        <DetailField label="Name" value={location.name} />
        <DetailField
          label="Status"
          value={
            location.status ? (
              <Badge variant={statusVariant} className="capitalize">
                {location.status}
              </Badge>
            ) : undefined
          }
        />
        <DetailField label="Mode" value={location.mode} />
        <DetailField label="Description" value={location.description} />
        <DetailField
          label="Physical Type"
          value={location.physical_type_display ?? location.physical_type_code}
        />
        <DetailField label="Managing Organization" value={location.managing_organization_display} />
        <DetailField label="Parent Location" value={location.part_of_display} />
        <DetailField
          label="Operational Status"
          value={location.operational_status_display ?? location.operational_status_code}
        />
        <DetailField label="Availability Exceptions" value={location.availability_exceptions} />
        <DetailField label="Created" value={formatDate(location.created_at)} />
        <DetailField label="Updated" value={formatDate(location.updated_at)} />
        <DetailField label="Created By" value={location.created_by} />
      </div>

      {/* ── Address (flat, single set — unlike Organization's array) ── */}
      {address && (
        <>
          <Separator />
          <Section title="Address">
            <div className="text-sm space-y-0.5">
              {location.address_use && (
                <Badge variant="outline" className="capitalize text-xs mr-1">
                  {location.address_use}
                </Badge>
              )}
              {location.address_type && (
                <Badge variant="outline" className="capitalize text-xs">
                  {location.address_type}
                </Badge>
              )}
              <p className="text-muted-foreground">{location.address_text || address}</p>
            </div>
          </Section>
        </>
      )}

      {/* ── Types ── */}
      {location.type && location.type.length > 0 && (
        <>
          <Separator />
          <Section title="Types">
            <div className="flex flex-wrap gap-2">
              {location.type.map((t, i) => (
                <Badge key={t.id ?? i} variant="outline">
                  {t.coding_display ?? t.coding_code ?? t.text ?? "Unknown"}
                </Badge>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Aliases ── */}
      {location.alias && location.alias.length > 0 && (
        <>
          <Separator />
          <Section title="Aliases">
            <div className="flex flex-wrap gap-2">
              {location.alias.map((a, i) => (
                <Badge key={i} variant="secondary">
                  {a}
                </Badge>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Identifiers ── */}
      {location.identifier && location.identifier.length > 0 && (
        <>
          <Separator />
          <Section title="Identifiers">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {location.identifier.map((id, i) => (
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

      {/* ── Contact Points (Telecom) ── */}
      {location.telecom && location.telecom.length > 0 && (
        <>
          <Separator />
          <Section title="Contact Points">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {location.telecom.map((t, i) => (
                <div key={t.id ?? i} className="text-sm space-y-0.5">
                  <span className="font-medium capitalize">{t.system}</span>
                  {t.use && (
                    <Badge variant="outline" className="ml-1 text-xs">
                      {t.use}
                    </Badge>
                  )}
                  <p className="text-muted-foreground">{t.value}</p>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Hours of Operation ── */}
      {location.hours_of_operation && location.hours_of_operation.length > 0 && (
        <>
          <Separator />
          <Section title="Hours of Operation">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {location.hours_of_operation.map((h, i) => (
                <div key={h.id ?? i} className="text-sm space-y-0.5">
                  <div className="flex flex-wrap gap-1">
                    {h.days_of_week?.map((d) => (
                      <Badge key={d} variant="outline" className="text-xs uppercase">
                        {d}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-muted-foreground">
                    {h.all_day ? "All day" : [h.opening_time, h.closing_time].filter(Boolean).join(" – ")}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Geographic Position ── */}
      {(location.position_longitude != null ||
        location.position_latitude != null ||
        location.position_altitude != null) && (
        <>
          <Separator />
          <Section title="Geographic Position">
            <div className="grid grid-cols-3 gap-x-8 text-sm">
              <DetailField label="Longitude" value={location.position_longitude?.toString()} />
              <DetailField label="Latitude" value={location.position_latitude?.toString()} />
              <DetailField label="Altitude" value={location.position_altitude?.toString()} />
            </div>
          </Section>
        </>
      )}

      {/* ── Endpoints ── */}
      {location.endpoint && location.endpoint.length > 0 && (
        <>
          <Separator />
          <Section title="Endpoints">
            <div className="flex flex-wrap gap-2">
              {location.endpoint.map((ep, i) => (
                <Badge key={ep.id ?? i} variant="outline">
                  {ep.reference_display ?? `${ep.reference_type ?? "Endpoint"}/${ep.reference_id ?? ""}`}
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
