/**
 * OrganizationRestApiService — REST transport implementation of IOrganizationsService.
 *
 * Layer: infrastructure / services
 * Resource: Organization (FHIR R4)
 * Transport: REST (fhir-gql REST API)
 *
 * Responsibilities:
 *  - Calls the fhir-gql REST API for all organization CRUD operations.
 *  - Attaches a fresh JWT to every request via an axios request interceptor.
 *  - Validates every API response against Zod schemas before returning.
 *  - Maps AxiosError HTTP status codes to domain errors.
 *  - Emits structured start / success / error log entries via logOperation.
 *
 * Bound by the DI container when FHIR_TRANSPORT is "rest" (default).
 * For GraphQL transport, see organization.graphql.service.ts.
 *
 * Environment variables required:
 *  - FHIR_GQL_URL — base URL of the fhir-gql service, e.g. http://localhost:8005
 */

import { randomUUID } from "crypto";
import axios, { AxiosError, AxiosInstance } from "axios";
import {
  OrgResponseSchema,
  PaginatedOrgResponseSchema,
  TListOrgsQuery,
  TOrgResponse,
  TPaginatedOrgResponse,
  TPatchOrgDto,
  TRegisterOrg,
} from "@/modules/entities/schemas/organization";
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
import { IOrganizationsService } from "../../domain/interfaces/organization.service.interface";

export class OrganizationRestApiService implements IOrganizationsService {
  /** Axios instance scoped to the fhir-gql /organizations base path. */
  private readonly client: AxiosInstance;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    this.client = axios.create({
      baseURL: `${url}/organizations`,
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
   * Registers a new organization in the fhir-gql FHIR server.
   *
   * @param dto - Registration payload: name, type[], active, and optional FHIR fields.
   * @returns The newly created organization record.
   * @throws ValidationError | ConflictError | UnauthorizedError | BadGatewayError
   */
  async register(dto: TRegisterOrg): Promise<TOrgResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "OrganizationRestApiService.register",
      startTimeMs,
      context: { operationId, name: dto.name },
    });

    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await OrgResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "OrganizationRestApiService.register",
        startTimeMs,
        data,
        context: { operationId, organizationId: data.id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "OrganizationRestApiService.register",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Returns a paginated list of organizations with optional server-side filtering.
   *
   * @param query - Optional filters: name (substring), active flag, limit, offset.
   * @returns Paginated result: { total, limit, offset, data: TOrgResponse[] }.
   * @throws UnauthorizedError | BadGatewayError
   */
  async list(query?: TListOrgsQuery): Promise<TPaginatedOrgResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "OrganizationRestApiService.list",
      startTimeMs,
      context: { operationId, ...query },
    });

    try {
      const res = await this.client.get<unknown>("/", {
        params: {
          name: query?.name,
          active: query?.active,
          // New fhir-gql filter params — axios omits undefined values automatically.
          user_id: query?.user_id,
          org_id: query?.org_id,
          limit: query?.limit ?? 50,
          offset: query?.offset ?? 0,
        },
      });

      const data = await PaginatedOrgResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "OrganizationRestApiService.list",
        startTimeMs,
        data: data.data,
        context: { operationId, total: data.total },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "OrganizationRestApiService.list",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Fetches a single organization by its numeric fhir-gql primary key.
   *
   * @param id - The fhir-gql primary key.
   * @returns The matching organization record.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  async getById(id: number): Promise<TOrgResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "OrganizationRestApiService.getById",
      startTimeMs,
      context: { operationId, organizationId: id },
    });

    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await OrgResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "OrganizationRestApiService.getById",
        startTimeMs,
        data,
        context: { operationId, organizationId: id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "OrganizationRestApiService.getById",
        startTimeMs,
        err,
        context: { operationId, organizationId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Partially updates an organization (PATCH semantics).
   *
   * @param id  - The fhir-gql primary key.
   * @param dto - Patchable fields (at least one must be provided).
   * @returns The updated organization record.
   * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
   */
  async update(id: number, dto: TPatchOrgDto): Promise<TOrgResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "OrganizationRestApiService.update",
      startTimeMs,
      context: { operationId, organizationId: id },
    });

    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await OrgResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "OrganizationRestApiService.update",
        startTimeMs,
        data,
        context: { operationId, organizationId: id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "OrganizationRestApiService.update",
        startTimeMs,
        err,
        context: { operationId, organizationId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Permanently deletes an organization and all its child records.
   * fhir-gql responds with 204 No Content on success.
   *
   * @param id - The fhir-gql primary key.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "OrganizationRestApiService.delete",
      startTimeMs,
      context: { operationId, organizationId: id },
    });

    try {
      await this.client.delete(`/${id}`);

      logOperation("success", {
        name: "OrganizationRestApiService.delete",
        startTimeMs,
        context: { operationId, organizationId: id },
      });
    } catch (err) {
      logOperation("error", {
        name: "OrganizationRestApiService.delete",
        startTimeMs,
        err,
        context: { operationId, organizationId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }
}
