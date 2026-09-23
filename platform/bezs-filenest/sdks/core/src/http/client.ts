/**
 * @filenest/core http/client — shared HTTP client used by all JS/TS SDKs.
 *
 * Handles auth header injection, JSON serialization, error mapping (HTTP status
 * → typed FileNestError subclass), and exponential-backoff retry on 5xx.
 *
 * @module
 */

import {
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  FileNestError,
  LegalHoldError,
  MetadataValidationError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  ValidationError,
  WORMViolationError,
} from "../errors/index.js";

// The backend always returns snake_case JSON. Transform all API responses to camelCase
// so SDK consumers use standard JS naming (e.g. file.contentType, not file.content_type).
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function camelizeKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelizeKeys);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        snakeToCamel(k),
        camelizeKeys(v),
      ])
    );
  }
  return value;
}

export interface FileNestHttpClientConfig {
  apiKey: string;
  projectId?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  apiVersion?: string;
}

const DEFAULT_BASE_URL = "https://api.filenest.io";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Maps an HTTP status code + response body → the appropriate FileNestError subclass. */
async function mapResponseError(status: number, response: Response): Promise<never> {
  let body: Record<string, unknown> = {};
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    // Non-JSON body — ignore
  }

  const err = (body as { error?: { message?: string; required_scope?: string; retry_after?: number; validation_errors?: { field: string; message: string }[] } }).error ?? {};
  const message = (err as { message?: string }).message ?? response.statusText;

  switch (status) {
    case 401:
      throw new AuthenticationError(message);
    case 403:
      throw new AuthorizationError(message, (err as { required_scope?: string }).required_scope);
    case 404: {
      throw new NotFoundError(message);
    }
    case 409:
      if ((err as { code?: string }).code === "worm_violation") throw new WORMViolationError(message);
      if ((err as { code?: string }).code === "legal_hold_active") throw new LegalHoldError(message);
      throw new ConflictError(message);
    case 422:
      if ((err as { code?: string }).code === "metadata_validation_error") {
        throw new MetadataValidationError((err as { validation_errors?: { field: string; message: string }[] }).validation_errors ?? []);
      }
      throw new ValidationError(message, (err as { validation_errors?: { field: string; message: string }[] }).validation_errors ?? []);
    case 429:
      throw new RateLimitError(message, (err as { retry_after?: number }).retry_after);
    default:
      throw new FileNestError(message, (err as { code?: string }).code ?? "server_error", status);
  }
}

export class FileNestHttpClient {
  private readonly apiKey: string;
  readonly projectId?: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly headers: Record<string, string>;

  constructor(config: FileNestHttpClientConfig) {
    this.apiKey = config.apiKey;
    this.projectId = config.projectId;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.headers = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(config.apiVersion ? { "FileNest-Version": config.apiVersion } : {}),
    };
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    attempt = 0
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);

      // Retry on 5xx with exponential backoff
      if (response.status >= 500 && attempt < this.maxRetries) {
        await sleep(Math.min(1000 * 2 ** attempt, 8000));
        return this.fetchWithRetry(url, init, attempt + 1);
      }

      return response;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === "AbortError") {
        throw new NetworkError(`Request timed out after ${this.timeout}ms`);
      }
      if (attempt < this.maxRetries) {
        await sleep(Math.min(1000 * 2 ** attempt, 8000));
        return this.fetchWithRetry(url, init, attempt + 1);
      }
      throw new NetworkError("Network request failed", err);
    }
  }

  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = new URL(this.url(path));
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }
    const res = await this.fetchWithRetry(url.toString(), { method: "GET", headers: this.headers });
    if (!res.ok) await mapResponseError(res.status, res);
    return camelizeKeys(await res.json()) as T;
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await this.fetchWithRetry(this.url(path), {
      method: "POST",
      headers: this.headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) await mapResponseError(res.status, res);
    if (res.status === 204 || res.headers.get("content-length") === "0") {
      return undefined as T;
    }
    return camelizeKeys(await res.json()) as T;
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const res = await this.fetchWithRetry(this.url(path), {
      method: "PATCH",
      headers: this.headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) await mapResponseError(res.status, res);
    return camelizeKeys(await res.json()) as T;
  }

  async delete<T = void>(path: string): Promise<T> {
    const res = await this.fetchWithRetry(this.url(path), {
      method: "DELETE",
      headers: this.headers,
    });
    if (!res.ok) await mapResponseError(res.status, res);
    if (res.status === 204 || res.headers.get("content-length") === "0") {
      return undefined as T;
    }
    return camelizeKeys(await res.json()) as T;
  }

  /** Raw fetch for binary/multipart use cases (upload, streaming download). */
  async rawFetch(path: string, init: RequestInit): Promise<Response> {
    const res = await this.fetchWithRetry(this.url(path), {
      ...init,
      headers: { Authorization: `Bearer ${this.apiKey}`, ...(init.headers as Record<string, string>) },
    });
    if (!res.ok) await mapResponseError(res.status, res);
    return res;
  }
}
