// AI Events page — shows all AI agent telemetry events (LLM calls, tool calls,
// workflow steps, retrievals, evals) filtered from the watcher.events table.
import { cookies } from "next/headers";
import { getServerSession } from "@/lib/auth-server";
import { AIEventsExplorer } from "@/components/explorer/AIEventsExplorer";

export const dynamic = "force-dynamic";

export default async function AIPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await getServerSession();
  const orgId = session?.session.activeOrganizationId ?? "";
  const jar = await cookies();
  const activeAppId = jar.get("watcher_app")?.value ?? null;

  await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Events</h1>
        <p className="text-sm text-muted-foreground">
          LLM calls, tool executions, agent workflow steps, retrievals, and evals
        </p>
      </div>
      <AIEventsExplorer orgId={orgId} appId={activeAppId} />
    </div>
  );
}
