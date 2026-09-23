/**
 * server/utils/run-with-transport — revalidation + redirect wrapper.
 *
 * Wraps every mutating server action handler. After the executor resolves,
 * it applies the transportOptions (revalidatePath / redirect). On any
 * thrown error it calls mapErrorToZSA so the client always receives a
 * typed ZSAError, never an unhandled exception.
 *
 * @module
 */
"server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mapErrorToZSA } from "@/modules/server/shared/errors/mappers/map-error-to-zsa";
import type { TTransportOptions } from "@/modules/entities/schemas/transport";

export async function runWithTransport<T>(
  executor: () => Promise<{ result: T; transport?: TTransportOptions | null }>,
): Promise<T> {
  try {
    const { result, transport } = await executor();

    if (transport?.shouldRevalidate && transport.url) {
      revalidatePath(transport.url, transport.revalidateType ?? "page");
    }

    if (transport?.shouldRedirect && transport.url) {
      redirect(transport.url);
    }

    return result;
  } catch (err) {
    mapErrorToZSA(err);
  }
}
