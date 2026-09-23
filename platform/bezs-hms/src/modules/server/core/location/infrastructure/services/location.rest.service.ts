/**
 * LocationRestApiService — REST transport implementation of ILocationsService.
 *
 * Layer: infrastructure / services
 * Resource: Location (FHIR R4)
 * Transport: REST (fhir-gql REST API)
 *
 * Responsibilities:
 *  - Calls the fhir-gql REST API for all location CRUD operations.
 *  - Attaches a fresh JWT to every request via an axios request interceptor.
 *  - Validates every API response against Zod schemas before returning.
 *  - Maps AxiosError HTTP status codes to domain errors.
 *  - Emits structured start / success / error log entries via logOperation.
 *
 * Bound by the DI container when FHIR_TRANSPORT is "rest" (default).
 * For GraphQL transport, see location.graphql.service.ts.
 *
 * Environment variables required:
 *  - FHIR_GQL_URL — base URL of the fhir-gql service, e.g. http://localhost:8005
 */

import { randomUUID } from "crypto";
import axios, { AxiosError, AxiosInstance } from "axios";
import {
  LocationResponseSchema,
  PaginatedLocationResponseSchema,
  TCreateLocation,
  TListLocationsQuery,
  TLocationResponse,
  TPaginatedLocationResponse,
  TPatchLocationDto,
} from "@/modules/entities/schemas/location";
import { getAuthToken } from "@/modules/server/auth/jwt-token";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import {
  BadGatewayError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
  ValidationError,
} from "@/modules/server/shared/errors/commonErrors";
import { ILocationsService } from "../../domain/interfaces/location.service.interface";

export class LocationRestApiService implements ILocationsService {
  /** Axios instance scoped to the fhir-gql /locations base path. */
  private readonly client: AxiosInstance;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    this.client = axios.create({
      baseURL: `${url}/locations`,
      headers: { "Content-Type": "application/json" },
      // 10 s timeout — aligns with the fhir-gql service's own FHIR client default.
      timeout: 10_000,
    });

    /**
     * Request interceptor: attaches a fresh JWT before every outgoing request.
     * Tokens are short-lived so they must be fetched per-request, not cached here.
     */
    this.client.interceptors.request.use(async (config) => {
      const token = await getAuthToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  /**
   * Maps an AxiosError from the fhir-gql API to the appropriate domain error and throws it.
   * Always throws — return type `never` communicates this to TypeScript so callers
   * don't need a follow-up `throw`.
   *
   * HTTP status → domain error mapping:
   *  400 → ValidationError   401 → UnauthorizedError   403 → ForbiddenError
   *  404 → NotFoundError     409 → ConflictError        429 → RateLimitError
   *  5xx → BadGatewayError
   *
   * @param error - The AxiosError thrown by the axios instance on non-2xx responses.
   */
  private handleError(error: AxiosError): never {
    const body = error.response?.data as Record<string, unknown> | undefined;
    const message =
      typeof body?.detail === "string"
        ? body.detail
        : (error.response?.statusText ?? error.message);

    switch (error.response?.status) {
      case 400:
        throw new ValidationError(message);
      case 401:
        throw new UnauthorizedError(message);
      case 403:
        throw new ForbiddenError(message);
      case 404:
        throw new NotFoundError(message);
      case 409:
        throw new ConflictError(message);
      case 429:
        throw new RateLimitError(message);
      default:
        throw new BadGatewayError(
          `fhir-gql error ${error.response?.status ?? "unknown"}: ${message}`,
        );
    }
  }

  /**
   * Creates a new location in the fhir-gql FHIR server.
   *
   * @param dto - Creation payload: user_id, org_id (required), and optional FHIR fields.
   * @returns The newly created location record.
   * @throws ValidationError | UnauthorizedError | BadGatewayError
   */
  async create(dto: TCreateLocation): Promise<TLocationResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "LocationRestApiService.create",
      startTimeMs,
      context: { operationId, name: dto.name },
    });

    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await LocationResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "LocationRestApiService.create",
        startTimeMs,
        data,
        context: { operationId, locationId: data.id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "LocationRestApiService.create",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Returns a paginated list of locations with optional server-side filtering.
   *
   * @param query - Optional filters: org_id, status, limit, offset.
   * @returns Paginated result: { total, limit, offset, data: TLocationResponse[] }.
   * @throws UnauthorizedError | BadGatewayError
   */
  async list(query?: TListLocationsQuery): Promise<TPaginatedLocationResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "LocationRestApiService.list",
      startTimeMs,
      context: { operationId, ...query },
    });

    try {
      const res = await this.client.get<unknown>("/", {
        params: {
          org_id: query?.org_id,
          status: query?.status,
          // fhir-gql's ListLocationsSchema defaults limit to 20, unlike
          // Organization's 50 — matched here for parity with the real API default.
          limit: query?.limit ?? 20,
          offset: query?.offset ?? 0,
        },
      });

      const data = await PaginatedLocationResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "LocationRestApiService.list",
        startTimeMs,
        data: data.data,
        context: { operationId, total: data.total },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "LocationRestApiService.list",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Fetches a single location by its numeric fhir-gql primary key.
   *
   * @param id - The fhir-gql primary key.
   * @returns The matching location record.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  async getById(id: number): Promise<TLocationResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "LocationRestApiService.getById",
      startTimeMs,
      context: { operationId, locationId: id },
    });

    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await LocationResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "LocationRestApiService.getById",
        startTimeMs,
        data,
        context: { operationId, locationId: id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "LocationRestApiService.getById",
        startTimeMs,
        err,
        context: { operationId, locationId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Partially updates a location (PATCH semantics — scalar fields only).
   *
   * @param id  - The fhir-gql primary key.
   * @param dto - Patchable fields (at least one must be provided).
   * @returns The updated location record.
   * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
   */
  async update(id: number, dto: TPatchLocationDto): Promise<TLocationResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "LocationRestApiService.update",
      startTimeMs,
      context: { operationId, locationId: id },
    });

    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await LocationResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "LocationRestApiService.update",
        startTimeMs,
        data,
        context: { operationId, locationId: id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "LocationRestApiService.update",
        startTimeMs,
        err,
        context: { operationId, locationId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Permanently deletes a location.
   *
   * @param id - The fhir-gql primary key.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "LocationRestApiService.delete",
      startTimeMs,
      context: { operationId, locationId: id },
    });

    try {
      await this.client.delete(`/${id}`);

      logOperation("success", {
        name: "LocationRestApiService.delete",
        startTimeMs,
        context: { operationId, locationId: id },
      });
    } catch (err) {
      logOperation("error", {
        name: "LocationRestApiService.delete",
        startTimeMs,
        err,
        context: { operationId, locationId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }
}
