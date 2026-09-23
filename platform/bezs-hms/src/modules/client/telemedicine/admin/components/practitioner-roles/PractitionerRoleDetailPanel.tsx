/**
 * PractitionerRoleDetailPanel — row-expand detail component for the
 * PractitionerRoles table.
 *
 * Layer: client / telemedicine / admin
 * Resource: PractitionerRole
 *
 * Renders the full practitioner role record in a structured panel when a
 * table row is expanded. Sections: Overview, Codes, Specialties, Locations,
 * Healthcare Services, Characteristics, Communication, Contacts,
 * Availability, Endpoints, Identifiers — same section-per-array pattern as
 * every prior detail panel this session.
 */

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TPractitionerRoleResponse } from "@/modules/entities/schemas/practitioner-role";
import { Row } from "@tanstack/react-table";

interface PractitionerRoleDetailPanelProps {
  /** TanStack row containing the full TPractitionerRoleResponse. */
  row: Row<TPractitionerRoleResponse>;
}

/**
 * Full-width expandable detail panel rendered below a table row.
 * Shows all sub-resource arrays and scalar fields not visible in the main columns.
 *
 * @param row - The TanStack table row with the practitioner role data.
 */
export function PractitionerRoleDetailPanel({ row }: PractitionerRoleDetailPanelProps) {
  const role = row.original;

  return (
    <div className="p-4 bg-muted/30 border-t space-y-5">
      {/* ── Overview ── */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:grid-cols-4">
        <DetailField label="ID" value={String(role.id)} />
        <DetailField
          label="Active"
          value={
            <Badge variant={role.active ? "default" : "outline"}>
              {role.active ? "Active" : "Inactive"}
            </Badge>
          }
        />
        <DetailField label="Practitioner" value={role.practitioner_display} />
        <DetailField label="Organization" value={role.organization_display} />
        <DetailField label="Period Start" value={formatDate(role.period_start)} />
        <DetailField label="Period End" value={formatDate(role.period_end)} />
        <DetailField label="Availability Exceptions" value={role.availability_exceptions} />
        <DetailField label="Created" value={formatDate(role.created_at)} />
        <DetailField label="Updated" value={formatDate(role.updated_at)} />
        <DetailField label="Created By" value={role.created_by} />
      </div>

      {/* ── Codes ── */}
      {role.code && role.code.length > 0 && (
        <>
          <Separator />
          <Section title="Codes">
            <div className="flex flex-wrap gap-2">
              {role.code.map((c, i) => (
                <Badge key={c.id ?? i} variant="outline">
                  {c.coding_display ?? c.coding_code ?? c.text ?? "Unknown"}
                </Badge>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Specialties ── */}
      {role.specialty && role.specialty.length > 0 && (
        <>
          <Separator />
          <Section title="Specialties">
            <div className="flex flex-wrap gap-2">
              {role.specialty.map((s, i) => (
                <Badge key={s.id ?? i} variant="outline">
                  {s.coding_display ?? s.coding_code ?? s.text ?? "Unknown"}
                </Badge>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Locations ── */}
      {role.location && role.location.length > 0 && (
        <>
          <Separator />
          <Section title="Locations">
            <div className="flex flex-wrap gap-2">
              {role.location.map((loc, i) => (
                <Badge key={loc.id ?? i} variant="outline">
                  {loc.reference_display ?? loc.reference ?? "Unknown"}
                </Badge>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Healthcare Services ── */}
      {role.healthcare_service && role.healthcare_service.length > 0 && (
        <>
          <Separator />
          <Section title="Healthcare Services">
            <div className="flex flex-wrap gap-2">
              {role.healthcare_service.map((hs, i) => (
                <Badge key={hs.id ?? i} variant="outline">
                  {hs.reference_display ?? hs.reference ?? "Unknown"}
                </Badge>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Characteristics ── */}
      {role.characteristic && role.characteristic.length > 0 && (
        <>
          <Separator />
          <Section title="Characteristics">
            <div className="flex flex-wrap gap-2">
              {role.characteristic.map((c, i) => (
                <Badge key={c.id ?? i} variant="outline">
                  {c.coding_display ?? c.coding_code ?? c.text ?? "Unknown"}
                </Badge>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Communication ── */}
      {role.communication && role.communication.length > 0 && (
        <>
          <Separator />
          <Section title="Communication">
            <div className="flex flex-wrap gap-2">
              {role.communication.map((c, i) => (
                <Badge key={c.id ?? i} variant="outline">
                  {c.coding_display ?? c.coding_code ?? c.text ?? "Unknown"}
                </Badge>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Contacts ── */}
      {role.contact && role.contact.length > 0 && (
        <>
          <Separator />
          <Section title="Contacts">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {role.contact.map((c, i) => {
                const name = c.names?.[0];
                const telecom = c.telecoms?.[0];
                const nameLabel =
                  name?.text ?? [name?.given?.join(" "), name?.family].filter(Boolean).join(" ");
                return (
                  <div key={c.id ?? i} className="text-sm space-y-0.5 rounded-md border p-2">
                    {c.purpose_display && (
                      <Badge variant="outline" className="text-xs">
                        {c.purpose_display}
                      </Badge>
                    )}
                    {nameLabel && <p className="font-medium">{nameLabel}</p>}
                    {telecom?.value && (
                      <p className="text-muted-foreground">
                        {telecom.system}: {telecom.value}
                      </p>
                    )}
                    {c.organization_display && (
                      <p className="text-muted-foreground">{c.organization_display}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        </>
      )}

      {/* ── Availability ── */}
      {role.availability && role.availability.length > 0 && (
        <>
          <Separator />
          <Section title="Availability">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {role.availability.flatMap((a, ai) =>
                (a.available_times ?? []).map((t, ti) => (
                  <div key={`${a.id ?? ai}-${t.id ?? ti}`} className="text-sm space-y-0.5">
                    <div className="flex flex-wrap gap-1">
                      {t.days_of_week?.map((d) => (
                        <Badge key={d} variant="outline" className="text-xs uppercase">
                          {d}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-muted-foreground">
                      {t.all_day
                        ? "All day"
                        : [t.available_start_time, t.available_end_time].filter(Boolean).join(" – ")}
                    </p>
                  </div>
                )),
              )}
            </div>
          </Section>
        </>
      )}

      {/* ── Endpoints ── */}
      {role.endpoint && role.endpoint.length > 0 && (
        <>
          <Separator />
          <Section title="Endpoints">
            <div className="flex flex-wrap gap-2">
              {role.endpoint.map((ep, i) => (
                <Badge key={ep.id ?? i} variant="outline">
                  {ep.reference_display ?? ep.reference ?? "Unknown"}
                </Badge>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Identifiers ── */}
      {role.identifier && role.identifier.length > 0 && (
        <>
          <Separator />
          <Section title="Identifiers">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {role.identifier.map((id, i) => (
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
