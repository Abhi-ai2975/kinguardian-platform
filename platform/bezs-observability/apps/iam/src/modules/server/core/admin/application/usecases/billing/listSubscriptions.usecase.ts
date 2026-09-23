import type { TListSubscriptionsResponseDto } from "@/modules/entities/schemas/admin/billing/billing.schema";
import { getInjection } from "@/modules/server/di/container";

export async function listSubscriptionsUseCase(): Promise<TListSubscriptionsResponseDto> {
  const billingService = getInjection("IBillingService");
  return billingService.listSubscriptions();
}
