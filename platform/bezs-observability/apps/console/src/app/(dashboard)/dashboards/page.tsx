// Dashboards list page — shows all org dashboards and lets users create new ones.
// Session is read server-side so the client component receives a resolved orgId
// without needing to call the auth client from the browser.
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";
import { DashboardListClient } from "@/components/dashboard-builder/DashboardListClient";

export const dynamic = "force-dynamic";

export default async function DashboardsPage() {
  const session = await getServerSession();

  if (!session) redirect("/login");

  const orgId = session.session.activeOrganizationId;

  if (!orgId) redirect("/onboarding/create-org");

  return <DashboardListClient orgId={orgId} />;
}
