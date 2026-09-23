/**
 * @filenest/nextjs server — server-only utilities for Next.js App Router.
 *
 * Import from '@filenest/nextjs/server' in server components, server actions,
 * and route handlers. Never import this in client components.
 *
 * @module
 */

import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { FileNest, type FileNestConfig } from "@filenest/node";
import type { CreateUploadTokenOptions } from "@filenest/node";
import type { UploadToken } from "@filenest/core";
import type { WebhookEvent } from "../types/events.js";

export { FileNest } from "@filenest/node";

/**
 * Create a server-side FileNest client configured for Next.js server contexts.
 *
 * Usage in server components and server actions:
 *   const fn = filenestServer({ apiKey: process.env.FILENEST_API_KEY!, projectId: '...' });
 *   const { data: files } = await fn.files.list();
 */
export function filenestServer(config: FileNestConfig): FileNest {
  return new FileNest(config);
}

/**
 * Generate a short-lived upload token for use by the `<FileNestProvider>` in the browser.
 *
 * Call this from your `/api/filenest-token` route handler. The token is returned
 * to the browser and used by `@filenest/react` for authenticated uploads.
 */
export async function createUploadToken(
  options: CreateUploadTokenOptions & { apiKey: string; projectId: string; baseUrl?: string }
): Promise<UploadToken> {
  const { apiKey, projectId, baseUrl, ...tokenOptions } = options;
  const fn = new FileNest({ apiKey, projectId, baseUrl });
  return fn.uploadTokens.create(tokenOptions);
}

/**
 * Verify an incoming webhook signature using HMAC-SHA256.
 *
 * The `body` must be the raw request body string (before JSON parsing).
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const sig = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  const expected = createHmac("sha256", secret).update(body, "utf8").digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"));
  } catch {
    return false;
  }
}

/**
 * Parse and type the raw webhook event body.
 *
 * Call after `verifyWebhookSignature` returns `true`.
 */
export function parseWebhookEvent(body: string): WebhookEvent {
  return JSON.parse(body) as WebhookEvent;
}

// Re-export token types
export type { CreateUploadTokenOptions } from "@filenest/node";
export type { WebhookEvent, FileUploadedEvent, FileProcessedEvent, FileDeletedEvent, FileVirusDetectedEvent, FileReadyEvent } from "../types/events.js";
