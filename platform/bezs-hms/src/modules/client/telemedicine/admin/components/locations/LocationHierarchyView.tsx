/**
 * LocationHierarchyView — tree visualization of the Location partOf
 * hierarchy for the current tenant.
 *
 * Layer: client / telemedicine / admin / components / locations
 *
 * fhir-gql has no children/tree endpoint for Location — this view fetches
 * every location for the tenant (looping the list action at the max page
 * size) and builds the tree client-side from `part_of_id` via HierarchyGraph.
 * Shares its query cache key (`locationKeys.allForOrg`) with the Location
 * form's part_of picker, which needs the same full flat list since
 * fhir-gql's list endpoint has no name filter to search remotely.
 * Clicking a node opens the existing Edit Location modal.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { TLocationResponse } from "@/modules/entities/schemas/location";
import { HierarchyGraph } from "../hierarchy";
import { locationKeys, fetchAllLocations } from "../../queries/location.queries";
import { useAdminStore } from "../../stores/admin.store";

/** Renders one Location node's card content: name, status badge, physical type. */
function renderLocationNode(location: TLocationResponse) {
  const statusVariant =
    location.status === "active"
      ? "default"
      : location.status === "suspended"
        ? "secondary"
        : "outline";
  const physicalType = location.physical_type_display ?? location.physical_type_code;
  const address = [location.address_city, location.address_state].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">
          {location.name ?? "Unnamed Location"}
        </span>
        {location.status && (
          <Badge variant={statusVariant} className="shrink-0 capitalize">
            {location.status}
          </Badge>
        )}
      </div>
      {physicalType && (
        <Badge variant="outline" className="w-fit text-xs font-normal">
          {physicalType}
        </Badge>
      )}
      {address && <span className="text-xs text-muted-foreground">{address}</span>}
    </div>
  );
}

interface LocationHierarchyViewProps {
  /** Active organization ID from the session — scopes the fetch to the current tenant. */
  orgId: string | null;
}

/** Fetches every location for the tenant and renders the part_of tree. */
export function LocationHierarchyView({ orgId }: LocationHierarchyViewProps) {
  const openModal = useAdminStore((s) => s.onOpen);

  const { data, isLoading } = useQuery({
    queryKey: locationKeys.allForOrg(orgId),
    queryFn: () => fetchAllLocations(orgId),
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
    <HierarchyGraph<TLocationResponse>
      items={data ?? []}
      getId={(location) => String(location.id)}
      getParentId={(location) => location.part_of_id ?? null}
      renderNode={renderLocationNode}
      onNodeClick={(location) =>
        openModal({
          type: "editLocation",
          data: { location, locationId: location.id },
        })
      }
      emptyMessage="No locations found for this tenant."
    />
  );
}
