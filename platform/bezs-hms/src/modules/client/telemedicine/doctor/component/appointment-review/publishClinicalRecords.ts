/**
 * publishClinicalRecords — pushes staged clinical form state into the EMR (FHIR).
 *
 * Layer: client / telemedicine / doctor / component / appointment-review
 *
 * This is the "accept" half of the staging→accept→EMR model. Doctor edits live
 * in local form state (and, on the Clinical Records workspace, in the
 * Consultation staging row); calling this writes them to fhir-gql for real.
 *
 * Diff strategy — each item is partitioned against the fhirIds that were present
 * when the form was loaded:
 *   - fhirId present in the current list        → UPDATE (doctor edited it)
 *   - fhirId absent from the current list       → CREATE (newly added item)
 *   - fhirId loaded at mount but missing now    → DELETE (doctor removed it)
 *
 * All operations for all four resource types run in a single Promise.all, so a
 * publish is one round of parallel writes rather than a sequential cascade.
 *
 * Immutability caveat (enforced by fhir-gql, mirrored here): child arrays such
 * as category, note, reference_range and dosage_instruction can only be set at
 * CREATE time. UPDATE payloads therefore carry scalar fields only — changing a
 * child array requires the doctor to delete and re-add the item.
 *
 * Shared by AppointmentReview (post-consultation review) and the Clinical
 * Records workspace so both publish through exactly one implementation.
 */

import {
  createConditionAction,
  updateConditionAction,
  deleteConditionAction,
} from "@/modules/server/presentation/actions/condition/core.actions";
import {
  createObservationAction,
  updateObservationAction,
  deleteObservationAction,
} from "@/modules/server/presentation/actions/observation/core.actions";
import {
  createMedicationRequestAction,
  updateMedicationRequestAction,
  deleteMedicationRequestAction,
} from "@/modules/server/presentation/actions/medication-request/core.actions";
import {
  createServiceRequestAction,
  updateServiceRequestAction,
  deleteServiceRequestAction,
} from "@/modules/server/presentation/actions/service-request/core.actions";
import {
  conditionCreatePayload,
  conditionUpdatePayload,
  medicationCreatePayload,
  medicationUpdatePayload,
  observationCreatePayload,
  observationUpdatePayload,
  serviceRequestCreatePayload,
  serviceRequestUpdatePayload,
  type ClinicalWriteContext,
} from "./clinicalPayloads";
import type {
  ConditionFormItem,
  MedicationFormItem,
  ObservationFormItem,
  ServiceRequestFormItem,
} from "./types";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * The set of FHIR IDs present per resource type when the form was loaded.
 * Anything in here but absent from the current lists is treated as a deletion.
 */
export interface InitialFhirIds {
  conditions: Set<number>;
  observations: Set<number>;
  medications: Set<number>;
  serviceRequests: Set<number>;
}

/** Everything publishClinicalRecords needs to diff and write one encounter's records. */
export interface PublishClinicalRecordsInput {
  /** Current condition form state. */
  conditions: ConditionFormItem[];
  /** Current observation form state. */
  observations: ObservationFormItem[];
  /** Current medication request form state. */
  medications: MedicationFormItem[];
  /** Current service request form state. */
  serviceRequests: ServiceRequestFormItem[];
  /** FHIR IDs present at load — used to compute deletions. */
  initialFhirIds: InitialFhirIds;
  /** FHIR subject reference for created resources, e.g. "Patient/10001". */
  subject: string;
  /** FHIR Encounter.id that every created resource is linked to. */
  encounterId: number;
}

// ── Publish ───────────────────────────────────────────────────────────────────

/**
 * Diffs the supplied form state against the FHIR IDs loaded at mount and applies
 * CREATE / UPDATE / DELETE operations in parallel across all four resource types.
 *
 * @param input - Current form state, load-time FHIR IDs, subject and encounter.
 * @returns The FHIR IDs still present after publishing, so the caller can reset
 *          its load-time snapshot without refetching.
 * @throws Whatever the underlying server actions throw if a write fails — the
 *         caller is responsible for surfacing the error to the doctor.
 */
export async function publishClinicalRecords({
  conditions,
  observations,
  medications,
  serviceRequests,
  initialFhirIds,
  subject,
  encounterId,
}: PublishClinicalRecordsInput): Promise<InitialFhirIds> {
  /* ── Compute deletes: IDs loaded at mount that are no longer in the list ── */
  const currentConditionFhirIds = new Set(
    conditions.filter((c) => c.fhirId).map((c) => c.fhirId!),
  );
  const currentObservationFhirIds = new Set(
    observations.filter((o) => o.fhirId).map((o) => o.fhirId!),
  );
  const currentMedicationFhirIds = new Set(
    medications.filter((m) => m.fhirId).map((m) => m.fhirId!),
  );
  const currentServiceRequestFhirIds = new Set(
    serviceRequests.filter((s) => s.fhirId).map((s) => s.fhirId!),
  );

  const deletedConditionIds = [...initialFhirIds.conditions].filter(
    (id) => !currentConditionFhirIds.has(id),
  );
  const deletedObservationIds = [...initialFhirIds.observations].filter(
    (id) => !currentObservationFhirIds.has(id),
  );
  const deletedMedicationIds = [...initialFhirIds.medications].filter(
    (id) => !currentMedicationFhirIds.has(id),
  );
  const deletedServiceRequestIds = [...initialFhirIds.serviceRequests].filter(
    (id) => !currentServiceRequestFhirIds.has(id),
  );

  /* Subject + encounter every CREATE attaches to. */
  const ctx: ClinicalWriteContext = { subject, encounterId };

  await Promise.all([
    /* ══ Conditions ══════════════════════════════════════════════════════════ */
    ...deletedConditionIds.map((id) => deleteConditionAction({ payload: { id } })),
    ...conditions
      .filter((c) => c.fhirId)
      .map((c) => updateConditionAction({ payload: conditionUpdatePayload(c) })),
    ...conditions
      .filter((c) => !c.fhirId)
      .map((c) =>
        createConditionAction({ payload: conditionCreatePayload(c, ctx) }),
      ),

    /* ══ Observations ════════════════════════════════════════════════════════ */
    ...deletedObservationIds.map((id) =>
      deleteObservationAction({ payload: { id } }),
    ),
    ...observations
      .filter((o) => o.fhirId)
      .map((o) =>
        updateObservationAction({ payload: observationUpdatePayload(o) }),
      ),
    ...observations
      .filter((o) => !o.fhirId)
      .map((o) =>
        createObservationAction({ payload: observationCreatePayload(o, ctx) }),
      ),

    /* ══ Medication requests ══════════════════════════════════════════════════ */
    ...deletedMedicationIds.map((id) =>
      deleteMedicationRequestAction({ payload: { id } }),
    ),
    ...medications
      .filter((m) => m.fhirId)
      .map((m) =>
        updateMedicationRequestAction({ payload: medicationUpdatePayload(m) }),
      ),
    ...medications
      .filter((m) => !m.fhirId)
      .map((m) =>
        createMedicationRequestAction({
          payload: medicationCreatePayload(m, ctx),
        }),
      ),

    /* ══ Service requests ════════════════════════════════════════════════════ */
    ...deletedServiceRequestIds.map((id) =>
      deleteServiceRequestAction({ payload: { id } }),
    ),
    ...serviceRequests
      .filter((s) => s.fhirId)
      .map((s) =>
        updateServiceRequestAction({ payload: serviceRequestUpdatePayload(s) }),
      ),
    ...serviceRequests
      .filter((s) => !s.fhirId)
      .map((s) =>
        createServiceRequestAction({
          payload: serviceRequestCreatePayload(s, ctx),
        }),
      ),
  ]);

  /*
   * Return the surviving fhirIds so the caller can reset its load-time snapshot.
   * Newly CREATEd items are intentionally absent — they have no fhirId in local
   * state until the caller refetches, and re-publishing without a refetch would
   * simply create them again (same behaviour as before this was extracted).
   */
  return {
    conditions: currentConditionFhirIds,
    observations: currentObservationFhirIds,
    medications: currentMedicationFhirIds,
    serviceRequests: currentServiceRequestFhirIds,
  };
}
