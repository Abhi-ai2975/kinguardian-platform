/**
 * OrganizationModalProvider — mounts all Organization admin modals once.
 *
 * Layer: client / telemedicine / admin / provider
 * Resource: Organization
 *
 * Pattern mirrors nextjs-iam's modal provider. A mount guard (isMounted) ensures
 * modals are never rendered during SSR — the Zustand store relies on browser APIs
 * and must not hydrate on the server.
 *
 * Usage: render <OrganizationModalProvider /> once per layout/page that hosts the
 * organizations table. Modals are controlled entirely by the admin store; no props
 * needed here or in the modal components.
 */

"use client";

import { useEffect, useState } from "react";
import { CreateOrganizationModal } from "../modals/organizations/CreateOrganizationModal";
import { EditOrganizationModal } from "../modals/organizations/EditOrganizationModal";
import { DeleteOrganizationModal } from "../modals/organizations/DeleteOrganizationModal";

/**
 * Renders all three Organization modals as client-only singletons.
 * The mount guard prevents hydration mismatches when the page is server-rendered.
 */
export function OrganizationModalProvider() {
  /**
   * Deferred mount: skip rendering on the first server-rendered pass.
   * Without this guard, Zustand's client-only store would mismatch the server HTML.
   */
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <>
      <CreateOrganizationModal />
      <EditOrganizationModal />
      <DeleteOrganizationModal />
    </>
  );
}
