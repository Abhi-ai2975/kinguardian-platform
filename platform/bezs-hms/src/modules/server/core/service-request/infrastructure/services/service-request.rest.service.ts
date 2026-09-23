/**
 * ServiceRequestRestApiService — REST transport shell for the ServiceRequest resource.
 *
 * Layer: server / core / service-request / infrastructure / services
 *
 * Implements IServiceRequestService by creating a single AxiosInstance (base URL:
 * FHIR_GQL_URL/service-requests) and delegating all 5 methods to ServiceRequestCoreRestService.
 * No business logic here — only constructor wiring and one-liner delegations.
 *
 * Bound by the DI module when FHIR_TRANSPORT != "graphql".
 */

import axios from "axios";
import { getAuthToken } from "@/modules/server/auth/jwt-token";
import { IServiceRequestService } from "../../domain/interfaces/service-request.service.interface";
import { ServiceRequestCoreRestService } from "./rest/service-request.core.rest.service";
import {
  type TServiceRequestResponse,
  type TPaginatedServiceRequestResponse,
  type TCreateServiceRequest,
  type TUpdateServiceRequestDto,
  type TListServiceRequestsQuery,
} from "@/modules/entities/schemas/service-request";

/**
 * Thin shell that wires a single AxiosInstance to ServiceRequestCoreRestService.
 * Every public method is a one-liner delegation — no direct HTTP calls here.
 */
export class ServiceRequestRestApiService implements IServiceRequestService {
  private readonly core: ServiceRequestCoreRestService;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    const client = axios.create({
      baseURL: `${url}/service-requests`,
      headers: { "Content-Type": "application/json" },
      timeout: 10_000,
      maxRedirects: 5,
    });

    client.interceptors.request.use(async (config) => {
      config.headers.Authorization = `Bearer ${await getAuthToken()}`;
      return config;
    });

    this.core = new ServiceRequestCoreRestService(client);
  }

  /** @inheritdoc */
  create(dto: TCreateServiceRequest): Promise<TServiceRequestResponse> {
    return this.core.create(dto);
  }

  /** @inheritdoc */
  list(query?: TListServiceRequestsQuery): Promise<TPaginatedServiceRequestResponse> {
    return this.core.list(query);
  }

  /** @inheritdoc */
  getById(id: number): Promise<TServiceRequestResponse> {
    return this.core.getById(id);
  }

  /** @inheritdoc */
  update(id: number, dto: TUpdateServiceRequestDto): Promise<TServiceRequestResponse> {
    return this.core.update(id, dto);
  }

  /** @inheritdoc */
  delete(id: number): Promise<void> {
    return this.core.delete(id);
  }
}
