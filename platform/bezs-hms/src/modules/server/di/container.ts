import { createContainer } from "@evyweb/ioctopus";
import { DI_RETURN_TYPES, DI_SYMBOLS } from "./types";
import {
  registerOrganizationModule,
  registerLocationModule,
  registerHealthcareServiceModule,
  registerScheduleModule,
  registerTerminologyModule,
  registerEmrChatModule,
  registerPatientModule,
  registerPractitionerModule,
  registerPractitionerRoleModule,
  registerSlotModule,
  registerAppointmentModule,
  registerIntakeModule,
  registerConsultationModule,
  registerAiConsultationModule,
  registerEncounterModule,
  registerServiceRequestModule,
  registerMedicationRequestModule,
  registerObservationModule,
  registerConditionModule,
  registerDiagnosticReportModule,
  registerDocumentReferenceModule,
} from "./modules";

const ApplicationContainer = createContainer();

registerOrganizationModule(ApplicationContainer);
registerLocationModule(ApplicationContainer);
registerHealthcareServiceModule(ApplicationContainer);
registerScheduleModule(ApplicationContainer);
registerTerminologyModule(ApplicationContainer);
registerEmrChatModule(ApplicationContainer);
registerPatientModule(ApplicationContainer);
registerPractitionerModule(ApplicationContainer);
registerPractitionerRoleModule(ApplicationContainer);
registerSlotModule(ApplicationContainer);
registerAppointmentModule(ApplicationContainer);
registerIntakeModule(ApplicationContainer);
registerConsultationModule(ApplicationContainer);
registerAiConsultationModule(ApplicationContainer);
registerEncounterModule(ApplicationContainer);
registerServiceRequestModule(ApplicationContainer);
registerMedicationRequestModule(ApplicationContainer);
registerObservationModule(ApplicationContainer);
registerConditionModule(ApplicationContainer);
registerDiagnosticReportModule(ApplicationContainer);
registerDocumentReferenceModule(ApplicationContainer);

export const getInjection = <K extends keyof typeof DI_SYMBOLS>(
  symbol: K,
): DI_RETURN_TYPES[K] => {
  return ApplicationContainer.get(DI_SYMBOLS[symbol]);
};
