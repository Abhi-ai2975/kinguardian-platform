/**
 * OrganizationDetailPanel — row-expand detail component for the Organizations table.
 *
 * Layer: client / telemedicine / admin
 * Resource: Organization
 *
 * Renders the full organization record in a structured panel when a table row is
 * expanded. Sections: Overview, Types, Contact Points, Addresses, Contacts, Aliases.
 */

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TOrgResponse } from "@/modules/entities/schemas/organization";
import { Row } from "@tanstack/react-table";

/** Maps FHIR org type codes to readable labels. */
const ORG_TYPE_LABELS: Record<string, string> = {
  prov: "Healthcare Provider",
  dept: "Hospital Department",
  team: "Organizational Team",
  govt: "Government",
  ins: "Insurance Company",
  pay: "Payer",
  edu: "Educational Institute",
  reli: "Religious Institution",
  crs: "Clinical Research Sponsor",
  cg: "Community Group",
  bus: "Non-Healthcare Business",
  other: "Other",
};

interface OrganizationDetailPanelProps {
  /** TanStack row containing the full TOrgResponse. */
  row: Row<TOrgResponse>;
}

/**
 * Full-width expandable detail panel rendered below a table row.
 * Shows all sub-resource arrays that are not visible in the main columns.
 *
 * @param row - The TanStack table row with the organization data.
 */
export function OrganizationDetailPanel({ row }: OrganizationDetailPanelProps) {
  const org = row.original;

  return (
    <div className="p-4 bg-muted/30 border-t space-y-5">
      {/* ── Overview ── */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:grid-cols-4">
        <DetailField label="ID" value={String(org.id)} />
        <DetailField label="Name" value={org.name} />
        <DetailField
          label="Active"
          value={
            org.active !== undefined ? (
              <Badge variant={org.active ? "default" : "secondary"}>
                {org.active ? "Active" : "Inactive"}
              </Badge>
            ) : undefined
          }
        />
        <DetailField label="Parent Org" value={org.partof_display} />
        <DetailField label="Created" value={formatDate(org.created_at)} />
        <DetailField label="Updated" value={formatDate(org.updated_at)} />
        <DetailField label="Created By" value={org.created_by} />
      </div>

      {/* ── Types ── */}
      {org.type && org.type.length > 0 && (
        <>
          <Separator />
          <Section title="Organization Types">
            <div className="flex flex-wrap gap-2">
              {org.type.map((t) => (
                <Badge key={t.id} variant="outline">
                  {t.coding_display ??
                    (t.coding_code
                      ? (ORG_TYPE_LABELS[t.coding_code] ?? t.coding_code)
                      : t.text) ??
                    "Unknown"}
                </Badge>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Aliases ── */}
      {org.alias && org.alias.length > 0 && (
        <>
          <Separator />
          <Section title="Aliases">
            <div className="flex flex-wrap gap-2">
              {org.alias.map((a) => (
                <Badge key={a.id} variant="secondary">
                  {a.value}
                </Badge>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Contact Points (Telecom) ── */}
      {org.telecom && org.telecom.length > 0 && (
        <>
          <Separator />
          <Section title="Contact Points">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {org.telecom.map((t) => (
                <div key={t.id} className="text-sm space-y-0.5">
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
      {org.address && org.address.length > 0 && (
        <>
          <Separator />
          <Section title="Addresses">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {org.address.map((a) => (
                <div key={a.id} className="text-sm space-y-0.5">
                  {a.use && (
                    <Badge variant="outline" className="capitalize text-xs">
                      {a.use}
                    </Badge>
                  )}
                  {a.line && <p>{a.line.join(", ")}</p>}
                  <p className="text-muted-foreground">
                    {[a.city, a.state, a.postal_code, a.country]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Contacts ── */}
      {org.contact && org.contact.length > 0 && (
        <>
          <Separator />
          <Section title="Contacts">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {org.contact.map((c) => (
                <div key={c.id} className="text-sm space-y-1">
                  {c.purpose_display && (
                    <Badge variant="outline" className="text-xs">
                      {c.purpose_display}
                    </Badge>
                  )}
                  {c.name_text && (
                    <p className="font-medium">{c.name_text}</p>
                  )}
                  {c.name_family && !c.name_text && (
                    <p className="font-medium">
                      {[...(c.name_given ?? []), c.name_family].join(" ")}
                    </p>
                  )}
                  {c.telecoms?.map((t) => (
                    <p key={t.id} className="text-muted-foreground">
                      {t.system}: {t.value}
                    </p>
                  ))}
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
function formatDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  return new Date(iso).toLocaleString();
}
