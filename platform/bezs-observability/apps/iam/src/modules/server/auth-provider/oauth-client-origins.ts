"server-only";

import { prisma } from "../../../../prisma/db";

interface OriginsCache {
  origins: string[];
  timestamp: number;
}

let cache: OriginsCache | null = null;
const TTL_MS = 60_000; // 60 seconds

/**
 * Mutable array passed directly to oauthProvider({ validAudiences }).
 * Better Auth reads opts.validAudiences on every request, so mutating this
 * array in-place makes validAudiences effectively dynamic.
 * Initialized with BETTER_AUTH_URL as a safe baseline.
 */
export const validAudiencesRef: string[] = [
  process.env.BETTER_AUTH_URL!,
].filter(Boolean);

function extractOrigin(uri: string): string | null {
  try {
    return new URL(uri).origin;
  } catch {
    return null;
  }
}

async function fetchAndApply(): Promise<string[]> {
  const clients = await prisma.oauthClient.findMany({
    select: { redirectUris: true },
  });

  const origins = [
    ...new Set(
      clients.flatMap((c) =>
        c.redirectUris
          .map(extractOrigin)
          .filter((o): o is string => o !== null),
      ),
    ),
  ];

  cache = { origins, timestamp: Date.now() };

  // Update the mutable array in-place so oauthProvider sees the latest values
  validAudiencesRef.length = 0;
  validAudiencesRef.push(
    ...[process.env.BETTER_AUTH_URL!, ...origins].filter(Boolean),
  );

  return origins;
}

/**
 * Returns cached OAuth client redirect URI origins, refreshing if stale.
 * Used as the trustedOrigins async function — called per-request by Better Auth.
 */
export async function getOAuthClientOrigins(): Promise<string[]> {
  if (cache && Date.now() - cache.timestamp < TTL_MS) {
    return cache.origins;
  }
  return fetchAndApply();
}

/**
 * Invalidates the cache and immediately re-fetches from the database.
 * Call this after creating, updating, or deleting an OAuth client.
 */
export async function refreshOAuthClientOrigins(): Promise<void> {
  cache = null;
  await fetchAndApply();
}
