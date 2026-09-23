/**
 * rescheduleAppointmentUseCase — swaps an appointment to a new free slot.
 *
 * Layer: server / core / appointment / application / usecases
 *
 * Delegates to IAppointmentService.reschedule which calls
 * POST /appointments/{id}/reschedule on fhir-gql. The backend atomically:
 *   1. Frees the old slot.
 *   2. Updates appointment start/end to match the new slot.
 *   3. Marks the new slot as busy.
 * Full rollback is applied if any step after Step 1 fails.
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Reschedules an existing appointment by moving it to a different free slot.
 *
 * @param id - The appointment's fhir-gql integer ID.
 * @param newSlotId - Integer ID of the new free Slot to move the appointment to.
 * @returns The updated Appointment resource.
 * @throws ConflictError if the new slot is no longer free.
 */
export async function rescheduleAppointmentUseCase(
  id: number,
  newSlotId: number,
) {
  const service = getInjection("IAppointmentService");
  return service.reschedule(id, newSlotId);
}
