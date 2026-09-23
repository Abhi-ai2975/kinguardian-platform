"use server";

import { superadminProcedure } from "../procedures";
import { runWithTransport } from "../../transport/runWithTransport";
import {
  getAllSessionsController,
  TGetAllSessionsControllerOutput,
  revokeSessionController,
  TRevokeSessionControllerOutput,
  revokeAllSessionsController,
  TRevokeAllSessionsControllerOutput,
} from "@/modules/server/core/admin/interface-adapters/controllers/sessions";
import {
  RevokeSessionActionSchema,
  RevokeAllSessionsActionSchema,
} from "@/modules/entities/schemas/admin/sessions/sessions.schema";

export const getAllSessionsAction = superadminProcedure.createServerAction().handler(async () => {
  return await runWithTransport<TGetAllSessionsControllerOutput>(async () => {
    const data = await getAllSessionsController();
    return { result: data };
  });
});

export const revokeSessionAction = superadminProcedure.createServerAction()
  .input(RevokeSessionActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TRevokeSessionControllerOutput>(async () => {
      const data = await revokeSessionController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const revokeAllSessionsAction = superadminProcedure.createServerAction()
  .input(RevokeAllSessionsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TRevokeAllSessionsControllerOutput>(async () => {
      const data = await revokeAllSessionsController();
      return { result: data, transport: input.transportOptions };
    });
  });
