import type { TSubscription, TListSubscriptionsResponseDto } from "@/modules/entities/schemas/admin/billing/billing.schema";
import type { ZSAError } from "zsa";

export type TSubscriptionRow = TSubscription;

export interface ISubscriptionsTableProps {
  subscriptions: TListSubscriptionsResponseDto | null | undefined;
  error: ZSAError | null | undefined;
}
