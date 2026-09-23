/**
 * LocationModalProvider — mounts all Location admin modals once.
 *
 * Layer: client / telemedicine / admin / provider
 * Resource: Location
 *
 * Pattern mirrors OrganizationModalProvider. A mount guard (isMounted) ensures
 * modals are never rendered during SSR — the Zustand store relies on browser
 * APIs and must not hydrate on the server.
 *
 * Usage: render <LocationModalProvider /> once per layout/page that hosts the
 * locations table. Modals are controlled entirely by the admin store; no
 * props needed here or in the modal components.
 */

"use client";

import { useEffect, useState } from "react";
import { CreateLocationModal } from "../modals/locations/CreateLocationModal";
import { EditLocationModal } from "../modals/locations/EditLocationModal";
import { DeleteLocationModal } from "../modals/locations/DeleteLocationModal";

/**
 * Renders all three Location modals as client-only singletons.
 * The mount guard prevents hydration mismatches when the page is server-rendered.
 */
export function LocationModalProvider() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <>
      <CreateLocationModal />
      <EditLocationModal />
      <DeleteLocationModal />
    </>
  );
}
