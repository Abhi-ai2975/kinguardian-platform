"use client";

import { useSyncExternalStore } from "react";
import { CreateOAuthClientModal } from "../modals/oauth-clients/CreateOAuthClientModal";
import { EditOAuthClientModal } from "../modals/oauth-clients/EditOAuthClientModal";
import { DeleteOAuthClientModal } from "../modals/oauth-clients/DeleteOAuthClientModal";
import { RotateSecretModal } from "../modals/oauth-clients/RotateSecretModal";

export const OAuthClientModalProvider = () => {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!isMounted) return null;

  return (
    <>
      <CreateOAuthClientModal />
      <EditOAuthClientModal />
      <DeleteOAuthClientModal />
      <RotateSecretModal />
    </>
  );
};
