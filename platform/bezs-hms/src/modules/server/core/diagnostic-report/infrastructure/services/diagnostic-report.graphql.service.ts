/**
 * DiagnosticReport GraphQL service stub.
 * Layer: server / core / diagnostic-report / infrastructure
 * Not yet implemented — set FHIR_TRANSPORT=rest (the default).
 */
import { IDiagnosticReportService } from "../../domain/interfaces/diagnostic-report.service.interface";
import {
  type TDiagnosticReportResponse,
  type TPaginatedDiagnosticReportResponse,
  type TCreateDiagnosticReport,
  type TUpdateDiagnosticReportDto,
  type TListDiagnosticReportsQuery,
} from "@/modules/entities/schemas/diagnostic-report";

export class DiagnosticReportGraphQLService implements IDiagnosticReportService {
  create(_dto: TCreateDiagnosticReport): Promise<TDiagnosticReportResponse> {
    throw new Error("DiagnosticReportGraphQLService.create is not yet implemented. Set FHIR_TRANSPORT=rest.");
  }
  list(_query?: TListDiagnosticReportsQuery): Promise<TPaginatedDiagnosticReportResponse> {
    throw new Error("DiagnosticReportGraphQLService.list is not yet implemented. Set FHIR_TRANSPORT=rest.");
  }
  getById(_id: number): Promise<TDiagnosticReportResponse> {
    throw new Error("DiagnosticReportGraphQLService.getById is not yet implemented. Set FHIR_TRANSPORT=rest.");
  }
  update(_id: number, _dto: TUpdateDiagnosticReportDto): Promise<TDiagnosticReportResponse> {
    throw new Error("DiagnosticReportGraphQLService.update is not yet implemented. Set FHIR_TRANSPORT=rest.");
  }
  delete(_id: number): Promise<void> {
    throw new Error("DiagnosticReportGraphQLService.delete is not yet implemented. Set FHIR_TRANSPORT=rest.");
  }
}
