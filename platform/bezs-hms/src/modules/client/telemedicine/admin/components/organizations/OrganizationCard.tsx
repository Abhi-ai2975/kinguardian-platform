/**
 * OrganizationCard — card/grid view renderer for a single Organization row.
 *
 * Layer: client / telemedicine / admin / components
 * Resource: Organization
 *
 * Used by DataTableWithViews as the `renderCard` prop. Mirrors the same
 * information density as the table row: name, type badge, active status,
 * contact, location, and row actions.
 *
 * Row actions call the admin store directly (same as the table columns),
 * so no props are needed beyond the TanStack Row.
 */

import React from "react";
import { Row } from "@tanstack/react-table";
import { Building2, Mail, MapPin, Phone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableRowActions } from "@/modules/client/shared/components/tables";
import { TOrgResponse } from "@/modules/entities/schemas/organization";
import { ORG_ROW_ACTIONS, ORG_TYPE_OPTIONS } from "./OrganizationsTableColumn";

/**
 * Renders one Organization as a card for the grid view.
 * Receives the full TanStack Row so it has access to `row.original`.
 *
 * @param row - TanStack Row containing the Organization record.
 */
export function OrganizationCard({ row }: { row: Row<TOrgResponse> }) {
  const org = row.original;

  /** Resolve a human-readable label from the first org type's coding_code. */
  const typeLabel =
    org.type?.[0]?.coding_display ??
    ORG_TYPE_OPTIONS.find((o) => o.value === org.type?.[0]?.coding_code)?.label ??
    org.type?.[0]?.coding_code ??
    null;

  /** First phone number, falling back to first email. */
  const phone = org.telecom?.find((t) => t.system === "phone")?.value;
  const email = org.telecom?.find((t) => t.system === "email")?.value;

  /** City + state from the first address. */
  const addr = org.address?.[0];
  const location = [addr?.city, addr?.state].filter(Boolean).join(", ");

  return (
    <Card className="hover:shadow-md transition-shadow flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          {/* Icon + name + type */}
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold leading-tight truncate">
                {org.name ?? "Unnamed Organization"}
              </CardTitle>
              {typeLabel && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  {typeLabel}
                </Badge>
              )}
            </div>
          </div>
          {/* Row actions menu — same actions as the table view */}
          <DataTableRowActions row={row} actions={ORG_ROW_ACTIONS} />
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-2 flex-1">
        {/* Active / Inactive status */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Status</span>
          {org.active !== undefined ? (
            <Badge
              variant={org.active ? "default" : "secondary"}
              className="text-xs"
            >
              {org.active ? "Active" : "Inactive"}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>

        {/* Parent org */}
        {org.partof_display && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{org.partof_display}</span>
          </div>
        )}

        {/* Phone */}
        {phone && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="h-3 w-3 shrink-0" />
            <span>{phone}</span>
          </div>
        )}

        {/* Email (only if no phone, or show both) */}
        {email && !phone && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{email}</span>
          </div>
        )}

        {/* Location */}
        {location && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span>{location}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
