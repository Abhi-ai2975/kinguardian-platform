"use server";

import { superadminProcedure } from "../procedures";
import { runWithTransport } from "../../transport/runWithTransport";
import { CancelSubscriptionActionSchema } from "@/modules/entities/schemas/admin/billing/billing.schema";
import {
  listSubscriptionsController,
  cancelSubscriptionController,
  type TListSubscriptionsControllerOutput,
  type TCancelSubscriptionControllerOutput,
} from "@/modules/server/core/admin/interface-adapters/controllers/billing";

export const listSubscriptionsAction = superadminProcedure.createServerAction().handler(async () => {
  return await runWithTransport<TListSubscriptionsControllerOutput>(async () => {
    const data = await listSubscriptionsController();
    return { result: data };
  });
});

export const cancelSubscriptionAction = superadminProcedure.createServerAction()
  .input(CancelSubscriptionActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TCancelSubscriptionControllerOutput>(async () => {
      const data = await cancelSubscriptionController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });
