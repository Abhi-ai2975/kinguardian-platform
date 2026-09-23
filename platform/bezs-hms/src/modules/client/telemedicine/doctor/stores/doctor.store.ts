/**
 * doctor.store — Zustand store for telemedicine doctor modal state.
 *
 * Layer: client / telemedicine / doctor / stores
 *
 * Central store that tracks which modal is currently open and the data it
 * needs. Any component can call onOpen({ type, data }) — no prop drilling.
 * Pattern mirrors patient.store.ts and admin.store.ts.
 */

import { create } from "zustand";
import { type TAppointmentResponse } from "@/modules/entities/schemas/appointment";

// ── Modal type union ───────────────────────────────────────────────────────────

/** All modal identifiers for the telemedicine doctor section. */
export type DoctorModalType =
  | "confirmAppointment"
  | "cancelAppointment"
  | "rescheduleAppointment"
  | "uploadOrderResult"
  | "uploadEncounterDocument";

// ── Modal data payload ─────────────────────────────────────────────────────────

/**
 * Flat data bag passed to the store when a modal is opened.
 * Each modal reads only the fields it needs.
 */
export interface DoctorModalData {
  /** Target appointment row — used by confirm and cancel modals. */
  appointment?: TAppointmentResponse;

  // ── Clinical Records uploads ──────────────────────────────────────────────

  /** FHIR Patient.id — subject of uploaded documents and the upload path root. */
  patientFhirId?: number;
  /** FHIR ServiceRequest.id the uploaded result belongs to. */
  serviceRequestId?: number;
  /** Human-readable order name, shown in the upload dialog description. */
  serviceRequestCode?: string;
  /** FHIR Encounter.id that an uploaded document is attached to. */
  encounterId?: number;
}

// ── Store interface ────────────────────────────────────────────────────────────

interface IDoctorStore {
  type: DoctorModalType | null;
  isOpen: boolean;
  data: DoctorModalData | null;
  /** Opens a modal. Pass the type and any data the modal needs to render. */
  onOpen: (props: { type: DoctorModalType; data?: DoctorModalData }) => void;
  /** Closes the current modal and clears all data. */
  onClose: () => void;
}

// ── Store instance ─────────────────────────────────────────────────────────────

const _useDoctorStore = create<IDoctorStore>((set) => ({
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
 * @example const openModal = useDoctorStore((s) => s.onOpen);
 */
export const useDoctorStore = _useDoctorStore;

/**
 * Direct store accessor — use outside React (e.g. in column action callbacks).
 * @example doctorStore.getState().onOpen({ type: "confirmAppointment", data: { appointment: row } });
 */
export const doctorStore = _useDoctorStore;
