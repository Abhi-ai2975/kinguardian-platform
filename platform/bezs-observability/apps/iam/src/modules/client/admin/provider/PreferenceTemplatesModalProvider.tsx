"use client";

import { useSyncExternalStore } from "react";
import { CreatePreferenceTemplateModal } from "../modals/preference-templates/CreatePreferenceTemplateModal";
import { UpdatePreferenceTemplateModal } from "../modals/preference-templates/UpdatePreferenceTemplateModal";
import { DeletePreferenceTemplateModal } from "../modals/preference-templates/DeletePreferenceTemplateModal";

export const PreferenceTemplatesModalProvider = () => {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!isMounted) return null;

  return (
    <>
      <CreatePreferenceTemplateModal />
      <UpdatePreferenceTemplateModal />
      <DeletePreferenceTemplateModal />
    </>
  );
};
