/**
 * server/presentation/actions/usage.actions — ZSA server action for the usage page.
 *
 * Layer: presentation / actions
 * Resource: Usage
 *
 * getUsageAction — returns org-level stats and per-project breakdown.
 * Called from the RSC usage page via await getUsageAction({}).
 *
 * @module
 */
"use server";

import { authenticatedProcedure } from "./procedures";
import { runWithTransport } from "@/modules/server/utils/run-with-transport";
import {
  getUsageController,
  type TGetUsageControllerOutput,
} from "@/modules/server/core/usage/interface-adapters/controllers";
import {
  GetUsageActionSchema,
  type TGetUsageAction,
} from "@/modules/entities/schemas/usage";

export const getUsageAction = authenticatedProcedure
  .createServerAction()
  .input(GetUsageActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetUsageAction }) => {
    return await runWithTransport<TGetUsageControllerOutput>(async () => {
      const data = await getUsageController();
      return { result: data, transport: input.transportOptions };
    });
  });
