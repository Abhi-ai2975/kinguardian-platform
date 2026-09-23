import type {
  TCancelSubscriptionValidation,
  TCancelSubscriptionResponseDto,
} from "@/modules/entities/schemas/admin/billing/billing.schema";
import { getInjection } from "@/modules/server/di/container";

export async function cancelSubscriptionUseCase(
  payload: TCancelSubscriptionValidation,
): Promise<TCancelSubscriptionResponseDto> {
  const billingService = getInjection("IBillingService");
  return billingService.cancelSubscription(payload);
}
