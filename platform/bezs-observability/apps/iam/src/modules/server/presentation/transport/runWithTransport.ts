"server-only";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { mapErrorToZSA } from "../../shared/errors/mappers/mapErrorToZSA";
// import { getLocale } from "next-intl/server";

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
    // const locale = await getLocale();
    const { result, transport } = await executor();

    if (transport?.url && transport?.shouldRevalidate) {
      revalidatePath(transport.url, transport.revalidateType ?? "page");
    }

    // NOTE:
    // redirect() intentionally throws a Next.js control signal.
    // This must NOT be caught or transformed.
    if (transport?.url && transport?.shouldRedirect) {
      // redirect({ href: transport.url, locale });
      redirect(transport.url);
    }
    return result;
  } catch (err) {
    // mapErrorToZSA rethrows Next.js control errors untouched
    mapErrorToZSA(err);
  }
}
