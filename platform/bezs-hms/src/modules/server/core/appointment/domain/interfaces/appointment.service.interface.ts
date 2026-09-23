/**
 * Appointment service domain interface.
 *
 * Layer: server / core / appointment / domain
 *
 * Defines the contract that all transport implementations (REST, GraphQL) must
 * satisfy. The application use cases depend only on this interface — never on
 * a concrete implementation — which keeps the domain layer transport-agnostic.
 *
 * 8 operations map to the 8 fhir-gql appointment routes:
 *   POST /appointments/book               → book
 *   POST /appointments/                   → create
 *   GET  /appointments/ (user_id filter)  → getMe
 *   GET  /appointments/                   → list
 *   GET  /appointments/{id}               → getById
 *   PATCH /appointments/{id}              → update
 *   DELETE /appointments/{id}             → delete
 *   POST /appointments/{id}/reschedule    → reschedule
 */

import {
  TBookAppointment,
  TCreateAppointment,
  TListAppointmentsQuery,
  TGetMyAppointments,
  TUpdateAppointment,
} from "@/modules/entities/schemas/appointment";
import {
  TAppointmentResponse,
  TPaginatedAppointmentResponse,
} from "@/modules/entities/schemas/appointment";

/**
 * Service contract for Appointment CRUD + booking operations.
 * Injected via IoC as `IAppointmentService`.
 */
export interface IAppointmentService {
  /**
   * Atomically books an appointment via the simplified /book endpoint.
   * Marks the slot as busy and links participants in one fhir-gql transaction.
   *
   * @param data - Booking payload (practitioner, slot, patient IDs plus optional metadata).
   * @returns The newly created Appointment.
   * @throws ConflictError if the slot is no longer free (409 from fhir-gql).
   */
  book(data: TBookAppointment): Promise<TAppointmentResponse>;

  /**
   * Creates a full FHIR Appointment with all optional child arrays.
   *
   * @param data - Full create payload; status and participant (≥1) required.
   * @returns The newly created Appointment.
   */
  create(data: TCreateAppointment): Promise<TAppointmentResponse>;

  /**
   * Lists appointments belonging to a specific user (patient / practitioner).
   * Calls GET /appointments/ with a user_id query param derived from the session —
   * NOT the fhir-gql /me endpoint which would resolve to the service account.
   *
   * @param userId - The drgodly user ID whose appointments to fetch.
   * @param query - Optional filters (status, start_from, start_to, limit, offset).
   * @returns Paginated list of appointments for the given user.
   */
  getMe(
    userId: string,
    query: Omit<TGetMyAppointments, "userId">,
  ): Promise<TPaginatedAppointmentResponse>;

  /**
   * Lists all appointments with optional cross-tenant filters.
   *
   * @param query - Filters (status, patient_id, start_from, start_to, user_id, org_id, limit, offset).
   * @returns Paginated appointment list.
   */
  list(query: TListAppointmentsQuery): Promise<TPaginatedAppointmentResponse>;

  /**
   * Fetches a single appointment by its integer ID.
   *
   * @param id - The appointment's fhir-gql database ID.
   * @returns The Appointment, or throws NotFoundError.
   */
  getById(id: number): Promise<TAppointmentResponse>;

  /**
   * Partially updates scalars on an existing appointment.
   * Child arrays cannot be updated in-place; only scalar fields are patchable.
   *
   * @param id - The appointment's fhir-gql database ID.
   * @param data - Scalar patch payload (status, dates, cancellation, priority, etc.).
   * @returns The updated Appointment.
   */
  update(id: number, data: Omit<TUpdateAppointment, "id">): Promise<TAppointmentResponse>;

  /**
   * Soft- or hard-deletes an appointment by ID.
   *
   * @param id - The appointment's fhir-gql database ID.
   * @returns void on success.
   * @throws NotFoundError if the ID does not exist.
   */
  delete(id: number): Promise<void>;

  /**
   * Atomically reschedules an appointment to a new slot.
   * Frees the old slot, updates appointment start/end, and marks the new slot busy.
   *
   * @param id - The appointment's fhir-gql database ID.
   * @param newSlotId - Integer ID of the new free Slot.
   * @returns The updated Appointment.
   * @throws ConflictError if the new slot is no longer free (409 from fhir-gql).
   */
  reschedule(id: number, newSlotId: number): Promise<TAppointmentResponse>;
}
