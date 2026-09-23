/**
 * HealthcareServiceRestApiService — REST transport implementation of IHealthcareServicesService.
 *
 * Layer: infrastructure / services
 * Resource: HealthcareService (FHIR R4)
 * Transport: REST (fhir-gql REST API)
 *
 * Responsibilities:
 *  - Calls the fhir-gql REST API for all healthcare service CRUD operations.
 *  - Attaches a fresh JWT to every request via an axios request interceptor.
 *  - Validates every API response against Zod schemas before returning.
 *  - Maps AxiosError HTTP status codes to domain errors.
 *  - Emits structured start / success / error log entries via logOperation.
 *
 * Bound by the DI container when FHIR_TRANSPORT is "rest" (default).
 * For GraphQL transport, see healthcare-service.graphql.service.ts.
 *
 * Environment variables required:
 *  - FHIR_GQL_URL — base URL of the fhir-gql service, e.g. http://localhost:8005
 */

import { randomUUID } from "crypto";
import axios, { AxiosError, AxiosInstance } from "axios";
import {
  HealthcareServiceResponseSchema,
  PaginatedHealthcareServiceResponseSchema,
  TCreateHealthcareService,
  TListHealthcareServicesQuery,
  THealthcareServiceResponse,
  TPaginatedHealthcareServiceResponse,
  TPatchHealthcareServiceDto,
} from "@/modules/entities/schemas/healthcare-service";
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
import { IHealthcareServicesService } from "../../domain/interfaces/healthcare-service.service.interface";

export class HealthcareServiceRestApiService implements IHealthcareServicesService {
  /** Axios instance scoped to the fhir-gql /healthcare-services base path. */
  private readonly client: AxiosInstance;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    this.client = axios.create({
      baseURL: `${url}/healthcare-services`,
      headers: { "Content-Type": "application/json" },
      timeout: 10_000,
    });

    this.client.interceptors.request.use(async (config) => {
      const token = await getAuthToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  /**
   * Maps an AxiosError from the fhir-gql API to the appropriate domain error and throws it.
   * Always throws — return type `never`.
   *
   * HTTP status → domain error mapping:
   *  400 → ValidationError   401 → UnauthorizedError   403 → ForbiddenError
   *  404 → NotFoundError     409 → ConflictError        429 → RateLimitError
   *  5xx → BadGatewayError
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
   * Creates a new healthcare service in the fhir-gql FHIR server.
   * @param dto - Creation payload.
   * @returns The newly created healthcare service record.
   * @throws ValidationError | UnauthorizedError | BadGatewayError
   */
  async create(dto: TCreateHealthcareService): Promise<THealthcareServiceResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "HealthcareServiceRestApiService.create",
      startTimeMs,
      context: { operationId, name: dto.name },
    });

    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await HealthcareServiceResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "HealthcareServiceRestApiService.create",
        startTimeMs,
        data,
        context: { operationId, healthcareServiceId: data.id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "HealthcareServiceRestApiService.create",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Returns a paginated list of healthcare services with optional server-side filtering.
   * @param query - Optional filters: name (substring), active flag, limit, offset.
   * @returns Paginated result: { total, limit, offset, data: THealthcareServiceResponse[] }.
   * @throws UnauthorizedError | BadGatewayError
   */
  async list(
    query?: TListHealthcareServicesQuery,
  ): Promise<TPaginatedHealthcareServiceResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "HealthcareServiceRestApiService.list",
      startTimeMs,
      context: { operationId, ...query },
    });

    try {
      const res = await this.client.get<unknown>("/", {
        params: {
          name: query?.name,
          active: query?.active,
          limit: query?.limit ?? 20,
          offset: query?.offset ?? 0,
        },
      });

      const data = await PaginatedHealthcareServiceResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "HealthcareServiceRestApiService.list",
        startTimeMs,
        data: data.data,
        context: { operationId, total: data.total },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "HealthcareServiceRestApiService.list",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Fetches a single healthcare service by its numeric fhir-gql primary key.
   * @param id - The fhir-gql primary key.
   * @returns The matching healthcare service record.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  async getById(id: number): Promise<THealthcareServiceResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "HealthcareServiceRestApiService.getById",
      startTimeMs,
      context: { operationId, healthcareServiceId: id },
    });

    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await HealthcareServiceResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "HealthcareServiceRestApiService.getById",
        startTimeMs,
        data,
        context: { operationId, healthcareServiceId: id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "HealthcareServiceRestApiService.getById",
        startTimeMs,
        err,
        context: { operationId, healthcareServiceId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Partially updates a healthcare service (PATCH semantics — scalar + photo fields only).
   * @param id  - The fhir-gql primary key.
   * @param dto - Patchable fields (at least one must be provided).
   * @returns The updated healthcare service record.
   * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
   */
  async update(
    id: number,
    dto: TPatchHealthcareServiceDto,
  ): Promise<THealthcareServiceResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "HealthcareServiceRestApiService.update",
      startTimeMs,
      context: { operationId, healthcareServiceId: id },
    });

    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await HealthcareServiceResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "HealthcareServiceRestApiService.update",
        startTimeMs,
        data,
        context: { operationId, healthcareServiceId: id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "HealthcareServiceRestApiService.update",
        startTimeMs,
        err,
        context: { operationId, healthcareServiceId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Permanently deletes a healthcare service.
   * @param id - The fhir-gql primary key.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "HealthcareServiceRestApiService.delete",
      startTimeMs,
      context: { operationId, healthcareServiceId: id },
    });

    try {
      await this.client.delete(`/${id}`);

      logOperation("success", {
        name: "HealthcareServiceRestApiService.delete",
        startTimeMs,
        context: { operationId, healthcareServiceId: id },
      });
    } catch (err) {
      logOperation("error", {
        name: "HealthcareServiceRestApiService.delete",
        startTimeMs,
        err,
        context: { operationId, healthcareServiceId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }
}
