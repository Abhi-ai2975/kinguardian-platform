// ai/traces/[traceId]/page.tsx — AI-specific trace detail page.
// Navigated to from the AI Events explorer when the user clicks "View full trace"
// on an AI event. Shows the same TraceSpanTree as /traces/[traceId] but with a
// breadcrumb back to /ai instead of /traces, keeping the AI observability flow
// self-contained.
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getServerSession } from "@/lib/auth-server";
import { queryTraceSpans } from "@/lib/clickhouse";
import { TraceSpanTree } from "@/components/explorer/TraceSpanTree";

export const dynamic = "force-dynamic";

export default async function AITraceDetailPage({
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
      {/* Breadcrumb — back to AI Events, not the general Traces list */}
      <div>
        <Link
          href="/ai"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          AI Events
        </Link>

        <h1 className="text-2xl font-bold font-mono break-all leading-tight">
          {traceId}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">AI agent trace</p>
      </div>

      <TraceSpanTree spans={spans} />
    </div>
  );
}
