// Dashboard editor page — full-page view/edit experience for a single dashboard.
// orgId is resolved server-side and passed to the client editor so widgets
// can scope their ClickHouse queries without an extra auth round-trip.
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";
import { DashboardEditor } from "@/components/dashboard-builder/DashboardEditor";

export const dynamic = "force-dynamic";

export default async function DashboardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession();

  if (!session) redirect("/login");

  const orgId = session.session.activeOrganizationId;

  if (!orgId) redirect("/onboarding/create-org");

  const { id } = await params;

  return <DashboardEditor id={id} orgId={orgId} />;
}
