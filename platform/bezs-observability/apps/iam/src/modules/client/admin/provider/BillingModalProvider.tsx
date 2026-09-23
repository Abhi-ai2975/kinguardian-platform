"use client";

import { useSyncExternalStore } from "react";
import { CancelSubscriptionModal } from "../modals/billing/CancelSubscriptionModal";

// useSyncExternalStore guards against SSR/client hydration mismatches —
// modals are never rendered on the server.
function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function BillingModalProvider() {
  const isClient = useIsClient();
  if (!isClient) return null;

  return (
    <>
      <CancelSubscriptionModal />
    </>
  );
}
