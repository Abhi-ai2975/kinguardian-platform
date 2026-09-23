// IBillingService: port interface for subscription management operations.
// The use-case layer depends on this interface rather than concrete
// infrastructure so that tests can inject a fake without a live database
// or Stripe account.

import type {
  TListSubscriptionsResponseDto,
  TCancelSubscriptionValidation,
  TCancelSubscriptionResponseDto,
} from "@/modules/entities/schemas/admin/billing/billing.schema";

export interface IBillingService {
  // Returns all subscriptions across all users with joined user info.
  listSubscriptions(): Promise<TListSubscriptionsResponseDto>;

  // Cancels a subscription immediately or at period end via the Stripe API.
  cancelSubscription(
    payload: TCancelSubscriptionValidation,
  ): Promise<TCancelSubscriptionResponseDto>;
}
