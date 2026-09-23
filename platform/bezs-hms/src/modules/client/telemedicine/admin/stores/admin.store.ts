/**
 * admin.store — Zustand store for telemedicine admin modal state.
 *
 * Layer: client / telemedicine / admin / stores
 *
 * Central store that tracks which modal is currently open and the data it needs.
 * Any component (table column cells, empty states, buttons) can open a modal by
 * calling onOpen({ type, data }) — no prop drilling or local useState required.
 *
 * Pattern mirrors nextjs-iam's admin.store.ts.
 */

import { create } from "zustand";
import { TOrgResponse } from "@/modules/entities/schemas/organization";
import { TLocationResponse } from "@/modules/entities/schemas/location";
import { THealthcareServiceResponse } from "@/modules/entities/schemas/healthcare-service";
import { TScheduleResponse } from "@/modules/entities/schemas/schedule";
import { TSlotResponse } from "@/modules/entities/schemas/slot";
import { TPractitionerRoleResponse } from "@/modules/entities/schemas/practitioner-role";
import { TPractitionerResponse } from "@/modules/entities/schemas/practitioner";

// ── Modal type union ───────────────────────────────────────────────────────────

/** All modal identifiers for the telemedicine admin section. */
export type ModalType =
  | "createOrganization"
  | "editOrganization"
  | "deleteOrganization"
  | "createLocation"
  | "editLocation"
  | "deleteLocation"
  | "createHealthcareService"
  | "editHealthcareService"
  | "deleteHealthcareService"
  | "createSchedule"
  | "editSchedule"
  | "deleteSchedule"
  | "createSlot"
  | "editSlot"
  | "deleteSlot"
  | "generateSlots"
  | "createPractitionerRole"
  | "editPractitionerRole"
  | "deletePractitionerRole"
  | "createPractitioner"
  | "editPractitioner"
  | "deletePractitioner";

// ── Modal data payload ─────────────────────────────────────────────────────────

/**
 * Flat data bag passed to the store when a modal is opened.
 * Each modal reads only the fields it needs.
 */
export interface ModalData {
  /** Organization fields (edit / delete). */
  organizationId?: number;
  organizationName?: string;
  /** Full org record — used by edit modal to pre-populate the form. */
  organization?: TOrgResponse;
  /** Better Auth user ID of the current session — passed through to create/edit actions. */
  userId?: string;
  /** Better Auth active organization ID of the current session — scopes created resources to the tenant. */
  orgId?: string;

  /** Location fields (edit / delete). */
  locationId?: number;
  locationName?: string;
  /** Full location record — used by edit modal to pre-populate the form. */
  location?: TLocationResponse;

  /** HealthcareService fields (edit / delete). */
  healthcareServiceId?: number;
  healthcareServiceName?: string;
  /** Full healthcare service record — used by edit modal to pre-populate the form. */
  healthcareService?: THealthcareServiceResponse;

  /** Schedule fields (edit / delete). */
  scheduleId?: number;
  /** Display label for confirmation dialogs — Schedule has no name, so this is `comment` or a fallback. */
  scheduleLabel?: string;
  /** Full schedule record — used by edit modal to pre-populate the form. */
  schedule?: TScheduleResponse;

  /** Slot fields (edit / delete). */
  slotId?: number;
  /** Display label for confirmation dialogs — Slot has no name, so this is a start/status summary. */
  slotLabel?: string;
  /** Full slot record — used by edit modal to pre-populate the form. */
  slot?: TSlotResponse;

  /** PractitionerRole fields (edit / delete). */
  practitionerRoleId?: number;
  /** Display label for confirmation dialogs — PractitionerRole has no name, so this is `practitioner_display` or a fallback. */
  practitionerRoleLabel?: string;
  /** Full practitioner role record — used by edit modal to pre-populate the form. */
  practitionerRole?: TPractitionerRoleResponse;

  /** Practitioner fields (edit / delete). */
  practitionerId?: number;
  /** Display label for confirmation dialogs — composed from the practitioner's first HumanName, or a fallback. */
  practitionerLabel?: string;
  /** Full practitioner record — used by edit modal to pre-populate the form. */
  practitioner?: TPractitionerResponse;
}

// ── Store interface ────────────────────────────────────────────────────────────

interface IAdminStore {
  type: ModalType | null;
  isOpen: boolean;
  data: ModalData | null;
  /** Opens a modal. Pass the type and any data the modal needs to render. */
  onOpen: (props: { type: ModalType; data?: ModalData }) => void;
  /** Closes the current modal and clears all data. */
  onClose: () => void;
}

// ── Store instance ─────────────────────────────────────────────────────────────

const _useAdminStore = create<IAdminStore>((set) => ({
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
 * @example const openModal = useAdminStore((s) => s.onOpen);
 */
export const useAdminStore = _useAdminStore;

/**
 * Direct store accessor — use outside React (e.g. in column definitions).
 * @example const openModal = adminStore((s) => s.onOpen);
 */
export const adminStore = _useAdminStore;
