/**
 * DoctorModalProvider — mounts all doctor-section modals once.
 *
 * Layer: client / telemedicine / doctor / provider
 *
 * Pattern mirrors PatientModalProvider. The isMounted guard prevents
 * hydration mismatches — the Zustand doctor store relies on browser APIs
 * and must not hydrate on the server.
 *
 * Usage: render <DoctorModalProvider /> once per page/layout that hosts
 * doctor-section UI. Modals are controlled entirely by the doctor store;
 * no props needed here or in the modal components.
 */

"use client";

import { useEffect, useState } from "react";
import { ConfirmAppointmentModal } from "../modals/appointments/ConfirmAppointmentModal";
import { CancelAppointmentModal } from "../modals/appointments/CancelAppointmentModal";
import { RescheduleAppointmentModal } from "../modals/appointments/RescheduleAppointmentModal";
import { UploadOrderResultModal } from "../modals/clinical-records/UploadOrderResultModal";
import { UploadEncounterDocumentModal } from "../modals/clinical-records/UploadEncounterDocumentModal";

/**
 * Renders all doctor modals as client-only singletons.
 * The isMounted guard prevents Zustand hydration mismatches on server-rendered pages.
 */
export function DoctorModalProvider() {
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
      <ConfirmAppointmentModal />
      <CancelAppointmentModal />
      <RescheduleAppointmentModal />
      <UploadOrderResultModal />
      <UploadEncounterDocumentModal />
    </>
  );
}
