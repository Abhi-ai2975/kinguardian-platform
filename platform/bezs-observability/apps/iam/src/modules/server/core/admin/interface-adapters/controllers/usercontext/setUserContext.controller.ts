import { setUserContextUseCase } from "../../../application/usecases/usercontext/setUserContext.usecase";
import { SetUserContextValidationSchema } from "@/modules/entities/schemas/admin/user-context/user-context.schema";

function presenter(data: { success: boolean }) {
  return data;
}

export type TSetUserContextControllerOutput = ReturnType<typeof presenter>;

export async function setUserContextController(
  payload: unknown,
): Promise<TSetUserContextControllerOutput> {
  const parsed = await SetUserContextValidationSchema.safeParseAsync(payload);
  if (!parsed.success) {
    throw new Error("Invalid payload: " + parsed.error.message);
  }
  const data = await setUserContextUseCase(parsed.data);
  return presenter(data);
}
