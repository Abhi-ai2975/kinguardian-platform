/**
 * WebhooksPage — lists and manages webhook endpoints for the active project.
 *
 * Server component: fetches the webhook list via listWebhooksAction and passes
 * the result as initialData to WebhooksTable. The client table handles create,
 * edit, and delete via modals; post-mutation refresh is driven by TanStack Query
 * cache invalidation in the webhook store trigger effect.
 *
 * @module
 */
import { listWebhooksAction } from "@/modules/server/presentation/actions/webhook.actions";
import { WebhooksTable } from "@/modules/client/webhooks/components/WebhooksTable";
import { WebhookModalProvider } from "@/modules/client/webhooks/provider/WebhookModalProvider";

interface WebhooksPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function WebhooksPage({ params }: WebhooksPageProps) {
  const { projectId } = await params;

  const [data] = await listWebhooksAction({
    payload: { projectId },
  });

  const initialData = data ?? { items: [], total: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Webhooks</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {initialData.total} webhook endpoint
          {initialData.total !== 1 ? "s" : ""} in this project
        </p>
      </div>

      <WebhooksTable projectId={projectId} initialData={initialData} />

      <WebhookModalProvider projectId={projectId} />
    </div>
  );
}
