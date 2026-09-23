import { z } from "zod";
import { appointmentCreateSchema } from "./appointment/appointment_create_schema";
import { patientCreateSchema } from "./patient/patient_create_schema";
import { adminPatientCreateSchema } from "./patient/admin_patient_create_schema";
import { identifierCreateSchema } from "./patient/identifier_create_schema";
import { telecomCreateSchema } from "./patient/telecom_create_schema";
import { addressCreateSchema } from "./patient/address_create_schema";
import { nameCreateSchema } from "./patient/name_create_schema";
import { communicationCreateSchema } from "./patient/communication_create_schema";
import { contactCreateSchema } from "./patient/contact_create_schema";
import { gpCreateSchema } from "./patient/gp_create_schema";
import { photoCreateSchema } from "./patient/photo_create_schema";
import { patientPhotoUploadSchema } from "./patient/patient_photo_upload_schema";
import { linkCreateSchema } from "./patient/link_create_schema";
import { organizationCreateSchema } from "./organization/organization_create_schema";
import { locationCreateSchema } from "./organization/location_create_schema";
import { healthcareServiceCreateSchema } from "./healthcare_service/healthcare_service_create_schema";
import { practitionerCreateSchema } from "./practitioner/practitioner_create_schema";
import { adminPractitionerCreateSchema } from "./practitioner/admin_practitioner_create_schema";
import { practitionerNameCreateSchema } from "./practitioner/practitioner_name_create_schema";
import { practitionerIdentifierCreateSchema } from "./practitioner/practitioner_identifier_create_schema";
import { practitionerTelecomCreateSchema } from "./practitioner/practitioner_telecom_create_schema";
import { practitionerQualificationCreateSchema } from "./practitioner/practitioner_qualification_create_schema";
import { practitionerCommunicationCreateSchema } from "./practitioner/practitioner_communication_create_schema";
import { practitionerPhotoCreateSchema } from "./practitioner/practitioner_photo_create_schema";
import { practitionerRoleCreateSchema } from "./practitioner/practitioner_role_create_schema";
import { scheduleCreateSchema } from "./schedule/schedule_create_schema";
import { selectScheduleSchema } from "./schedule/select_schedule_schema";
import { generateSlotsSchema } from "./schedule/generate_slots_schema";
import { relatedPersonCreateSchema } from "./related_person/related_person_create_schema";
import { coverageCreateSchema } from "./coverage/coverage_create_schema";
import { medicationCreateSchema } from "./medication/medication_create_schema";
import { episodeOfCareCreateSchema } from "./encounter/episode_of_care_create_schema";
import { encounterCreateSchema } from "./encounter/encounter_create_schema";
import { encounterCloseSchema } from "./encounter/encounter_close_schema";
import { allergyIntoleranceCreateSchema } from "./clinical/allergy_intolerance_create_schema";
import { vitalsCreateSchema } from "./clinical/vitals_create_schema";
import { observationCreateSchema } from "./clinical/observation_create_schema";
import { conditionCreateSchema } from "./clinical/condition_create_schema";
import { questionnaireResponseCreateSchema } from "./clinical/questionnaire_response_create_schema";
import { serviceRequestCreateSchema } from "./orders/service_request_create_schema";
import { medicationRequestCreateSchema } from "./orders/medication_request_create_schema";
import { deviceRequestCreateSchema } from "./orders/device_request_create_schema";
import { immunizationCreateSchema } from "./orders/immunization_create_schema";
import { procedureCreateSchema } from "./clinical/procedure_create_schema";
import { specimenCreateSchema } from "./clinical/specimen_create_schema";
import { diagnosticReportCreateSchema } from "./results/diagnostic_report_create_schema";
import { diagnosticReportObservationCreateSchema } from "./results/diagnostic_report_observation_create_schema";
import { documentReferenceCreateSchema } from "./results/document_reference_create_schema";
import { carePlanCreateSchema } from "./care/care_plan_create_schema";
import { taskCreateSchema } from "./care/task_create_schema";
import { claimCreateSchema } from "./billing/claim_create_schema";
import { claimResponseCreateSchema } from "./billing/claim_response_create_schema";
import { invoiceCreateSchema } from "./billing/invoice_create_schema";
import { provenanceCreateSchema } from "./audit/provenance_create_schema";
import { selectAppointmentSchema } from "./clinical/select_appointment_schema";
import { chooseExtractionsSchema } from "./clinical/choose_extractions_schema";
import { adminSelectPatientSchema } from "./patient/admin_select_patient_schema";
import { adminUploadReportSchema } from "./results/admin_upload_report_schema";

/** Maps the workflow action's validation_schema key to the corresponding Zod schema. */
export const VALIDATION_SCHEMAS: Record<string, z.ZodTypeAny> = {
  appointment_create_schema: appointmentCreateSchema,
  patient_create_schema: patientCreateSchema,
  admin_patient_create_schema: adminPatientCreateSchema,
  identifier_create_schema: identifierCreateSchema,
  telecom_create_schema: telecomCreateSchema,
  address_create_schema: addressCreateSchema,
  name_create_schema: nameCreateSchema,
  communication_create_schema: communicationCreateSchema,
  contact_create_schema: contactCreateSchema,
  gp_create_schema: gpCreateSchema,
  photo_create_schema: photoCreateSchema,
  patient_photo_upload_schema: patientPhotoUploadSchema,
  link_create_schema: linkCreateSchema,
  organization_create_schema: organizationCreateSchema,
  location_create_schema: locationCreateSchema,
  healthcare_service_create_schema: healthcareServiceCreateSchema,
  practitioner_create_schema: practitionerCreateSchema,
  admin_practitioner_create_schema: adminPractitionerCreateSchema,
  practitioner_name_create_schema: practitionerNameCreateSchema,
  practitioner_identifier_create_schema: practitionerIdentifierCreateSchema,
  practitioner_telecom_create_schema: practitionerTelecomCreateSchema,
  practitioner_qualification_create_schema: practitionerQualificationCreateSchema,
  practitioner_communication_create_schema: practitionerCommunicationCreateSchema,
  practitioner_photo_create_schema: practitionerPhotoCreateSchema,
  practitioner_role_create_schema: practitionerRoleCreateSchema,
  schedule_create_schema: scheduleCreateSchema,
  select_schedule_schema: selectScheduleSchema,
  generate_slots_schema: generateSlotsSchema,
  related_person_create_schema: relatedPersonCreateSchema,
  coverage_create_schema: coverageCreateSchema,
  medication_create_schema: medicationCreateSchema,
  episode_of_care_create_schema: episodeOfCareCreateSchema,
  encounter_create_schema: encounterCreateSchema,
  encounter_close_schema: encounterCloseSchema,
  allergy_intolerance_create_schema: allergyIntoleranceCreateSchema,
  vitals_create_schema: vitalsCreateSchema,
  observation_create_schema: observationCreateSchema,
  condition_create_schema: conditionCreateSchema,
  questionnaire_response_create_schema: questionnaireResponseCreateSchema,
  service_request_create_schema: serviceRequestCreateSchema,
  medication_request_create_schema: medicationRequestCreateSchema,
  device_request_create_schema: deviceRequestCreateSchema,
  immunization_create_schema: immunizationCreateSchema,
  procedure_create_schema: procedureCreateSchema,
  specimen_create_schema: specimenCreateSchema,
  diagnostic_report_create_schema: diagnosticReportCreateSchema,
  diagnostic_report_observation_create_schema: diagnosticReportObservationCreateSchema,
  document_reference_create_schema: documentReferenceCreateSchema,
  care_plan_create_schema: carePlanCreateSchema,
  task_create_schema: taskCreateSchema,
  claim_create_schema: claimCreateSchema,
  claim_response_create_schema: claimResponseCreateSchema,
  invoice_create_schema: invoiceCreateSchema,
  provenance_create_schema: provenanceCreateSchema,
  select_appointment_schema: selectAppointmentSchema,
  choose_extractions_schema: chooseExtractionsSchema,
  admin_select_patient_schema: adminSelectPatientSchema,
  admin_upload_report_schema: adminUploadReportSchema,
};
