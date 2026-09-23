/**
 * PractitionerModalProvider — mounts all Practitioner admin modals once.
 *
 * Layer: client / telemedicine / admin / provider
 * Resource: Practitioner
 *
 * Pattern mirrors PractitionerRoleModalProvider. A mount guard (isMounted)
 * ensures modals are never rendered during SSR — the Zustand store relies
 * on browser APIs and must not hydrate on the server.
 *
 * Usage: render <PractitionerModalProvider /> once per layout/page that
 * hosts the practitioners table. Modals are controlled entirely by the
 * admin store; no props needed here or in the modal components.
 */

"use client";

import { useEffect, useState } from "react";
import { CreatePractitionerModal } from "../modals/practitioners/CreatePractitionerModal";
import { EditPractitionerModal } from "../modals/practitioners/EditPractitionerModal";
import { DeletePractitionerModal } from "../modals/practitioners/DeletePractitionerModal";

/**
 * Renders all three Practitioner modals as client-only singletons.
 * The mount guard prevents hydration mismatches when the page is server-rendered.
 */
export function PractitionerModalProvider() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <>
      <CreatePractitionerModal />
      <EditPractitionerModal />
      <DeletePractitionerModal />
    </>
  );
}
