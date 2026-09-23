import { getAllSessionsAction } from "@/modules/server/presentation/actions/admin/sessions.action";
import { requireRole } from "@/modules/server/shared/auth/require-role";
import SessionsTable from "@/modules/client/admin/components/sessions/SessionsTable";

async function SessionsPage() {
  await requireRole(["superadmin"]);

  const [sessions, error] = await getAllSessionsAction();

  return (
    <div className="space-y-8 w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Sessions</h1>
        <p className="text-sm text-muted-foreground">
          View and manage all active sessions across every user.
        </p>
      </div>
      <SessionsTable sessions={sessions ?? null} error={error ?? null} />
    </div>
  );
}

export default SessionsPage;
