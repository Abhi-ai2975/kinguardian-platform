/**
 * OrgSwitcher — header dropdown to switch between organisations.
 *
 * Fetches the org list from the IAM via TanStack Query on mount so the
 * list is always fresh without blocking the server render. Switching calls
 * the IAM internal endpoint through the console's proxy route.
 *
 * @module
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/modules/client/auth/auth-client";
import { useQuery } from "@tanstack/react-query";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

interface Org {
  id: string;
  name: string;
  slug: string;
}

interface OrgSwitcherProps {
  activeOrgId: string;
}

export function OrgSwitcher({ activeOrgId }: OrgSwitcherProps) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  const { data: orgs, isLoading } = useQuery<Org[]>({
    queryKey: ["organizations"],
    queryFn: async () => {
      const iamUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "";
      const res = await fetch(`${iamUrl}/api/auth/organization/list`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.organizations ?? []);
    },
  });

  const activeOrg = orgs?.find((o) => o.id === activeOrgId);

  async function handleSwitch(orgId: string) {
    if (orgId === activeOrgId || switching) return;
    setSwitching(true);
    await authClient.organization.setActive({ organizationId: orgId });
    router.refresh();
    setSwitching(false);
  }

  if (isLoading) return <Skeleton className="h-8 w-36" />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={switching}
          className="gap-2 max-w-[200px]"
        >
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {activeOrg?.name ?? activeOrgId.slice(0, 8)}
          </span>
          <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {orgs?.map((org) => (
          <DropdownMenuItem
            key={org.id}
            disabled={switching}
            onSelect={() => handleSwitch(org.id)}
            className="gap-2 cursor-pointer"
          >
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate flex-1">{org.name}</span>
            {org.id === activeOrgId && (
              <Check className="h-4 w-4 shrink-0 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/onboarding/create-org" className="gap-2 cursor-pointer">
            <Plus className="h-4 w-4" />
            New organisation
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
