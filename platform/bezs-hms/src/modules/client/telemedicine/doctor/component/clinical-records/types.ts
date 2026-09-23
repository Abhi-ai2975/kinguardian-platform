/**
 * Clinical Records shared types.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records
 *
 * Shapes passed from the Clinical Records server pages into their client
 * components. These are derived views over FHIR data (there is no single
 * backend resource for "patients who consulted with this doctor"), so they are
 * defined here rather than in entities/schemas.
 */

/**
 * One row in the doctor's patient list — a distinct patient the doctor has had
 * at least one appointment with, plus aggregate counts derived from those
 * appointments.
 */
export interface DoctorPatientSummary {
  /** FHIR Patient.id — used as the route segment for the drill-down. */
  patientId: number;
  /** Patient display name taken from the appointment participant. */
  name: string;
  /** Total appointments this doctor has with the patient, any status. */
  visitCount: number;
  /** How many of those reached a completed/fulfilled state. */
  completedCount: number;
  /** How many are still upcoming (booked / pending / checked-in, start in future). */
  upcomingCount: number;
  /** ISO datetime of the most recent past appointment start, or null if none. */
  lastVisit: string | null;
}
