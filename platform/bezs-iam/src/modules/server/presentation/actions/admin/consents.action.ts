"use server";

import { superadminProcedure } from "../procedures";
import { runWithTransport } from "../../transport/runWithTransport";
import {
  listConsentsController,
  TListConsentsControllerOutput,
  getConsentController,
  TGetConsentControllerOutput,
  updateConsentScopesController,
  TUpdateConsentScopesControllerOutput,
  deleteConsentController,
  TDeleteConsentControllerOutput,
} from "@/modules/server/core/admin/interface-adapters/controllers/consents";
import {
  DeleteConsentActionSchema,
  UpdateConsentScopesActionSchema,
} from "@/modules/entities/schemas/admin/consents/consents.schema";
import z from "zod";

// ---------------------------------------------------------- //
// Query actions
// ---------------------------------------------------------- //

export const listConsentsAction = superadminProcedure.createServerAction().handler(async () => {
  return await runWithTransport<TListConsentsControllerOutput>(async () => {
    const data = await listConsentsController();
    return { result: data };
  });
});

export const getConsentAction = superadminProcedure.createServerAction()
  .input(z.object({ id: z.string() }))
  .handler(async ({ input }) => {
    return await runWithTransport<TGetConsentControllerOutput>(async () => {
      const data = await getConsentController({ id: input.id });
      return { result: data };
    });
  });

// ---------------------------------------------------------- //
// Mutation actions
// ---------------------------------------------------------- //

export const updateConsentScopesAction = superadminProcedure.createServerAction()
  .input(UpdateConsentScopesActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TUpdateConsentScopesControllerOutput>(
      async () => {
        const data = await updateConsentScopesController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });

export const deleteConsentAction = superadminProcedure.createServerAction()
  .input(DeleteConsentActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TDeleteConsentControllerOutput>(async () => {
      const data = await deleteConsentController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });
