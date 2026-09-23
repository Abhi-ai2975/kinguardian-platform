import { notFound } from "next/navigation";
import { requireRole } from "@/modules/server/shared/auth/require-role";
import {
  getOrganizationAction,
  listOrgRolesAction,
} from "@/modules/server/presentation/actions/admin/organizations.action";
import OrgRolesTable from "@/modules/client/admin/components/organizations/OrgRolesTable";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OrgRolesPageProps {
  params: Promise<{ organizationId: string }>;
}

async function OrgRolesPage({ params }: OrgRolesPageProps) {
  await requireRole(["superadmin"]);

  const { organizationId } = await params;

  const [[orgDetail, orgError], [roles, rolesError]] = await Promise.all([
    getOrganizationAction({ organizationId }),
    listOrgRolesAction({ organizationId }),
  ]);

  if (orgError || !orgDetail) notFound();

  return (
    <div className="space-y-8 w-full">
      <div className="space-y-3">
        <Link
          href={`/admin/organizations/${organizationId}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "gap-1 text-muted-foreground -ml-2",
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          Back to {orgDetail.name}
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{orgDetail.name} — Roles</h1>
          <p className="text-sm text-muted-foreground">
            Manage custom roles and permission assignments for this organization.
          </p>
        </div>
      </div>
      <OrgRolesTable
        roles={roles ?? null}
        organizationId={organizationId}
        error={rolesError ?? null}
      />
    </div>
  );
}

export default OrgRolesPage;
