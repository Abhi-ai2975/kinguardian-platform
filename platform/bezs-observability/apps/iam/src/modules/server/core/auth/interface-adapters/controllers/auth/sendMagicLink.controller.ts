import {
  SendMagicLinkValidationSchema,
  TSendMagicLinkDtoSchema,
} from "@/modules/entities/schemas/auth";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { sendMagicLinkUseCase } from "../../../application/usecases/auth/sendMagicLink.usecase";

function presenter(data: TSendMagicLinkDtoSchema) {
  return data;
}

export type TSendMagicLinkControllerOutput = ReturnType<typeof presenter>;

export async function sendMagicLinkController(
  input: unknown,
): Promise<TSendMagicLinkControllerOutput> {
  const parsed = await SendMagicLinkValidationSchema.safeParseAsync(input);

  if (!parsed.success) {
    throw new InputParseError(parsed.error);
  }

  const data = await sendMagicLinkUseCase(parsed.data);
  return presenter(data);
}
