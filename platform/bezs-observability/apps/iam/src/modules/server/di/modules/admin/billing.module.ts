import { DI_SYMBOLS } from "../../types";
import { Container } from "@evyweb/ioctopus";
import { BillingService } from "@/modules/server/core/admin/infrastructure/services/billing.service";

export function registerBillingModule(container: Container) {
  container.bind(DI_SYMBOLS.IBillingService).toClass(BillingService);
}
