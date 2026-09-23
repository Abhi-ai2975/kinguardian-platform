/**
 * PatientModalProvider — mounts all patient-section modals once.
 *
 * Layer: client / telemedicine / patient / provider
 *
 * Pattern mirrors OrganizationModalProvider. The isMounted guard ensures
 * modals are never rendered during SSR — the Zustand patient store relies
 * on browser APIs and must not hydrate on the server.
 *
 * Usage: render <PatientModalProvider /> once per layout/page that hosts
 * patient-section UI. Modals are controlled entirely by the patient store;
 * no props needed here or in the modal components.
 */

"use client";

import { useEffect, useState } from "react";
import { BookAppointmentModal } from "../modals/appointments/BookAppointmentModal";
import { CancelAppointmentModal } from "../modals/appointments/CancelAppointmentModal";
import { RescheduleAppointmentModal } from "../modals/appointments/RescheduleAppointmentModal";
import { UploadResultModal } from "../modals/appointments/UploadResultModal";

/**
 * Renders all patient modals as client-only singletons.
 * The mount guard prevents hydration mismatches on server-rendered pages.
 */
export function PatientModalProvider() {
  /**
   * Deferred mount: skip rendering on the first server-rendered pass.
   * Without this guard, Zustand's client-only store would mismatch the
   * server HTML.
   */
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <>
      <BookAppointmentModal />
      <CancelAppointmentModal />
      <RescheduleAppointmentModal />
      <UploadResultModal />
    </>
  );
}
