"use client";

import { useSyncExternalStore } from "react";
import { CreateResourceModal } from "../modals/resources/CreateResourceModal";
import { EditResourceModal } from "../modals/resources/EditResourceModal";
import { DeleteResourceModal } from "../modals/resources/DeleteResourceModal";
import { CreateResourceActionModal } from "../modals/resources/CreateResourceActionModal";
import { EditResourceActionModal } from "../modals/resources/EditResourceActionModal";
import { DeleteResourceActionModal } from "../modals/resources/DeleteResourceActionModal";

export const ResourceModalProvider = () => {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!isMounted) return null;

  return (
    <>
      <CreateResourceModal />
      <EditResourceModal />
      <DeleteResourceModal />
      <CreateResourceActionModal />
      <EditResourceActionModal />
      <DeleteResourceActionModal />
    </>
  );
};
