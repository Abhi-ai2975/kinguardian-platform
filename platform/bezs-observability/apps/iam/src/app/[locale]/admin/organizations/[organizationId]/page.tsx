import { getOrganizationAction } from "@/modules/server/presentation/actions/admin/organizations.action";
import { requireRole } from "@/modules/server/shared/auth/require-role";
import OrganizationDetail from "@/modules/client/admin/components/organizations/OrganizationDetail";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OrganizationDetailPageProps {
  params: Promise<{ organizationId: string }>;
}

async function OrganizationDetailPage({ params }: OrganizationDetailPageProps) {
  await requireRole(["superadmin"]);

  const { organizationId } = await params;
  const [organization, error] = await getOrganizationAction({ organizationId });

  const orgName = organization?.name ?? "Organization";

  return (
    <div className="space-y-8 w-full">
      <div className="space-y-3">
        <Link
          href="/admin/organizations"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "gap-1 text-muted-foreground -ml-2",
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Organizations
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{orgName}</h1>
          <p className="text-sm text-muted-foreground">
            Manage members, invitations, and teams for this organization.
          </p>
        </div>
      </div>

      <OrganizationDetail organization={organization ?? null} error={error ?? null} />
    </div>
  );
}

export default OrganizationDetailPage;
