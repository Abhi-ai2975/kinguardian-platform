/**
 * ScheduleModalProvider — mounts all Schedule admin modals once.
 *
 * Layer: client / telemedicine / admin / provider
 * Resource: Schedule
 *
 * Pattern mirrors LocationModalProvider. A mount guard (isMounted) ensures
 * modals are never rendered during SSR — the Zustand store relies on browser
 * APIs and must not hydrate on the server.
 *
 * Usage: render <ScheduleModalProvider /> once per layout/page that hosts the
 * schedules table. Modals are controlled entirely by the admin store; no
 * props needed here or in the modal components.
 */

"use client";

import { useEffect, useState } from "react";
import { CreateScheduleModal } from "../modals/schedules/CreateScheduleModal";
import { EditScheduleModal } from "../modals/schedules/EditScheduleModal";
import { DeleteScheduleModal } from "../modals/schedules/DeleteScheduleModal";

/**
 * Renders all three Schedule modals as client-only singletons.
 * The mount guard prevents hydration mismatches when the page is server-rendered.
 */
export function ScheduleModalProvider() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <>
      <CreateScheduleModal />
      <EditScheduleModal />
      <DeleteScheduleModal />
    </>
  );
}
