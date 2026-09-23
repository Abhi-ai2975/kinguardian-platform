// Traces explorer page — shows distributed trace spans.
// Reads the watcher_app cookie to filter by the currently selected app.
import { cookies } from "next/headers";
import { getServerSession } from "@/lib/auth-server";
import { EventsExplorer } from "@/components/explorer/EventsExplorer";

export const dynamic = "force-dynamic";

export default async function TracesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await getServerSession();
  const orgId = session?.session.activeOrganizationId ?? "";
  const jar = await cookies();
  const activeAppId = jar.get("watcher_app")?.value ?? null;

  const sp = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Traces</h1>
        <p className="text-sm text-muted-foreground">
          Distributed trace spans with full context propagation
        </p>
      </div>
      <EventsExplorer
        orgId={orgId}
        eventType="trace"
        searchParams={sp}
        apiPath="/api/events/traces"
        appId={activeAppId}
      />
    </div>
  );
}
