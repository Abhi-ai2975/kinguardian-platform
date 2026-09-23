import {
  CancelSubscriptionValidationSchema,
  CancelSubscriptionResponseDtoSchema,
  type TCancelSubscriptionResponseDto,
} from "@/modules/entities/schemas/admin/billing/billing.schema";
import { cancelSubscriptionUseCase } from "@/modules/server/core/admin/application/usecases/billing/cancelSubscription.usecase";
import { InputParseError, OutputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: TCancelSubscriptionResponseDto) {
  return data;
}

export type TCancelSubscriptionControllerOutput = ReturnType<typeof presenter>;

export async function cancelSubscriptionController(
  rawInput: unknown,
): Promise<TCancelSubscriptionControllerOutput> {
  const input = await CancelSubscriptionValidationSchema.safeParseAsync(rawInput);
  if (!input.success) throw new InputParseError(input.error);

  const raw = await cancelSubscriptionUseCase(input.data);

  const result = await CancelSubscriptionResponseDtoSchema.safeParseAsync(raw);
  if (!result.success) throw new OutputParseError(result.error);

  return presenter(result.data);
}
