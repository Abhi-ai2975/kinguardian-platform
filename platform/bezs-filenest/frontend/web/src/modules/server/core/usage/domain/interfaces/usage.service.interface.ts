/**
 * usage.service.interface — contract for the usage service.
 *
 * @module
 */
import type { TUsageResponse } from "@/modules/entities/schemas/usage";

export interface IUsageService {
  get(): Promise<TUsageResponse>;
}
