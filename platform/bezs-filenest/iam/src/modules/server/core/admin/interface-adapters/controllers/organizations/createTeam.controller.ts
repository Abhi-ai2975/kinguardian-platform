import { CreateTeamValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createTeamUseCase } from "../../../application/usecases/organizations/createTeam.usecase";

function presenter(data: { success: boolean }) {
  return data;
}

export type TCreateTeamControllerOutput = ReturnType<typeof presenter>;

export async function createTeamController(input: unknown): Promise<TCreateTeamControllerOutput> {
  const parsed = await CreateTeamValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createTeamUseCase(parsed.data);
  return presenter(data);
}
