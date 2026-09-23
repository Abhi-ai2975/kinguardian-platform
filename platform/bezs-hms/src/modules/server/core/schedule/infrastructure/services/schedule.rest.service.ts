/**
 * ScheduleRestApiService — REST transport implementation of ISchedulesService.
 *
 * Layer: infrastructure / services
 * Resource: Schedule (FHIR R4)
 * Transport: REST (fhir-gql REST API)
 *
 * Responsibilities:
 *  - Calls the fhir-gql REST API for all schedule CRUD operations.
 *  - Attaches a fresh JWT to every request via an axios request interceptor.
 *  - Validates every API response against Zod schemas before returning.
 *  - Maps AxiosError HTTP status codes to domain errors.
 *  - Emits structured start / success / error log entries via logOperation.
 *
 * Bound by the DI container when FHIR_TRANSPORT is "rest" (default).
 * For GraphQL transport, see schedule.graphql.service.ts.
 *
 * Environment variables required:
 *  - FHIR_GQL_URL — base URL of the fhir-gql service, e.g. http://localhost:8005
 */

import { randomUUID } from "crypto";
import axios, { AxiosError, AxiosInstance } from "axios";
import {
  ScheduleResponseSchema,
  PaginatedScheduleResponseSchema,
  TCreateSchedule,
  TListSchedulesQuery,
  TScheduleResponse,
  TPaginatedScheduleResponse,
  TPatchScheduleDto,
} from "@/modules/entities/schemas/schedule";
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
import { ISchedulesService } from "../../domain/interfaces/schedule.service.interface";

export class ScheduleRestApiService implements ISchedulesService {
  /** Axios instance scoped to the fhir-gql /schedules base path. */
  private readonly client: AxiosInstance;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    this.client = axios.create({
      baseURL: `${url}/schedules`,
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
   * Creates a new schedule in the fhir-gql FHIR server.
   * @param dto - Creation payload.
   * @returns The newly created schedule record.
   * @throws ValidationError | UnauthorizedError | BadGatewayError
   */
  async create(dto: TCreateSchedule): Promise<TScheduleResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ScheduleRestApiService.create",
      startTimeMs,
      context: { operationId },
    });

    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await ScheduleResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "ScheduleRestApiService.create",
        startTimeMs,
        data,
        context: { operationId, scheduleId: data.id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "ScheduleRestApiService.create",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Returns a paginated list of schedules with optional server-side filtering.
   * @param query - Optional filters: active flag, limit, offset.
   * @returns Paginated result: { total, limit, offset, data: TScheduleResponse[] }.
   * @throws UnauthorizedError | BadGatewayError
   */
  async list(query?: TListSchedulesQuery): Promise<TPaginatedScheduleResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ScheduleRestApiService.list",
      startTimeMs,
      context: { operationId, ...query },
    });

    try {
      const res = await this.client.get<unknown>("/", {
        params: {
          active: query?.active,
          limit: query?.limit ?? 20,
          offset: query?.offset ?? 0,
        },
      });

      const data = await PaginatedScheduleResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "ScheduleRestApiService.list",
        startTimeMs,
        data: data.data,
        context: { operationId, total: data.total },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "ScheduleRestApiService.list",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Fetches a single schedule by its numeric fhir-gql primary key.
   * @param id - The fhir-gql primary key.
   * @returns The matching schedule record.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  async getById(id: number): Promise<TScheduleResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ScheduleRestApiService.getById",
      startTimeMs,
      context: { operationId, scheduleId: id },
    });

    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await ScheduleResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "ScheduleRestApiService.getById",
        startTimeMs,
        data,
        context: { operationId, scheduleId: id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "ScheduleRestApiService.getById",
        startTimeMs,
        err,
        context: { operationId, scheduleId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Partially updates a schedule (PATCH semantics — scalar fields only).
   * @param id  - The fhir-gql primary key.
   * @param dto - Patchable fields (at least one must be provided).
   * @returns The updated schedule record.
   * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
   */
  async update(id: number, dto: TPatchScheduleDto): Promise<TScheduleResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ScheduleRestApiService.update",
      startTimeMs,
      context: { operationId, scheduleId: id },
    });

    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await ScheduleResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "ScheduleRestApiService.update",
        startTimeMs,
        data,
        context: { operationId, scheduleId: id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "ScheduleRestApiService.update",
        startTimeMs,
        err,
        context: { operationId, scheduleId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Permanently deletes a schedule and cascades to all its Slots.
   * @param id - The fhir-gql primary key.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ScheduleRestApiService.delete",
      startTimeMs,
      context: { operationId, scheduleId: id },
    });

    try {
      await this.client.delete(`/${id}`);

      logOperation("success", {
        name: "ScheduleRestApiService.delete",
        startTimeMs,
        context: { operationId, scheduleId: id },
      });
    } catch (err) {
      logOperation("error", {
        name: "ScheduleRestApiService.delete",
        startTimeMs,
        err,
        context: { operationId, scheduleId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }
}
