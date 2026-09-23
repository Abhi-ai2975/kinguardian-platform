import { RemoveTeamValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { removeTeamUseCase } from "../../../application/usecases/organizations/removeTeam.usecase";

function presenter(data: { success: boolean }) {
  return data;
}

export type TRemoveTeamControllerOutput = ReturnType<typeof presenter>;

export async function removeTeamController(input: unknown): Promise<TRemoveTeamControllerOutput> {
  const parsed = await RemoveTeamValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await removeTeamUseCase(parsed.data);
  return presenter(data);
}
