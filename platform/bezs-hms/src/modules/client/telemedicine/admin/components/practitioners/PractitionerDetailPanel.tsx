/**
 * PractitionerDetailPanel — row-expand detail component for the
 * Practitioners table.
 *
 * Layer: client / telemedicine / admin
 * Resource: Practitioner
 *
 * Renders the full practitioner record in a structured panel when a table
 * row is expanded. Sections: Overview, Names, Identifiers, Telecom,
 * Addresses, Photo, Qualifications, Communications — same
 * section-per-array pattern as every prior detail panel this session.
 */

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TPractitionerResponse } from "@/modules/entities/schemas/practitioner";
import { Row } from "@tanstack/react-table";

interface PractitionerDetailPanelProps {
  /** TanStack row containing the full TPractitionerResponse. */
  row: Row<TPractitionerResponse>;
}

/**
 * Full-width expandable detail panel rendered below a table row.
 * Shows all sub-resource arrays and scalar fields not visible in the main columns.
 *
 * @param row - The TanStack table row with the practitioner data.
 */
export function PractitionerDetailPanel({ row }: PractitionerDetailPanelProps) {
  const practitioner = row.original;

  return (
    <div className="p-4 bg-muted/30 border-t space-y-5">
      {/* ── Overview ── */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:grid-cols-4">
        <DetailField label="ID" value={String(practitioner.id)} />
        <DetailField
          label="Active"
          value={
            <Badge variant={practitioner.active ? "default" : "outline"}>
              {practitioner.active ? "Active" : "Inactive"}
            </Badge>
          }
        />
        <DetailField label="Gender" value={practitioner.gender} />
        <DetailField label="Birth Date" value={practitioner.birth_date} />
        <DetailField
          label="Deceased"
          value={
            practitioner.deceased_boolean
              ? "Yes"
              : practitioner.deceased_datetime
                ? formatDate(practitioner.deceased_datetime)
                : undefined
          }
        />
        <DetailField label="Created" value={formatDate(practitioner.created_at)} />
        <DetailField label="Updated" value={formatDate(practitioner.updated_at)} />
        <DetailField label="Created By" value={practitioner.created_by} />
      </div>

      {/* ── Names ── */}
      {practitioner.name && practitioner.name.length > 0 && (
        <>
          <Separator />
          <Section title="Names">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {practitioner.name.map((n, i) => {
                const label =
                  n.text ?? [n.given?.join(" "), n.family].filter(Boolean).join(" ");
                return (
                  <div key={n.id ?? i} className="text-sm space-y-0.5">
                    {n.use && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {n.use}
                      </Badge>
                    )}
                    <p className="text-muted-foreground">{label || "—"}</p>
                  </div>
                );
              })}
            </div>
          </Section>
        </>
      )}

      {/* ── Identifiers ── */}
      {practitioner.identifier && practitioner.identifier.length > 0 && (
        <>
          <Separator />
          <Section title="Identifiers">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {practitioner.identifier.map((id, i) => (
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

      {/* ── Telecom ── */}
      {practitioner.telecom && practitioner.telecom.length > 0 && (
        <>
          <Separator />
          <Section title="Telecom">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {practitioner.telecom.map((t, i) => (
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

      {/* ── Addresses ── */}
      {practitioner.address && practitioner.address.length > 0 && (
        <>
          <Separator />
          <Section title="Addresses">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {practitioner.address.map((a, i) => {
                const composed = [
                  a.line?.join(", "),
                  a.city,
                  a.state,
                  a.postal_code,
                  a.country,
                ]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <div key={a.id ?? i} className="text-sm space-y-0.5">
                    {a.use && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {a.use}
                      </Badge>
                    )}
                    <p className="text-muted-foreground">{a.text || composed || "—"}</p>
                  </div>
                );
              })}
            </div>
          </Section>
        </>
      )}

      {/* ── Photo ── */}
      {practitioner.photo && practitioner.photo.length > 0 && (
        <>
          <Separator />
          <Section title="Photo">
            <div className="flex flex-wrap gap-3">
              {practitioner.photo.map((p, i) =>
                p.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={p.id ?? i}
                    src={p.url}
                    alt={p.title ?? "Practitioner photo"}
                    className="h-16 w-16 rounded-full object-cover border"
                  />
                ) : (
                  <Badge key={p.id ?? i} variant="outline">
                    {p.title ?? "Photo"}
                  </Badge>
                ),
              )}
            </div>
          </Section>
        </>
      )}

      {/* ── Qualifications ── */}
      {practitioner.qualification && practitioner.qualification.length > 0 && (
        <>
          <Separator />
          <Section title="Qualifications">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {practitioner.qualification.map((q, i) => (
                <div key={q.id ?? i} className="text-sm space-y-0.5">
                  <p className="font-medium">
                    {q.code_display ?? q.code_text ?? q.code_code ?? "Unknown"}
                  </p>
                  {q.issuer_display && (
                    <p className="text-muted-foreground">{q.issuer_display}</p>
                  )}
                  {(q.period_start || q.period_end) && (
                    <p className="text-muted-foreground text-xs">
                      {q.period_start ?? "…"} – {q.period_end ?? "…"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Communications ── */}
      {practitioner.communication && practitioner.communication.length > 0 && (
        <>
          <Separator />
          <Section title="Communication">
            <div className="flex flex-wrap gap-2">
              {practitioner.communication.map((c, i) => (
                <Badge key={c.id ?? i} variant={c.preferred ? "default" : "outline"}>
                  {c.language_display ?? c.language_text ?? c.language_code ?? "Unknown"}
                  {c.preferred ? " (preferred)" : ""}
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
