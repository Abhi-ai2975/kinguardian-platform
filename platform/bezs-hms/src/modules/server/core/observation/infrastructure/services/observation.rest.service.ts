/**
 * ObservationRestApiService — REST transport shell for the Observation resource.
 *
 * Layer: server / core / observation / infrastructure / services
 *
 * Implements IObservationService by creating a single AxiosInstance (base URL:
 * FHIR_GQL_URL/observations) and delegating all 5 methods to ObservationCoreRestService.
 * No business logic here — only constructor wiring and one-liner delegations.
 *
 * Bound by the DI module when FHIR_TRANSPORT != "graphql".
 */

import axios from "axios";
import { getAuthToken } from "@/modules/server/auth/jwt-token";
import { IObservationService } from "../../domain/interfaces/observation.service.interface";
import { ObservationCoreRestService } from "./rest/observation.core.rest.service";
import {
  type TObservationResponse,
  type TPaginatedObservationResponse,
  type TCreateObservation,
  type TUpdateObservationDto,
  type TListObservationsQuery,
} from "@/modules/entities/schemas/observation";

/**
 * Thin shell that wires a single AxiosInstance to ObservationCoreRestService.
 * Every public method is a one-liner delegation — no direct HTTP calls here.
 */
export class ObservationRestApiService implements IObservationService {
  private readonly core: ObservationCoreRestService;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    const client = axios.create({
      baseURL: `${url}/observations`,
      headers: { "Content-Type": "application/json" },
      timeout: 10_000,
      maxRedirects: 5,
    });

    client.interceptors.request.use(async (config) => {
      config.headers.Authorization = `Bearer ${await getAuthToken()}`;
      return config;
    });

    this.core = new ObservationCoreRestService(client);
  }

  /** @inheritdoc */
  create(dto: TCreateObservation): Promise<TObservationResponse> {
    return this.core.create(dto);
  }

  /** @inheritdoc */
  list(query?: TListObservationsQuery): Promise<TPaginatedObservationResponse> {
    return this.core.list(query);
  }

  /** @inheritdoc */
  getById(id: number): Promise<TObservationResponse> {
    return this.core.getById(id);
  }

  /** @inheritdoc */
  update(id: number, dto: TUpdateObservationDto): Promise<TObservationResponse> {
    return this.core.update(id, dto);
  }

  /** @inheritdoc */
  delete(id: number): Promise<void> {
    return this.core.delete(id);
  }
}
