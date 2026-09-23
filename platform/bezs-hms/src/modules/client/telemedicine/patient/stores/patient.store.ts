/**
 * patient.store — Zustand store for telemedicine patient modal state.
 *
 * Layer: client / telemedicine / patient / stores
 *
 * Central store that tracks which modal is currently open and the data it
 * needs. Any component can open a modal by calling onOpen({ type, data }) —
 * no prop drilling or local useState required.
 *
 * Pattern mirrors admin.store.ts.
 */

import { create } from "zustand";
import { type TAppointmentResponse } from "@/modules/entities/schemas/appointment";

// ── Modal type union ───────────────────────────────────────────────────────────

/** All modal identifiers for the telemedicine patient section. */
export type PatientModalType =
  | "bookAppointment"
  | "cancelAppointment"
  | "rescheduleAppointment"
  | "uploadResult";

// ── Modal data payload ─────────────────────────────────────────────────────────

/**
 * Flat data bag passed to the store when a modal is opened.
 * Each modal reads only the fields it needs.
 */
export interface PatientModalData {
  /** Localised href for the manual booking wizard. */
  bookHref?: string;
  /** Localised href for the intake chooser. */
  intakeHref?: string;
  /** Target appointment row — used by the cancel/reschedule modals. */
  appointment?: TAppointmentResponse;
  /** FHIR ServiceRequest id — used by the upload result modal. */
  serviceRequestId?: number;
  /** Human-readable name of the ServiceRequest (e.g. "CBC Blood Test"). */
  serviceRequestCode?: string;
  /** FHIR Patient.id — used to construct the FilNest upload path. */
  patientFhirId?: number;
}

// ── Store interface ────────────────────────────────────────────────────────────

interface IPatientStore {
  type: PatientModalType | null;
  isOpen: boolean;
  data: PatientModalData | null;
  /** Opens a modal. Pass the type and any data the modal needs to render. */
  onOpen: (props: { type: PatientModalType; data?: PatientModalData }) => void;
  /** Closes the current modal and clears all data. */
  onClose: () => void;
}

// ── Store instance ─────────────────────────────────────────────────────────────

const _usePatientStore = create<IPatientStore>((set) => ({
  type: null,
  isOpen: false,
  data: null,

  onOpen: ({ type, data }) =>
    set({ isOpen: true, type, data: data ?? null }),

  onClose: () =>
    set({ type: null, isOpen: false, data: null }),
}));

/**
 * Hook — use inside React components.
 * @example const openModal = usePatientStore((s) => s.onOpen);
 */
export const usePatientStore = _usePatientStore;

/**
 * Direct store accessor — use outside React (e.g. in column definitions).
 * @example const openModal = patientStore.getState().onOpen;
 */
export const patientStore = _usePatientStore;
