/**
 * SlotModalProvider — mounts all Slot admin modals once.
 *
 * Layer: client / telemedicine / admin / provider
 * Resource: Slot
 *
 * Pattern mirrors ScheduleModalProvider. A mount guard (isMounted) ensures
 * modals are never rendered during SSR — the Zustand store relies on browser
 * APIs and must not hydrate on the server.
 *
 * Usage: render <SlotModalProvider /> once per layout/page that hosts the
 * slots table. Modals are controlled entirely by the admin store; no props
 * needed here or in the modal components.
 */

"use client";

import { useEffect, useState } from "react";
import { CreateSlotModal } from "../modals/slots/CreateSlotModal";
import { EditSlotModal } from "../modals/slots/EditSlotModal";
import { DeleteSlotModal } from "../modals/slots/DeleteSlotModal";
import { GenerateSlotsModal } from "../modals/slots/GenerateSlotsModal";

/**
 * Renders all four Slot modals as client-only singletons.
 * The mount guard prevents hydration mismatches when the page is server-rendered.
 */
export function SlotModalProvider() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <>
      <CreateSlotModal />
      <EditSlotModal />
      <DeleteSlotModal />
      <GenerateSlotsModal />
    </>
  );
}
