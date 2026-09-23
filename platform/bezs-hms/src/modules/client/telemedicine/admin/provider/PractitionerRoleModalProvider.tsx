/**
 * PractitionerRoleModalProvider — mounts all PractitionerRole admin modals once.
 *
 * Layer: client / telemedicine / admin / provider
 * Resource: PractitionerRole
 *
 * Pattern mirrors ScheduleModalProvider. A mount guard (isMounted) ensures
 * modals are never rendered during SSR — the Zustand store relies on browser
 * APIs and must not hydrate on the server.
 *
 * Usage: render <PractitionerRoleModalProvider /> once per layout/page that
 * hosts the practitioner roles table. Modals are controlled entirely by the
 * admin store; no props needed here or in the modal components.
 */

"use client";

import { useEffect, useState } from "react";
import { CreatePractitionerRoleModal } from "../modals/practitioner-roles/CreatePractitionerRoleModal";
import { EditPractitionerRoleModal } from "../modals/practitioner-roles/EditPractitionerRoleModal";
import { DeletePractitionerRoleModal } from "../modals/practitioner-roles/DeletePractitionerRoleModal";

/**
 * Renders all three PractitionerRole modals as client-only singletons.
 * The mount guard prevents hydration mismatches when the page is server-rendered.
 */
export function PractitionerRoleModalProvider() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <>
      <CreatePractitionerRoleModal />
      <EditPractitionerRoleModal />
      <DeletePractitionerRoleModal />
    </>
  );
}
