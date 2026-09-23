import SubscriptionsTable from "@/modules/client/admin/components/billing/SubscriptionsTable";
import { listSubscriptionsAction } from "@/modules/server/presentation/actions/admin";
import { requireRole } from "@/modules/server/shared/auth/require-role";

async function BillingPage() {
  await requireRole(["superadmin"]);

  const [subscriptions, error] = await listSubscriptionsAction();

  return (
    <div className="space-y-8 w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Billing & Subscriptions</h1>
        <p className="text-sm text-muted-foreground">
          Manage Stripe subscriptions across all users and organizations.
        </p>
      </div>
      <SubscriptionsTable subscriptions={subscriptions} error={error} />
    </div>
  );
}

export default BillingPage;
