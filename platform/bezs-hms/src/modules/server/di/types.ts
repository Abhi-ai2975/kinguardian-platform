import { IOrganizationsService } from "../core/organization/domain/interfaces/organization.service.interface";
import { ILocationsService } from "../core/location/domain/interfaces/location.service.interface";
import { IHealthcareServicesService } from "../core/healthcare-service/domain/interfaces/healthcare-service.service.interface";
import { ISchedulesService } from "../core/schedule/domain/interfaces/schedule.service.interface";
import { IPatientsService } from "../core/patient/domain/interfaces/patient.service.interface";
import { ITerminologyService } from "../core/terminology/domain/interfaces/terminology.service.interface";
import { IEmrChatRepository } from "../core/emr-chat/domain/interfaces/emr-chat.repository.interface";
import { IPractitionersService } from "../core/practitioner/domain/interfaces/practitioner.service.interface";
import { IPractitionerRolesService } from "../core/practitioner-role/domain/interfaces/practitioner-role.service.interface";
import { ISlotService } from "../core/slot/domain/interfaces/slot.service.interface";
import { IAppointmentService } from "../core/appointment/domain/interfaces/appointment.service.interface";
import { IIntakeRepository } from "../core/intake/domain/interfaces/intake.repository.interface";
import { IConsultationRepository } from "../core/consultation/domain/interfaces/consultation.repository.interface";
import { IAiConsultationRepository } from "../core/ai-consultation/domain/interfaces/ai-consultation.repository.interface";
import { IEncounterService } from "../core/encounter/domain/interfaces/encounter.service.interface";
import { IServiceRequestService } from "../core/service-request/domain/interfaces/service-request.service.interface";
import { IMedicationRequestService } from "../core/medication-request/domain/interfaces/medication-request.service.interface";
import { IObservationService } from "../core/observation/domain/interfaces/observation.service.interface";
import { IConditionService } from "../core/condition/domain/interfaces/condition.service.interface";
import { IDiagnosticReportService } from "../core/diagnostic-report/domain/interfaces/diagnostic-report.service.interface";
import { IDocumentReferenceService } from "../core/document-reference/domain/interfaces/document-reference.service.interface";

export const DI_SYMBOLS = {
  IPatientsService: Symbol.for("IPatientsService"),
  IOrganizationsService: Symbol.for("IOrganizationsService"),
  ILocationsService: Symbol.for("ILocationsService"),
  IHealthcareServicesService: Symbol.for("IHealthcareServicesService"),
  ISchedulesService: Symbol.for("ISchedulesService"),
  ITerminologyService: Symbol.for("ITerminologyService"),
  IEmrChatRepository: Symbol.for("IEmrChatRepository"),
  IPractitionersService: Symbol.for("IPractitionersService"),
  IPractitionerRolesService: Symbol.for("IPractitionerRolesService"),
  ISlotService: Symbol.for("ISlotService"),
  IAppointmentService: Symbol.for("IAppointmentService"),
  IIntakeRepository: Symbol.for("IIntakeRepository"),
  IConsultationRepository: Symbol.for("IConsultationRepository"),
  IAiConsultationRepository: Symbol.for("IAiConsultationRepository"),
  IEncounterService: Symbol.for("IEncounterService"),
  IServiceRequestService: Symbol.for("IServiceRequestService"),
  IMedicationRequestService: Symbol.for("IMedicationRequestService"),
  IObservationService: Symbol.for("IObservationService"),
  IConditionService: Symbol.for("IConditionService"),
  IDiagnosticReportService: Symbol.for("IDiagnosticReportService"),
  IDocumentReferenceService: Symbol.for("IDocumentReferenceService"),
};

export interface DI_RETURN_TYPES {
  IPatientsService: IPatientsService;
  IOrganizationsService: IOrganizationsService;
  ILocationsService: ILocationsService;
  IHealthcareServicesService: IHealthcareServicesService;
  ISchedulesService: ISchedulesService;
  ITerminologyService: ITerminologyService;
  IEmrChatRepository: IEmrChatRepository;
  IPractitionersService: IPractitionersService;
  IPractitionerRolesService: IPractitionerRolesService;
  ISlotService: ISlotService;
  IAppointmentService: IAppointmentService;
  IIntakeRepository: IIntakeRepository;
  IConsultationRepository: IConsultationRepository;
  IAiConsultationRepository: IAiConsultationRepository;
  IEncounterService: IEncounterService;
  IServiceRequestService: IServiceRequestService;
  IMedicationRequestService: IMedicationRequestService;
  IObservationService: IObservationService;
  IConditionService: IConditionService;
  IDiagnosticReportService: IDiagnosticReportService;
  IDocumentReferenceService: IDocumentReferenceService;
}
