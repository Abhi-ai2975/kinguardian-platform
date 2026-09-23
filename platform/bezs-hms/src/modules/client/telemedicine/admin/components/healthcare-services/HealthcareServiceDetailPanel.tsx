/**
 * HealthcareServiceDetailPanel — row-expand detail component for the
 * Healthcare Services table.
 *
 * Layer: client / telemedicine / admin
 * Resource: HealthcareService
 *
 * Renders the full healthcare service record in a structured panel when a
 * table row is expanded. Sections: Overview, Categories, Types, Specialties,
 * Provision Codes, Programs, Characteristics, Languages, Referral Methods,
 * Identifiers, Contact Points, Locations, Coverage Area, Eligibility,
 * Available Time, Not Available, Endpoints. Mirrors LocationDetailPanel's
 * structure — each section conditionally renders only when non-empty.
 */

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  THealthcareServiceResponse,
  THealthcareServiceCodeableConceptResponse,
} from "@/modules/entities/schemas/healthcare-service";
import { Row } from "@tanstack/react-table";

interface HealthcareServiceDetailPanelProps {
  /** TanStack row containing the full THealthcareServiceResponse. */
  row: Row<THealthcareServiceResponse>;
}

/** Renders one CodeableConcept row as a badge — shared by every coded-array section. */
function ConceptBadge({ concept }: { concept: THealthcareServiceCodeableConceptResponse }) {
  return (
    <Badge variant="outline">
      {concept.coding_display ?? concept.coding_code ?? concept.text ?? "Unknown"}
    </Badge>
  );
}

/**
 * Full-width expandable detail panel rendered below a table row.
 * Shows all sub-resource arrays and scalar fields not visible in the main columns.
 *
 * @param row - The TanStack table row with the healthcare service data.
 */
export function HealthcareServiceDetailPanel({ row }: HealthcareServiceDetailPanelProps) {
  const hcs = row.original;

  return (
    <div className="p-4 bg-muted/30 border-t space-y-5">
      {/* ── Overview ── */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:grid-cols-4">
        <DetailField label="ID" value={String(hcs.id)} />
        <DetailField label="Name" value={hcs.name} />
        <DetailField
          label="Active"
          value={
            hcs.active !== undefined && hcs.active !== null ? (
              <Badge variant={hcs.active ? "default" : "secondary"}>
                {hcs.active ? "Active" : "Inactive"}
              </Badge>
            ) : undefined
          }
        />
        <DetailField
          label="Appointment Required"
          value={
            hcs.appointment_required !== undefined && hcs.appointment_required !== null
              ? hcs.appointment_required
                ? "Yes"
                : "No"
              : undefined
          }
        />
        <DetailField label="Provided By" value={hcs.provided_by_display} />
        <DetailField label="Comment" value={hcs.comment} />
        <DetailField label="Extra Details" value={hcs.extra_details} />
        <DetailField label="Availability Exceptions" value={hcs.availability_exceptions} />
        <DetailField label="Created" value={formatDate(hcs.created_at)} />
        <DetailField label="Updated" value={formatDate(hcs.updated_at)} />
        <DetailField label="Created By" value={hcs.created_by} />
      </div>

      {/* ── Categories ── */}
      {hcs.category && hcs.category.length > 0 && (
        <>
          <Separator />
          <Section title="Categories">
            <div className="flex flex-wrap gap-2">
              {hcs.category.map((c, i) => (
                <ConceptBadge key={c.id ?? i} concept={c} />
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Types ── */}
      {hcs.type && hcs.type.length > 0 && (
        <>
          <Separator />
          <Section title="Types">
            <div className="flex flex-wrap gap-2">
              {hcs.type.map((t, i) => (
                <ConceptBadge key={t.id ?? i} concept={t} />
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Specialties ── */}
      {hcs.specialty && hcs.specialty.length > 0 && (
        <>
          <Separator />
          <Section title="Specialties">
            <div className="flex flex-wrap gap-2">
              {hcs.specialty.map((s, i) => (
                <ConceptBadge key={s.id ?? i} concept={s} />
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Service Provision Codes ── */}
      {hcs.service_provision_code && hcs.service_provision_code.length > 0 && (
        <>
          <Separator />
          <Section title="Service Provision Codes">
            <div className="flex flex-wrap gap-2">
              {hcs.service_provision_code.map((c, i) => (
                <ConceptBadge key={c.id ?? i} concept={c} />
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Programs ── */}
      {hcs.program && hcs.program.length > 0 && (
        <>
          <Separator />
          <Section title="Programs">
            <div className="flex flex-wrap gap-2">
              {hcs.program.map((p, i) => (
                <ConceptBadge key={p.id ?? i} concept={p} />
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Characteristics ── */}
      {hcs.characteristic && hcs.characteristic.length > 0 && (
        <>
          <Separator />
          <Section title="Characteristics">
            <div className="flex flex-wrap gap-2">
              {hcs.characteristic.map((c, i) => (
                <ConceptBadge key={c.id ?? i} concept={c} />
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Languages (Communication) ── */}
      {hcs.communication && hcs.communication.length > 0 && (
        <>
          <Separator />
          <Section title="Supported Languages">
            <div className="flex flex-wrap gap-2">
              {hcs.communication.map((c, i) => (
                <ConceptBadge key={c.id ?? i} concept={c} />
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Referral Methods ── */}
      {hcs.referral_method && hcs.referral_method.length > 0 && (
        <>
          <Separator />
          <Section title="Referral Methods">
            <div className="flex flex-wrap gap-2">
              {hcs.referral_method.map((r, i) => (
                <ConceptBadge key={r.id ?? i} concept={r} />
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Identifiers ── */}
      {hcs.identifier && hcs.identifier.length > 0 && (
        <>
          <Separator />
          <Section title="Identifiers">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {hcs.identifier.map((id, i) => (
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

      {/* ── Contact Points ── */}
      {hcs.telecom && hcs.telecom.length > 0 && (
        <>
          <Separator />
          <Section title="Contact Points">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {hcs.telecom.map((t, i) => (
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

      {/* ── Locations ── */}
      {hcs.location && hcs.location.length > 0 && (
        <>
          <Separator />
          <Section title="Locations">
            <div className="flex flex-wrap gap-2">
              {hcs.location.map((l, i) => (
                <Badge key={l.id ?? i} variant="outline">
                  {l.reference_display ?? `${l.reference_type ?? "Location"}/${l.reference_id ?? ""}`}
                </Badge>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Coverage Area ── */}
      {hcs.coverage_area && hcs.coverage_area.length > 0 && (
        <>
          <Separator />
          <Section title="Coverage Area">
            <div className="flex flex-wrap gap-2">
              {hcs.coverage_area.map((c, i) => (
                <Badge key={c.id ?? i} variant="outline">
                  {c.reference_display ?? `${c.reference_type ?? "Location"}/${c.reference_id ?? ""}`}
                </Badge>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Eligibility ── */}
      {hcs.eligibility && hcs.eligibility.length > 0 && (
        <>
          <Separator />
          <Section title="Eligibility">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {hcs.eligibility.map((e, i) => (
                <div key={e.id ?? i} className="text-sm space-y-0.5">
                  {(e.code_display ?? e.code_text) && (
                    <Badge variant="outline" className="text-xs">
                      {e.code_display ?? e.code_text}
                    </Badge>
                  )}
                  {e.comment && <p className="text-muted-foreground">{e.comment}</p>}
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Available Time ── */}
      {hcs.available_time && hcs.available_time.length > 0 && (
        <>
          <Separator />
          <Section title="Available Time">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {hcs.available_time.map((a, i) => (
                <div key={a.id ?? i} className="text-sm space-y-0.5">
                  <div className="flex flex-wrap gap-1">
                    {a.days_of_week?.map((d) => (
                      <Badge key={d} variant="outline" className="text-xs uppercase">
                        {d}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-muted-foreground">
                    {a.all_day
                      ? "All day"
                      : [a.available_start_time, a.available_end_time].filter(Boolean).join(" – ")}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Not Available ── */}
      {hcs.not_available && hcs.not_available.length > 0 && (
        <>
          <Separator />
          <Section title="Not Available">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {hcs.not_available.map((n, i) => (
                <div key={n.id ?? i} className="text-sm space-y-0.5">
                  <p className="font-medium">{n.description}</p>
                  {(n.during_start || n.during_end) && (
                    <p className="text-muted-foreground">
                      {[n.during_start, n.during_end].filter(Boolean).join(" – ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Endpoints ── */}
      {hcs.endpoint && hcs.endpoint.length > 0 && (
        <>
          <Separator />
          <Section title="Endpoints">
            <div className="flex flex-wrap gap-2">
              {hcs.endpoint.map((ep, i) => (
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
