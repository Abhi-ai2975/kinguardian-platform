/**
 * DiagnosticReport ZSA server actions.
 * Layer: server / presentation / actions / diagnostic-report
 * All actions require a valid session (authenticatedProcedure).
 */
"use server";

import {
  CreateDiagnosticReportActionSchema,
  ListDiagnosticReportsActionSchema,
  GetDiagnosticReportByIdActionSchema,
  UpdateDiagnosticReportActionSchema,
  DeleteDiagnosticReportActionSchema,
  type TCreateDiagnosticReportAction,
  type TListDiagnosticReportsAction,
  type TGetDiagnosticReportByIdAction,
  type TUpdateDiagnosticReportAction,
  type TDeleteDiagnosticReportAction,
} from "@/modules/entities/schemas/diagnostic-report";
import {
  createDiagnosticReportController,
  listDiagnosticReportsController,
  getDiagnosticReportByIdController,
  updateDiagnosticReportController,
  deleteDiagnosticReportController,
  type TCreateDiagnosticReportControllerOutput,
  type TListDiagnosticReportsControllerOutput,
  type TGetDiagnosticReportByIdControllerOutput,
  type TUpdateDiagnosticReportControllerOutput,
} from "@/modules/server/core/diagnostic-report/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";

export const createDiagnosticReportAction = authenticatedProcedure
  .createServerAction()
  .input(CreateDiagnosticReportActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TCreateDiagnosticReportAction }) => {
    return await runWithTransport<TCreateDiagnosticReportControllerOutput>(async () => {
      const data = await createDiagnosticReportController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const listDiagnosticReportsAction = authenticatedProcedure
  .createServerAction()
  .input(ListDiagnosticReportsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListDiagnosticReportsAction }) => {
    return await runWithTransport<TListDiagnosticReportsControllerOutput>(async () => {
      const data = await listDiagnosticReportsController(input.payload);
      return { result: data };
    });
  });

export const getDiagnosticReportByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetDiagnosticReportByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetDiagnosticReportByIdAction }) => {
    return await runWithTransport<TGetDiagnosticReportByIdControllerOutput>(async () => {
      const data = await getDiagnosticReportByIdController(input.payload);
      return { result: data };
    });
  });

export const updateDiagnosticReportAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateDiagnosticReportActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateDiagnosticReportAction }) => {
    return await runWithTransport<TUpdateDiagnosticReportControllerOutput>(async () => {
      const data = await updateDiagnosticReportController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const deleteDiagnosticReportAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteDiagnosticReportActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteDiagnosticReportAction }) => {
    return await runWithTransport<void>(async () => {
      await deleteDiagnosticReportController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
