"use server";

import { superadminProcedure } from "../procedures";
import { runWithTransport } from "../../transport/runWithTransport";
import {
  getPreferenceTemplatesController,
  TGetPreferenceTemplatesControllerOutput,
  createPreferenceTemplateController,
  TCreatePreferenceTemplateControllerOutput,
  updatePreferenceTemplateController,
  TUpdatePreferenceTemplateControllerOutput,
  deletePreferenceTemplateController,
  TDeletePreferenceTemplateControllerOutput,
} from "@/modules/server/core/admin/interface-adapters/controllers/preference-templates";
import {
  CreatePreferenceTemplateActionSchema,
  UpdatePreferenceTemplateActionSchema,
  DeletePreferenceTemplateActionSchema,
} from "@/modules/entities/schemas/admin/preference-templates/preference-template.schema";

export const getPreferenceTemplatesAction =
  superadminProcedure.createServerAction().handler(async () => {
    return await runWithTransport<TGetPreferenceTemplatesControllerOutput>(
      async () => {
        const data = await getPreferenceTemplatesController();
        return { result: data };
      },
    );
  });

export const createPreferenceTemplateAction = superadminProcedure
  .createServerAction()
  .input(CreatePreferenceTemplateActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TCreatePreferenceTemplateControllerOutput>(
      async () => {
        const data = await createPreferenceTemplateController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });

export const updatePreferenceTemplateAction = superadminProcedure
  .createServerAction()
  .input(UpdatePreferenceTemplateActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TUpdatePreferenceTemplateControllerOutput>(
      async () => {
        const data = await updatePreferenceTemplateController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });

export const deletePreferenceTemplateAction = superadminProcedure
  .createServerAction()
  .input(DeletePreferenceTemplateActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TDeletePreferenceTemplateControllerOutput>(
      async () => {
        const data = await deletePreferenceTemplateController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });
