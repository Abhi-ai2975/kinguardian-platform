import {
  TSendMagicLinkDtoSchema,
  TSendMagicLinkValidationSchema,
} from "@/modules/entities/schemas/auth";
import { getInjection } from "@/modules/server/di/container";

export async function sendMagicLinkUseCase(
  payload: TSendMagicLinkValidationSchema,
): Promise<TSendMagicLinkDtoSchema> {
  const authService = getInjection("IAuthService");
  return await authService.sendMagicLink(payload);
}
