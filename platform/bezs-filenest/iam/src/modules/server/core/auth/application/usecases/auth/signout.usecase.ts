import { TSignoutResponseDtoSchema } from "@/modules/entities/schemas/auth"
import { getInjection } from "@/modules/server/di/container"

export async function signoutUseCase(): Promise<TSignoutResponseDtoSchema> {
  const authService = getInjection("IAuthService")
  const data = authService.signOut()
  return data
}
