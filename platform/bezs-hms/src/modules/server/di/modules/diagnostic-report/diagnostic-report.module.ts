/**
 * DiagnosticReport DI module.
 * Layer: server / di / modules / diagnostic-report
 * Binds IDiagnosticReportService to the REST implementation (default) or
 * GraphQL stub when FHIR_TRANSPORT=graphql.
 */
import { type Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { DiagnosticReportRestApiService } from "@/modules/server/core/diagnostic-report/infrastructure/services/diagnostic-report.rest.service";
import { DiagnosticReportGraphQLService } from "@/modules/server/core/diagnostic-report/infrastructure/services/diagnostic-report.graphql.service";

const transport = process.env.FHIR_TRANSPORT ?? "rest";

export function registerDiagnosticReportModule(container: Container): void {
  container
    .bind(DI_SYMBOLS.IDiagnosticReportService)
    .toClass(transport === "graphql" ? DiagnosticReportGraphQLService : DiagnosticReportRestApiService);
}
