"use client";

import { useSyncExternalStore } from "react";
import { useAdminStore } from "../stores/admin.store";
import { CreateApiKeyModal } from "../modals/api-keys/CreateApiKeyModal";
import { EditApiKeyModal } from "../modals/api-keys/EditApiKeyModal";
import { DeleteApiKeyModal } from "../modals/api-keys/DeleteApiKeyModal";

export function ApiKeyModalProvider() {
  const isOpen = useSyncExternalStore(
    useAdminStore.subscribe,
    () => useAdminStore.getState().isOpen,
    () => false,
  );

  if (!isOpen) return null;

  return (
    <>
      <CreateApiKeyModal />
      <EditApiKeyModal />
      <DeleteApiKeyModal />
    </>
  );
}
