"use client";

import { useSyncExternalStore } from "react";
import { RevokeSessionModal } from "../modals/sessions/RevokeSessionModal";
import { RevokeAllSessionsModal } from "../modals/sessions/RevokeAllSessionsModal";

export const SessionModalProvider = () => {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!isMounted) return null;

  return (
    <>
      <RevokeSessionModal />
      <RevokeAllSessionsModal />
    </>
  );
};
