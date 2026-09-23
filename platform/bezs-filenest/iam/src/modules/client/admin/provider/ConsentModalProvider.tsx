"use client";

import { useSyncExternalStore } from "react";
import { DeleteConsentModal } from "../modals/consents/DeleteConsentModal";
import { UpdateConsentScopesModal } from "../modals/consents/UpdateConsentScopesModal";

export const ConsentModalProvider = () => {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!isMounted) return null;

  return (
    <>
      <DeleteConsentModal />
      <UpdateConsentScopesModal />
    </>
  );
};
