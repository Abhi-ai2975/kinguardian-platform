/**
 * TerminologyRestApiService — REST transport implementation of ITerminologyService.
 *
 * Layer: server / core / terminology / infrastructure / services
 * Transport: REST  (bound when FHIR_TRANSPORT !== "graphql")
 * Base URL env var: FHIR_GQL_URL
 *
 * Implements all five /terminology endpoints:
 *   GET  /terminology/search
 *   GET  /terminology/concepts
 *   POST /terminology/lookup
 *   POST /terminology/lookup-batch
 *   POST /terminology/validate
 *
 * For GraphQL transport, see terminology.graphql.service.ts.
 */

import { randomUUID } from "crypto";
import axios, { AxiosError, AxiosInstance } from "axios";

import { getAuthToken } from "@/modules/server/auth/jwt-token";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import {
  BadGatewayError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
  ValidationError,
} from "@/modules/server/shared/errors/commonErrors";
import {
  ConceptsForFieldResponseSchema,
  LookupBatchResponseSchema,
  LookupResultSchema,
  SearchResponseSchema,
  TConceptsForFieldResponse,
  TGetConceptsForField,
  TLookup,
  TLookupBatch,
  TLookupBatchResponse,
  TLookupResult,
  TSearch,
  TSearchResponse,
  TValidate,
  TValidateResponse,
  ValidateResponseSchema,
} from "@/modules/entities/schemas/terminology/terminology.schema";
import { ITerminologyService } from "../../domain/interfaces/terminology.service.interface";

/**
 * REST implementation of ITerminologyService.
 * All five /terminology endpoints are proxied through a single axios instance.
 * JWT is attached automatically by the request interceptor on every call.
 */
export class TerminologyRestApiService implements ITerminologyService {
  /** Axios instance scoped to the fhir-gql /terminology base path. */
  private readonly client: AxiosInstance;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    this.client = axios.create({
      baseURL: `${url}/terminology`,
      headers: { "Content-Type": "application/json" },
      // 10 s timeout — consistent with other fhir-gql service clients.
      timeout: 10_000,
    });

    /**
     * Request interceptor: attaches a fresh JWT before every outgoing request.
     * Tokens are short-lived and must not be reused across requests.
     */
    this.client.interceptors.request.use(async (config) => {
      const token = await getAuthToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  /**
   * Maps an AxiosError from fhir-gql to the appropriate domain error and throws it.
   * Always throws — return type `never` communicates this to TypeScript.
   *
   * HTTP → domain error mapping:
   *  400 → ValidationError   401 → UnauthorizedError   403 → ForbiddenError
   *  404 → NotFoundError     429 → RateLimitError       5xx → BadGatewayError
   *
   * @param error - The AxiosError thrown by the axios instance on non-2xx responses.
   */
  private handleError(error: AxiosError): never {
    const body = error.response?.data as Record<string, unknown> | undefined;
    const message =
      typeof body?.message === "string"
        ? body.message
        : (error.response?.statusText ?? error.message);

    switch (error.response?.status) {
      case 400: throw new ValidationError(message);
      case 401: throw new UnauthorizedError(message);
      case 403: throw new ForbiddenError(message);
      case 404: throw new NotFoundError(message);
      case 429: throw new RateLimitError(message);
      default:
        throw new BadGatewayError(
          `fhir-gql error ${error.response?.status ?? "unknown"}: ${message}`,
        );
    }
  }

  /**
   * Full-text concept search via GET /terminology/search.
   * Results ranked by trigram similarity to the query string.
   *
   * @param query - Search query, optional system filter, and pagination.
   * @returns Paginated list of matching concepts.
   * @throws ValidationError | UnauthorizedError | ForbiddenError | BadGatewayError
   */
  async search(query: TSearch): Promise<TSearchResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "TerminologyRestApiService.search",
      startTimeMs,
      context: { operationId, q: query.q, system: query.system },
    });

    try {
      const res = await this.client.get<unknown>("/search", {
        params: {
          q: query.q,
          system: query.system,
          limit: query.limit ?? 20,
          offset: query.offset ?? 0,
        },
      });

      const data = await SearchResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "TerminologyRestApiService.search",
        startTimeMs,
        data: data.data,
        context: { operationId, total: data.total },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "TerminologyRestApiService.search",
        startTimeMs,
        err,
        context: { operationId, q: query.q },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Fetches value-set concepts for a FHIR resource field via GET /terminology/concepts.
   * Used to populate dropdown menus in clinical forms.
   *
   * @param query - Resource, field, optional search filter, and pagination.
   * @returns Paginated concepts valid for the requested field.
   * @throws ValidationError | UnauthorizedError | ForbiddenError | NotFoundError | BadGatewayError
   */
  async getConceptsForField(
    query: TGetConceptsForField,
  ): Promise<TConceptsForFieldResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "TerminologyRestApiService.getConceptsForField",
      startTimeMs,
      context: { operationId, resource: query.resource, field: query.field },
    });

    try {
      const res = await this.client.get<unknown>("/concepts", {
        params: {
          resource: query.resource,
          field: query.field,
          q: query.q,
          limit: query.limit ?? 50,
          offset: query.offset ?? 0,
        },
      });

      const data = await ConceptsForFieldResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "TerminologyRestApiService.getConceptsForField",
        startTimeMs,
        data: data.concepts,
        context: { operationId, total: data.total },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "TerminologyRestApiService.getConceptsForField",
        startTimeMs,
        err,
        context: { operationId, resource: query.resource, field: query.field },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Looks up a single concept by system+code via POST /terminology/lookup.
   * Returns `found: false` when the code does not exist — no 404 thrown.
   *
   * @param query - The canonical system URL and code to look up.
   * @returns Lookup result with found flag and optional concept details.
   * @throws ValidationError | UnauthorizedError | ForbiddenError | BadGatewayError
   */
  async lookup(query: TLookup): Promise<TLookupResult> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "TerminologyRestApiService.lookup",
      startTimeMs,
      context: { operationId, system: query.system, code: query.code },
    });

    try {
      const res = await this.client.post<unknown>("/lookup", {
        system: query.system,
        code: query.code,
      });

      const data = await LookupResultSchema.parseAsync(res.data);

      logOperation("success", {
        name: "TerminologyRestApiService.lookup",
        startTimeMs,
        context: { operationId, found: data.found, code: query.code },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "TerminologyRestApiService.lookup",
        startTimeMs,
        err,
        context: { operationId, system: query.system, code: query.code },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Bulk concept lookup via POST /terminology/lookup-batch.
   * Resolves up to 100 system+code pairs in a single round-trip.
   *
   * @param query - List of system+code pairs to look up.
   * @returns One LookupResult per input item, in input order.
   * @throws ValidationError | UnauthorizedError | ForbiddenError | BadGatewayError
   */
  async lookupBatch(query: TLookupBatch): Promise<TLookupBatchResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "TerminologyRestApiService.lookupBatch",
      startTimeMs,
      context: { operationId, itemCount: query.items.length },
    });

    try {
      const res = await this.client.post<unknown>("/lookup-batch", {
        items: query.items,
      });

      const data = await LookupBatchResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "TerminologyRestApiService.lookupBatch",
        startTimeMs,
        context: { operationId, resultCount: data.results.length },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "TerminologyRestApiService.lookupBatch",
        startTimeMs,
        err,
        context: { operationId, itemCount: query.items.length },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Validates a code against the value-set bound to a FHIR resource field
   * via POST /terminology/validate.
   *
   * @param query - Resource, field, system, and code to validate.
   * @returns Validation result: valid flag, in_value_set flag, and explanatory message.
   * @throws ValidationError | UnauthorizedError | ForbiddenError | NotFoundError | BadGatewayError
   */
  async validate(query: TValidate): Promise<TValidateResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "TerminologyRestApiService.validate",
      startTimeMs,
      context: {
        operationId,
        resource: query.resource,
        field: query.field,
        code: query.code,
      },
    });

    try {
      const res = await this.client.post<unknown>("/validate", {
        resource: query.resource,
        field: query.field,
        system: query.system,
        code: query.code,
      });

      const data = await ValidateResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "TerminologyRestApiService.validate",
        startTimeMs,
        context: { operationId, valid: data.valid, in_value_set: data.in_value_set },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "TerminologyRestApiService.validate",
        startTimeMs,
        err,
        context: { operationId, resource: query.resource, field: query.field },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }
}
