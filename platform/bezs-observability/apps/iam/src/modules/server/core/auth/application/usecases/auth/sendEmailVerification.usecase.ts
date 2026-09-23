import {
  TSendEmailVerificationDtoSchema,
  TSendVerificationEmailValidationSchema
} from "@/modules/entities/schemas/auth"
import { getServerSession } from "@/modules/server/auth-provider/auth-server"
import { getInjection } from "@/modules/server/di/container"

export async function sendEmailVerificationUseCase(
  payload: TSendVerificationEmailValidationSchema
): Promise<TSendEmailVerificationDtoSchema> {
  const session = await getServerSession()
  // Only block if there is an active session and email is already verified.
  // When requireEmailVerification is enabled, no session exists after signup — allow resend.
  if (session?.user.emailVerified) throw new Error("Email already verified!")

  // TODO: Implement redis to set and check cooldown for 30s

  const authService = getInjection("IAuthService")
  const data = await authService.sendEmailVerification(payload)
  return data
}
