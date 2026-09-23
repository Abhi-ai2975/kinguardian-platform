/**
 * WebhookModalProvider — mounts all webhook modals once, client-only.
 *
 * The isMounted guard prevents SSR rendering of modals that depend on
 * client-only state (Zustand store, useServerAction). Render once per
 * webhooks page, passing projectId so modals can build action payloads.
 *
 * @module
 */
"use client";

import { useEffect, useState } from "react";
import { CreateWebhookModal } from "../modals/CreateWebhookModal";
import { DeleteWebhookModal } from "../modals/DeleteWebhookModal";

interface WebhookModalProviderProps {
  projectId: string;
}

export function WebhookModalProvider({ projectId }: WebhookModalProviderProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <>
      <CreateWebhookModal projectId={projectId} />
      <DeleteWebhookModal projectId={projectId} />
    </>
  );
}
