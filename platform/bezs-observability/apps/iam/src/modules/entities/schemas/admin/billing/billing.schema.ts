// Zod schemas and TypeScript types for the billing admin domain.
// These schemas are used to validate I/O at the controller boundary
// and to type action payloads — no framework imports allowed here.

import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";

// ── Subscription row (as stored / returned from the service) ─────────────────

export const SubscriptionSchema = z.object({
  id: z.string(),
  plan: z.string(),
  referenceId: z.string(),
  stripeCustomerId: z.string().nullable().optional(),
  stripeSubscriptionId: z.string().nullable().optional(),
  status: z.string(),
  periodStart: z.coerce.date().nullable().optional(),
  periodEnd: z.coerce.date().nullable().optional(),
  trialStart: z.coerce.date().nullable().optional(),
  trialEnd: z.coerce.date().nullable().optional(),
  cancelAtPeriodEnd: z.boolean().nullable().optional(),
  cancelAt: z.coerce.date().nullable().optional(),
  canceledAt: z.coerce.date().nullable().optional(),
  endedAt: z.coerce.date().nullable().optional(),
  seats: z.number().nullable().optional(),
  billingInterval: z.string().nullable().optional(),
  stripeScheduleId: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  // Joined user fields (populated by service)
  userEmail: z.string().nullable().optional(),
  userName: z.string().nullable().optional(),
});

export type TSubscription = z.infer<typeof SubscriptionSchema>;

// ── List subscriptions ────────────────────────────────────────────────────────

export const ListSubscriptionsResponseDtoSchema = z.array(SubscriptionSchema);
export type TListSubscriptionsResponseDto = z.infer<typeof ListSubscriptionsResponseDtoSchema>;

// ── Cancel subscription ───────────────────────────────────────────────────────

export const CancelSubscriptionValidationSchema = z.object({
  subscriptionId: z.string().min(1, "Subscription ID is required"),
  cancelAtPeriodEnd: z.boolean().default(true),
});
export type TCancelSubscriptionValidation = z.infer<typeof CancelSubscriptionValidationSchema>;

export const CancelSubscriptionResponseDtoSchema = z.object({
  success: z.boolean(),
  subscriptionId: z.string(),
});
export type TCancelSubscriptionResponseDto = z.infer<typeof CancelSubscriptionResponseDtoSchema>;

// ── Action schemas (ZSA payload wrappers) ─────────────────────────────────────

export const CancelSubscriptionActionSchema = z.object({
  payload: CancelSubscriptionValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCancelSubscriptionActionSchema = z.infer<typeof CancelSubscriptionActionSchema>;
