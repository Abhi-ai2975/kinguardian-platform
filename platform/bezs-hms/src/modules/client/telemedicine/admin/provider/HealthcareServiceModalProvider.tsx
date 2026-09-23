/**
 * HealthcareServiceModalProvider — mounts all HealthcareService admin modals once.
 *
 * Layer: client / telemedicine / admin / provider
 * Resource: HealthcareService
 *
 * Pattern mirrors LocationModalProvider. A mount guard (isMounted) ensures
 * modals are never rendered during SSR — the Zustand store relies on browser
 * APIs and must not hydrate on the server.
 *
 * Usage: render <HealthcareServiceModalProvider /> once per layout/page that
 * hosts the healthcare services table. Modals are controlled entirely by the
 * admin store; no props needed here or in the modal components.
 */

"use client";

import { useEffect, useState } from "react";
import { CreateHealthcareServiceModal } from "../modals/healthcare-services/CreateHealthcareServiceModal";
import { EditHealthcareServiceModal } from "../modals/healthcare-services/EditHealthcareServiceModal";
import { DeleteHealthcareServiceModal } from "../modals/healthcare-services/DeleteHealthcareServiceModal";

/**
 * Renders all three HealthcareService modals as client-only singletons.
 * The mount guard prevents hydration mismatches when the page is server-rendered.
 */
export function HealthcareServiceModalProvider() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <>
      <CreateHealthcareServiceModal />
      <EditHealthcareServiceModal />
      <DeleteHealthcareServiceModal />
    </>
  );
}
