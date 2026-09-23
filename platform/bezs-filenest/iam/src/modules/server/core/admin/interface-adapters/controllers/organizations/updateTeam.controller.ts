import { UpdateTeamValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updateTeamUseCase } from "../../../application/usecases/organizations/updateTeam.usecase";

function presenter(data: { success: boolean }) {
  return data;
}

export type TUpdateTeamControllerOutput = ReturnType<typeof presenter>;

export async function updateTeamController(input: unknown): Promise<TUpdateTeamControllerOutput> {
  const parsed = await UpdateTeamValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await updateTeamUseCase(parsed.data);
  return presenter(data);
}
