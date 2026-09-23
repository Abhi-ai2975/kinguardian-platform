"use client";

import { useSyncExternalStore } from "react";
import { SetUserContextModal } from "../modals/user-context/SetUserContextModal";

export const UserContextModalProvider = () => {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!isMounted) return null;

  return (
    <>
      <SetUserContextModal />
    </>
  );
};
