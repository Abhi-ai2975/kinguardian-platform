/**
 * @filenest/core — shared HTTP client, error hierarchy, and TypeScript types.
 *
 * This package is not intended to be used directly. It is the shared base for
 * `@filenest/node`, `@filenest/react`, and `@filenest/nextjs`.
 *
 * @module
 */

export * from "./errors/index.js";
export * from "./types/index.js";
export { FileNestHttpClient } from "./http/client.js";
export type { FileNestHttpClientConfig } from "./http/client.js";
