/**
 * DiagnosticReport ZSA server action input schemas.
 * Layer: entities / schemas / diagnostic-report
 * Mutating actions (create/update/delete) include transportOptions for
 * revalidation/redirect after the action completes.
 */
import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  CreateDiagnosticReportValidationSchema,
  UpdateDiagnosticReportValidationSchema,
  ListDiagnosticReportsValidationSchema,
  GetByIdDiagnosticReportValidationSchema,
  DeleteDiagnosticReportValidationSchema,
} from "./input";

export const CreateDiagnosticReportActionSchema = z.object({
  payload: CreateDiagnosticReportValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateDiagnosticReportAction = z.infer<typeof CreateDiagnosticReportActionSchema>;

export const ListDiagnosticReportsActionSchema = z.object({
  payload: ListDiagnosticReportsValidationSchema.optional(),
});
export type TListDiagnosticReportsAction = z.infer<typeof ListDiagnosticReportsActionSchema>;

export const GetDiagnosticReportByIdActionSchema = z.object({
  payload: GetByIdDiagnosticReportValidationSchema,
});
export type TGetDiagnosticReportByIdAction = z.infer<typeof GetDiagnosticReportByIdActionSchema>;

export const UpdateDiagnosticReportActionSchema = z.object({
  payload: UpdateDiagnosticReportValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateDiagnosticReportAction = z.infer<typeof UpdateDiagnosticReportActionSchema>;

export const DeleteDiagnosticReportActionSchema = z.object({
  payload: DeleteDiagnosticReportValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteDiagnosticReportAction = z.infer<typeof DeleteDiagnosticReportActionSchema>;
