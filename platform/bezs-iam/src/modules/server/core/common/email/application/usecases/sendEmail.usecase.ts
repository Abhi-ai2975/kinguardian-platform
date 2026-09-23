import { TSendEmailValidationSchema } from "@/modules/entities/schemas/email";
import { getInjection } from "@/modules/server/di/container";

export async function sendEmailUseCase(
  payload: TSendEmailValidationSchema
): Promise<void> {
  const emailService = getInjection("IEmailService");
  await emailService.send(payload);
}
