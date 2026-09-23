// Notifications page — full list of in-app notifications for the org.
// Shows all notifications (read and unread) with severity, status, and timestamp.
// The header bell shows only the 20 most recent; this page shows everything.
import { getServerSession } from "@/lib/auth-server";
import { NotificationsExplorer } from "@/components/notifications/NotificationsExplorer";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await getServerSession();
  const orgId = session?.session.activeOrganizationId ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          System alerts, activity updates, and platform messages
        </p>
      </div>
      <NotificationsExplorer orgId={orgId} />
    </div>
  );
}
