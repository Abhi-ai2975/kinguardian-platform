"server-only";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { mapErrorToZSA } from "../../shared/errors/mappers/mapErrorToZSA";

type TransportDecision = {
  url?: string | null;
  shouldRevalidate?: boolean;
  shouldRedirect?: boolean;
  revalidateType?: "page" | "layout";
};

export async function runWithTransport<T>(
  executor: () => Promise<{
    result: T;
    transport?: TransportDecision;
  }>,
): Promise<T> {
  try {
    const { result, transport } = await executor();

    if (transport?.url && transport?.shouldRevalidate) {
      revalidatePath(transport.url, transport.revalidateType ?? "page");
    }

    if (transport?.url && transport?.shouldRedirect) {
      redirect(transport.url);
    }

    return result;
  } catch (err) {
    // mapErrorToZSA rethrows Next.js control errors untouched
    mapErrorToZSA(err);
  }
}
