import {
  ListSubscriptionsResponseDtoSchema,
  type TListSubscriptionsResponseDto,
} from "@/modules/entities/schemas/admin/billing/billing.schema";
import { listSubscriptionsUseCase } from "@/modules/server/core/admin/application/usecases/billing/listSubscriptions.usecase";
import { OutputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: TListSubscriptionsResponseDto) {
  return data;
}

export type TListSubscriptionsControllerOutput = ReturnType<typeof presenter>;

export async function listSubscriptionsController(): Promise<TListSubscriptionsControllerOutput> {
  const raw = await listSubscriptionsUseCase();
  const result = await ListSubscriptionsResponseDtoSchema.safeParseAsync(raw);
  if (!result.success) throw new OutputParseError(result.error);
  return presenter(result.data);
}
