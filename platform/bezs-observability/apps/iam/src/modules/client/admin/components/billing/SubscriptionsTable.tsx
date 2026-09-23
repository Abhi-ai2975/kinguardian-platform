"use client";

import { AlertTriangle, CreditCard } from "lucide-react";
import { EmptyState } from "@/modules/client/shared/components/EmptyState";
import DataTable from "@/modules/client/shared/components/table/data-table";
import type { ISubscriptionsTableProps } from "../../types/billing.type";
import { subscriptionsTableColumn } from "./SubscriptionsTableColumn";

function SubscriptionsTable({ subscriptions, error }: ISubscriptionsTableProps) {
  if (error) {
    return (
      <EmptyState
        icon={<AlertTriangle className="text-destructive" />}
        title="An Unexpected Error Occurred!"
        description={error.message || "Please try again later."}
        buttonLabel="Reload"
        error={error}
      />
    );
  }

  if (!subscriptions || subscriptions.length === 0) {
    return (
      <EmptyState
        icon={<CreditCard />}
        title="No Subscriptions Found"
        description="Subscriptions created via Stripe checkout will appear here."
      />
    );
  }

  return (
    <DataTable
      columns={subscriptionsTableColumn()}
      data={subscriptions}
      dataSize={subscriptions.length}
      label="Subscription"
      searchField="userEmail"
      fallbackText="No Subscriptions Found"
    />
  );
}

export default SubscriptionsTable;
