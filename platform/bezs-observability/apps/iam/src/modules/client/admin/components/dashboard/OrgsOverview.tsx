import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users } from "lucide-react";
import type { TOrganizationSummarySchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";

interface OrgsOverviewProps {
  organizations: TOrganizationSummarySchema[];
}

export function OrgsOverview({ organizations }: OrgsOverviewProps) {
  const shown = organizations.slice(0, 4);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Organizations</CardTitle>
        <CardDescription>Active tenants</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {shown.map((org) => {
          const initial = org.name[0]?.toUpperCase() ?? "?";
          return (
            <div key={org.id} className="flex items-center gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-none">
                  {org.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  /{org.slug}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                {org.memberCount}
              </div>
            </div>
          );
        })}
        {organizations.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No organizations yet</p>
        )}
      </CardContent>
    </Card>
  );
}
