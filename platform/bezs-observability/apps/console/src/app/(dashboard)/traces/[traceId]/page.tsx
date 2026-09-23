// traces/[traceId]/page.tsx — full trace detail page.
// Fetches every span that shares the given trace_id, then renders them as
// an interactive span tree. Clicking a span opens its detail sheet.
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getServerSession } from "@/lib/auth-server";
import { queryTraceSpans } from "@/lib/clickhouse";
import { TraceSpanTree } from "@/components/explorer/TraceSpanTree";

export const dynamic = "force-dynamic";

export default async function TraceDetailPage({
  params,
}: {
  params: Promise<{ traceId: string }>;
}) {
  const session = await getServerSession();
  const orgId = session?.session.activeOrganizationId ?? "";

  const { traceId } = await params;
  const spans = await queryTraceSpans(orgId, traceId);

  if (spans.length === 0) notFound();

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/traces"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Traces
        </Link>

        <h1 className="text-2xl font-bold font-mono break-all leading-tight">
          {traceId}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Distributed trace</p>
      </div>

      <TraceSpanTree spans={spans} />
    </div>
  );
}
