/**
 * controllers/index.ts — barrel for consultation interface-adapter controllers.
 *
 * Layer: server / core / consultation / interface-adapters / controllers
 */

export {
  createConsultationController,
  type TCreateConsultationControllerOutput,
} from "./createConsultation.controller";

export {
  getConsultationByFhirAppointmentIdController,
  type TGetConsultationByFhirAppointmentIdControllerOutput,
} from "./getConsultationByFhirAppointmentId.controller";

export {
  completeConsultationController,
  type TCompleteConsultationControllerOutput,
} from "./completeConsultation.controller";

export {
  saveClinicalDataController,
  type TSaveClinicalDataControllerOutput,
} from "./saveClinicalData.controller";

export {
  abandonConsultationController,
  type TAbandonConsultationControllerOutput,
} from "./abandonConsultation.controller";

export {
  listConsultationsController,
  type TListConsultationsControllerOutput,
} from "./listConsultations.controller";
