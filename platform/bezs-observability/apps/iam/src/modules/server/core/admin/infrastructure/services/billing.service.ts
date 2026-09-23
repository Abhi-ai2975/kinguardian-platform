// BillingService: infrastructure adapter that queries the subscription table
// via Prisma and calls the Stripe API for mutations.
// Reads go directly to Prisma because the Stripe plugin does not expose
// admin-scoped list endpoints; cancellations go through the Stripe API
// so that webhooks fire and the local subscription row is updated by the
// plugin's webhook handler.

import { randomUUID } from "crypto";
import Stripe from "stripe";
import { IBillingService } from "@/modules/server/core/admin/domain/interfaces/billing.service.interface";
import type {
  TListSubscriptionsResponseDto,
  TCancelSubscriptionValidation,
  TCancelSubscriptionResponseDto,
} from "@/modules/entities/schemas/admin/billing/billing.schema";
import { prisma } from "../../../../../../../prisma/db";
import { logOperation } from "@/modules/server/config/logger/log-operation";

// Stripe client singleton — shared across service calls, not per-request.
const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

type SubscriptionRow = Awaited<ReturnType<typeof prisma.subscription.findMany>>[number];
type UserRow = { id: string; email: string; name: string };

export class BillingService implements IBillingService {
  async listSubscriptions(): Promise<TListSubscriptionsResponseDto> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "BillingService.listSubscriptions", startTimeMs, context: { operationId } });
    try {
      const rows = await prisma.subscription.findMany({
        orderBy: { createdAt: "desc" },
      });

      // Resolve user emails/names for each referenceId in a single batched query.
      const referenceIds = [...new Set(rows.map((r: SubscriptionRow) => r.referenceId))];
      const users = await prisma.user.findMany({
        where: { id: { in: referenceIds } },
        select: { id: true, email: true, name: true },
      });
      const userMap = new Map(users.map((u: UserRow) => [u.id, u]));

      const data: TListSubscriptionsResponseDto = rows.map((row: SubscriptionRow) => {
        const user = userMap.get(row.referenceId);
        return {
          id: row.id,
          plan: row.plan,
          referenceId: row.referenceId,
          stripeCustomerId: row.stripeCustomerId ?? null,
          stripeSubscriptionId: row.stripeSubscriptionId ?? null,
          status: row.status,
          periodStart: row.periodStart ?? null,
          periodEnd: row.periodEnd ?? null,
          trialStart: row.trialStart ?? null,
          trialEnd: row.trialEnd ?? null,
          cancelAtPeriodEnd: row.cancelAtPeriodEnd ?? null,
          cancelAt: row.cancelAt ?? null,
          canceledAt: row.canceledAt ?? null,
          endedAt: row.endedAt ?? null,
          seats: row.seats ?? null,
          billingInterval: row.billingInterval ?? null,
          stripeScheduleId: row.stripeScheduleId ?? null,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          userEmail: user?.email ?? null,
          userName: user?.name ?? null,
        };
      });

      logOperation("success", { name: "BillingService.listSubscriptions", startTimeMs, data: { count: data.length }, context: { operationId } });
      return data;
    } catch (error) {
      logOperation("error", { name: "BillingService.listSubscriptions", startTimeMs, err: error, context: { operationId } });
      throw error;
    }
  }

  async cancelSubscription(
    payload: TCancelSubscriptionValidation,
  ): Promise<TCancelSubscriptionResponseDto> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "BillingService.cancelSubscription",
      startTimeMs,
      context: { operationId, subscriptionId: payload.subscriptionId },
    });
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: payload.subscriptionId },
      });

      if (!subscription) {
        throw new Error(`Subscription not found: ${payload.subscriptionId}`);
      }

      if (!subscription.stripeSubscriptionId) {
        throw new Error("Subscription has no Stripe subscription ID — cannot cancel via Stripe");
      }

      if (payload.cancelAtPeriodEnd) {
        // Soft cancel: let the subscription run until period end, then cancel.
        await stripeClient.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      } else {
        // Hard cancel: cancel immediately.
        await stripeClient.subscriptions.cancel(subscription.stripeSubscriptionId);
      }

      const data = { success: true, subscriptionId: payload.subscriptionId };
      logOperation("success", {
        name: "BillingService.cancelSubscription",
        startTimeMs,
        data,
        context: { operationId, subscriptionId: payload.subscriptionId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "BillingService.cancelSubscription",
        startTimeMs,
        err: error,
        context: { operationId, subscriptionId: payload.subscriptionId },
      });
      throw error;
    }
  }
}
