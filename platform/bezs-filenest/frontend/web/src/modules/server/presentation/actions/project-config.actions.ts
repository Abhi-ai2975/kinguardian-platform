/**
 * project-config.actions — ZSA server actions for project configuration.
 *
 * getProjectConfigAction          — read; safe to call from RSC pages.
 * updateUploadConfigAction        — mutation; upload restrictions.
 * updateSecurityConfigAction      — mutation; network security settings.
 * updateProcessingConfigAction    — mutation; processing feature flags.
 * updateComplianceConfigAction    — mutation; compliance settings.
 *
 * @module
 */
"use server";

import { authenticatedProcedure } from "./procedures";
import { runWithTransport } from "@/modules/server/utils/run-with-transport";
import {
  getProjectConfigController,
  updateUploadConfigController,
  updateSecurityConfigController,
  updateProcessingConfigController,
  updateComplianceConfigController,
  type TGetProjectConfigControllerOutput,
  type TUpdateUploadConfigControllerOutput,
  type TUpdateSecurityConfigControllerOutput,
  type TUpdateProcessingConfigControllerOutput,
  type TUpdateComplianceConfigControllerOutput,
} from "@/modules/server/core/project-config/interface-adapters/controllers";
import {
  GetProjectConfigActionSchema,
  UpdateUploadConfigActionSchema,
  UpdateSecurityConfigActionSchema,
  UpdateProcessingConfigActionSchema,
  UpdateComplianceConfigActionSchema,
  type TGetProjectConfigAction,
  type TUpdateUploadConfigAction,
  type TUpdateSecurityConfigAction,
  type TUpdateProcessingConfigAction,
  type TUpdateComplianceConfigAction,
} from "@/modules/entities/schemas/project-config";

export const getProjectConfigAction = authenticatedProcedure
  .createServerAction()
  .input(GetProjectConfigActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetProjectConfigAction }) => {
    return await runWithTransport<TGetProjectConfigControllerOutput>(async () => {
      const data = await getProjectConfigController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const updateUploadConfigAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateUploadConfigActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateUploadConfigAction }) => {
    return await runWithTransport<TUpdateUploadConfigControllerOutput>(async () => {
      const data = await updateUploadConfigController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const updateSecurityConfigAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateSecurityConfigActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateSecurityConfigAction }) => {
    return await runWithTransport<TUpdateSecurityConfigControllerOutput>(async () => {
      const data = await updateSecurityConfigController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const updateProcessingConfigAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateProcessingConfigActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateProcessingConfigAction }) => {
    return await runWithTransport<TUpdateProcessingConfigControllerOutput>(async () => {
      const data = await updateProcessingConfigController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const updateComplianceConfigAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateComplianceConfigActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateComplianceConfigAction }) => {
    return await runWithTransport<TUpdateComplianceConfigControllerOutput>(async () => {
      const data = await updateComplianceConfigController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });
