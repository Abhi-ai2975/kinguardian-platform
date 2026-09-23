/**
 * OrganizationHierarchyView — tree visualization of the Organization
 * partOf hierarchy for the current tenant.
 *
 * Layer: client / telemedicine / admin / components / organizations
 *
 * fhir-gql has no children/tree endpoint for Organization — this view fetches
 * every organization for the tenant (looping the list action at the max page
 * size) and builds the tree client-side from `partof_id` via HierarchyGraph.
 * Clicking a node opens the existing Edit Organization modal — cheap reuse
 * of the admin store already wired for the Organizations table.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { TOrgResponse } from "@/modules/entities/schemas/organization";
import { HierarchyGraph } from "../hierarchy";
import { organizationKeys, fetchAllOrganizations } from "../../queries/organization.queries";
import { useAdminStore } from "../../stores/admin.store";

/** Renders one Organization node's card content: name, active badge, type. */
function renderOrganizationNode(org: TOrgResponse) {
  const typeLabel = org.type?.[0]?.coding_display ?? org.type?.[0]?.coding_code;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{org.name ?? "Unnamed"}</span>
        <Badge variant={org.active ? "default" : "secondary"} className="shrink-0">
          {org.active ? "Active" : "Inactive"}
        </Badge>
      </div>
      {typeLabel && (
        <Badge variant="outline" className="w-fit text-xs font-normal">
          {typeLabel}
        </Badge>
      )}
    </div>
  );
}

interface OrganizationHierarchyViewProps {
  /** Active organization ID from the session — scopes the fetch to the current tenant. */
  orgId: string | null;
}

/** Fetches every organization for the tenant and renders the partOf tree. */
export function OrganizationHierarchyView({ orgId }: OrganizationHierarchyViewProps) {
  const openModal = useAdminStore((s) => s.onOpen);

  const { data, isLoading } = useQuery({
    queryKey: organizationKeys.allForOrg(orgId),
    queryFn: () => fetchAllOrganizations(orgId),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex h-[70vh] w-full items-center justify-center rounded-md border border-dashed">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <HierarchyGraph<TOrgResponse>
      items={data ?? []}
      getId={(org) => String(org.id)}
      getParentId={(org) => (org.partof_id != null ? String(org.partof_id) : null)}
      renderNode={renderOrganizationNode}
      onNodeClick={(org) =>
        openModal({
          type: "editOrganization",
          data: { organization: org, organizationId: org.id },
        })
      }
      emptyMessage="No organizations found for this tenant."
    />
  );
}
