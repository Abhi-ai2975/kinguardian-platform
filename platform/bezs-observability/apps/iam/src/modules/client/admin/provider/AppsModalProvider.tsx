"use client";

import { useSyncExternalStore } from "react";
import { CreateAppModal } from "../modals/apps/CreateAppModal";
import { EditAppModal } from "../modals/apps/EditAppModal";
import { DeleteAppModal } from "../modals/apps/DeleteAppModal";
import { CreateMenuNodeModal } from "../modals/apps/CreateMenuNodeModal";
import { EditMenuNodeModal } from "../modals/apps/EditMenuNodeModal";
import { DeleteMenuNodeModal } from "../modals/apps/DeleteMenuNodeModal";

export const AppsModalProvider = () => {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!isMounted) return null;

  return (
    <>
      <CreateAppModal />
      <EditAppModal />
      <DeleteAppModal />
      <CreateMenuNodeModal />
      <EditMenuNodeModal />
      <DeleteMenuNodeModal />
    </>
  );
};
