"use server";

import { authenticatedProcedure } from "../procedures";
import { runWithTransport } from "../../transport/runWithTransport";
import {
  getUserPreferenceController,
  TGetUserPreferenceControllerOutput,
  updateUserPreferenceController,
  TUpdateUserPreferenceControllerOutput,
} from "@/modules/server/core/settings/interface-adapters/controllers";
import { UpdateUserPreferenceActionSchema } from "@/modules/entities/schemas/settings/preference/preference.schema";

export const getUserPreferenceAction =
  authenticatedProcedure.createServerAction().handler(async ({ ctx }) => {
    return await runWithTransport<TGetUserPreferenceControllerOutput>(
      async () => {
        const data = await getUserPreferenceController(ctx.session.user.id);
        return { result: data };
      },
    );
  });

export const updateUserPreferenceAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateUserPreferenceActionSchema, { skipInputParsing: true })
  .handler(async ({ input, ctx }) => {
    return await runWithTransport<TUpdateUserPreferenceControllerOutput>(
      async () => {
        const data = await updateUserPreferenceController({
          ...input.payload,
          userId: ctx.session.user.id,
        });
        return { result: data, transport: input.transportOptions };
      },
    );
  });
