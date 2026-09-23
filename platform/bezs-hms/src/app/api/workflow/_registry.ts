/**
 * Workflow registry — central catalogue of all registered workflow definitions.
 *
 * Layer: app / api / workflow
 *
 * This is the single source of truth for every workflow in the system. All
 * routes that need to resolve a workflow by ID (POST /api/workflow with
 * workflow_id) or build a permission-filtered list (GET /api/workflow/permitted)
 * import from here instead of maintaining their own import lists.
 *
 * Each entry wraps a WorkflowDefinition with a human-readable category label
 * derived from the JSON file's folder — this avoids polluting the workflow JSON
 * schema with a UI-only field.
 */

import type { WorkflowDefinition } from "@/types/workflow";

// ── Appointment ───────────────────────────────────────────────────────────────
import book_appointment from "@/modules/client/ai-hub/workflows/appointment/book_appointment.json";
// ── Audit ──────────────────────────────────────────────────────────────────────
import record_provenance from "@/modules/client/ai-hub/workflows/audit/record_provenance.json";
// ── Billing ───────────────────────────────────────────────────────────────────
import create_billing_cycle from "@/modules/client/ai-hub/workflows/billing/create_billing_cycle.json";
// ── Care ──────────────────────────────────────────────────────────────────────
import create_care_plan_with_task from "@/modules/client/ai-hub/workflows/care/create_care_plan_with_task.json";
// ── Clinical ──────────────────────────────────────────────────────────────────
import add_consultation_extractions from "@/modules/client/ai-hub/workflows/clinical/add_consultation_extractions.json";
import record_allergy_intolerance from "@/modules/client/ai-hub/workflows/clinical/record_allergy_intolerance.json";
import record_condition from "@/modules/client/ai-hub/workflows/clinical/record_condition.json";
import record_observation from "@/modules/client/ai-hub/workflows/clinical/record_observation.json";
import record_procedure from "@/modules/client/ai-hub/workflows/clinical/record_procedure.json";
import record_questionnaire_response from "@/modules/client/ai-hub/workflows/clinical/record_questionnaire_response.json";
import record_specimen from "@/modules/client/ai-hub/workflows/clinical/record_specimen.json";
import record_vitals from "@/modules/client/ai-hub/workflows/clinical/record_vitals.json";
// ── Coverage ──────────────────────────────────────────────────────────────────
import create_coverage from "@/modules/client/ai-hub/workflows/coverage/create_coverage.json";
// ── Encounter ─────────────────────────────────────────────────────────────────
import close_encounter from "@/modules/client/ai-hub/workflows/encounter/close_encounter.json";
import open_encounter from "@/modules/client/ai-hub/workflows/encounter/open_encounter.json";
// ── Healthcare Service ────────────────────────────────────────────────────────
import create_healthcare_service from "@/modules/client/ai-hub/workflows/healthcare_service/create_healthcare_service.json";
// ── Location ──────────────────────────────────────────────────────────────────
import create_location from "@/modules/client/ai-hub/workflows/location/create_location.json";
// ── Medication ────────────────────────────────────────────────────────────────
import create_medication from "@/modules/client/ai-hub/workflows/medication/create_medication.json";
// ── Orders ────────────────────────────────────────────────────────────────────
import create_device_request from "@/modules/client/ai-hub/workflows/orders/create_device_request.json";
import create_medication_request from "@/modules/client/ai-hub/workflows/orders/create_medication_request.json";
import create_service_request from "@/modules/client/ai-hub/workflows/orders/create_service_request.json";
import record_immunization from "@/modules/client/ai-hub/workflows/orders/record_immunization.json";
// ── Organization ──────────────────────────────────────────────────────────────
import create_organization from "@/modules/client/ai-hub/workflows/organization/create_organization.json";
// ── Patient ───────────────────────────────────────────────────────────────────
import create_patient from "@/modules/client/ai-hub/workflows/patient/create_patient.json";
import admin_create_patient from "@/modules/client/ai-hub/workflows/patient/admin_create_patient.json";
// ── Practitioner ──────────────────────────────────────────────────────────────
import create_practitioner from "@/modules/client/ai-hub/workflows/practitioner/create_practitioner.json";
import admin_create_practitioner from "@/modules/client/ai-hub/workflows/practitioner/admin_create_practitioner.json";
import create_practitioner_role from "@/modules/client/ai-hub/workflows/practitioner/create_practitioner_role.json";
import upload_practitioner_photo from "@/modules/client/ai-hub/workflows/practitioner/upload_practitioner_photo.json";
// ── Related Person ────────────────────────────────────────────────────────────
import create_related_person from "@/modules/client/ai-hub/workflows/related_person/create_related_person.json";
// ── Results ───────────────────────────────────────────────────────────────────
import create_diagnostic_report from "@/modules/client/ai-hub/workflows/results/create_diagnostic_report.json";
import create_document_reference from "@/modules/client/ai-hub/workflows/results/create_document_reference.json";
import upload_patient_report from "@/modules/client/ai-hub/workflows/results/upload_patient_report.json";
// ── Schedule ──────────────────────────────────────────────────────────────────
import create_schedule_with_slots from "@/modules/client/ai-hub/workflows/schedule/create_schedule_with_slots.json";
import generate_slots from "@/modules/client/ai-hub/workflows/schedule/generate_slots.json";
// ── Vitals ────────────────────────────────────────────────────────────────────
import view_vitals_dashboard from "@/modules/client/ai-hub/workflows/vitals/view_vitals_dashboard.json";
import view_vitals_table from "@/modules/client/ai-hub/workflows/vitals/view_vitals_table.json";

/**
 * A WorkflowDefinition paired with its display category.
 * The category is derived from the JSON file's folder and used by the launcher UI
 * to group workflow cards — it is not stored in the workflow JSON itself.
 */
export interface WorkflowEntry {
  workflow: WorkflowDefinition;
  /** Human-readable category label shown as a group heading in the launcher. */
  category: string;
}

/**
 * Ordered list of all registered workflow entries.
 * Clinically important categories (Patient, Encounter, Clinical) appear first.
 */
export const WORKFLOW_ENTRIES: WorkflowEntry[] = [
  {
    category: "Clinical",
    workflow: add_consultation_extractions as unknown as WorkflowDefinition,
  },
  {
    category: "Patient",
    workflow: create_patient as unknown as WorkflowDefinition,
  },
  {
    category: "Patient",
    workflow: admin_create_patient as unknown as WorkflowDefinition,
  },
  {
    category: "Results",
    workflow: upload_patient_report as unknown as WorkflowDefinition,
  },
  // {
  //   category: "Appointment",
  //   workflow: book_appointment as unknown as WorkflowDefinition,
  // },
  // {
  //   category: "Encounter",
  //   workflow: open_encounter as unknown as WorkflowDefinition,
  // },
  // {
  //   category: "Encounter",
  //   workflow: close_encounter as unknown as WorkflowDefinition,
  // },
  // {
  //   category: "Clinical",
  //   workflow: record_vitals as unknown as WorkflowDefinition,
  // },
  // {
  //   category: "Clinical",
  //   workflow: record_condition as unknown as WorkflowDefinition,
  // },
  // {
  //   category: "Clinical",
  //   workflow: record_observation as unknown as WorkflowDefinition,
  // },
  // {
  //   category: "Clinical",
  //   workflow: record_procedure as unknown as WorkflowDefinition,
  // },
  // {
  //   category: "Clinical",
  //   workflow: record_allergy_intolerance as unknown as WorkflowDefinition,
  // },
  // {
  //   category: "Clinical",
  //   workflow: record_questionnaire_response as unknown as WorkflowDefinition,
  // },
  // {
  //   category: "Clinical",
  //   workflow: record_specimen as unknown as WorkflowDefinition,
  // },
  // {
  //   category: "Orders",
  //   workflow: create_service_request as unknown as WorkflowDefinition,
  // },
  // {
  //   category: "Orders",
  //   workflow: create_medication_request as unknown as WorkflowDefinition,
  // },
  // {
  //   category: "Orders",
  //   workflow: create_device_request as unknown as WorkflowDefinition,
  // },
  // {
  //   category: "Orders",
  //   workflow: record_immunization as unknown as WorkflowDefinition,
  // },
  // {
  //   category: "Medication",
  //   workflow: create_medication as unknown as WorkflowDefinition,
  // },
  // {
  //   category: "Results",
  //   workflow: create_diagnostic_report as unknown as WorkflowDefinition,
  // },
  // {
  //   category: "Results",
  //   workflow: create_document_reference as unknown as WorkflowDefinition,
  // },
  // {
  //   category: "Care Plans",
  //   workflow: create_care_plan_with_task as unknown as WorkflowDefinition,
  // },
  // {
  //   category: "Coverage",
  //   workflow: create_coverage as unknown as WorkflowDefinition,
  // },
  // {
  //   category: "Billing",
  //   workflow: create_billing_cycle as unknown as WorkflowDefinition,
  // },
  {
    category: "Organization",
    workflow: create_organization as unknown as WorkflowDefinition,
  },
  {
    category: "Location",
    workflow: create_location as unknown as WorkflowDefinition,
  },
  {
    category: "Practitioner",
    workflow: create_practitioner as unknown as WorkflowDefinition,
  },
  {
    category: "Practitioner",
    workflow: admin_create_practitioner as unknown as WorkflowDefinition,
  },
  {
    category: "Practitioner",
    workflow: create_practitioner_role as unknown as WorkflowDefinition,
  },
  {
    category: "Practitioner",
    workflow: upload_practitioner_photo as unknown as WorkflowDefinition,
  },
  // {
  //   category: "Related Person",
  //   workflow: create_related_person as unknown as WorkflowDefinition,
  // },
  {
    category: "Healthcare Service",
    workflow: create_healthcare_service as unknown as WorkflowDefinition,
  },
  {
    category: "Schedule",
    workflow: create_schedule_with_slots as unknown as WorkflowDefinition,
  },
  {
    category: "Schedule",
    workflow: generate_slots as unknown as WorkflowDefinition,
  },
  // {
  //   category: "Vitals",
  //   workflow: view_vitals_dashboard as unknown as WorkflowDefinition,
  // },
  // {
  //   category: "Vitals",
  //   workflow: view_vitals_table as unknown as WorkflowDefinition,
  // },
  // {
  //   category: "Audit",
  //   workflow: record_provenance as unknown as WorkflowDefinition,
  // },
];

/**
 * O(1) lookup map from workflow.id → WorkflowEntry.
 * Used by POST /api/workflow when a workflow_id is provided directly.
 */
export const WORKFLOW_REGISTRY = new Map<string, WorkflowEntry>(
  WORKFLOW_ENTRIES.map((entry) => [entry.workflow.id, entry]),
);
