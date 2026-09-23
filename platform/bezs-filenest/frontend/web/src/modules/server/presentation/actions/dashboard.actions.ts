/**
 * server/presentation/actions/dashboard.actions — ZSA server action for the dashboard.
 *
 * Layer: presentation / actions
 * Resource: Dashboard
 *
 * getDashboardAction — returns the full dashboard payload for the active org.
 * Called from the RSC dashboard page via await getDashboardAction({}).
 *
 * @module
 */
"use server";

import { authenticatedProcedure } from "./procedures";
import { runWithTransport } from "@/modules/server/utils/run-with-transport";
import {
  getDashboardController,
  type TGetDashboardControllerOutput,
} from "@/modules/server/core/dashboard/interface-adapters/controllers";
import {
  GetDashboardActionSchema,
  type TGetDashboardAction,
} from "@/modules/entities/schemas/dashboard";

export const getDashboardAction = authenticatedProcedure
  .createServerAction()
  .input(GetDashboardActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetDashboardAction }) => {
    return await runWithTransport<TGetDashboardControllerOutput>(async () => {
      const data = await getDashboardController();
      return { result: data, transport: input.transportOptions };
    });
  });
