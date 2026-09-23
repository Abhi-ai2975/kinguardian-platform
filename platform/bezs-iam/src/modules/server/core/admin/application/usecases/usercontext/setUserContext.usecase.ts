import { getInjection } from "@/modules/server/di/container";
import { TSetUserContextValidationSchema } from "@/modules/entities/schemas/admin/user-context/user-context.schema";

export async function setUserContextUseCase(
  payload: TSetUserContextValidationSchema,
): Promise<{ success: boolean }> {
  const repository = getInjection("IUserContextRepository");
  return repository.setUserContext(payload);
}
