/**
 * ConditionRestApiService — REST transport shell for the Condition resource.
 *
 * Layer: server / core / condition / infrastructure / services
 *
 * Implements IConditionService by creating a single AxiosInstance (base URL:
 * FHIR_GQL_URL/conditions) and delegating all 5 methods to ConditionCoreRestService.
 * No business logic here — only constructor wiring and one-liner delegations.
 *
 * Bound by the DI module when FHIR_TRANSPORT != "graphql".
 */

import axios from "axios";
import { getAuthToken } from "@/modules/server/auth/jwt-token";
import { IConditionService } from "../../domain/interfaces/condition.service.interface";
import { ConditionCoreRestService } from "./rest/condition.core.rest.service";
import {
  type TConditionResponse,
  type TPaginatedConditionResponse,
  type TCreateCondition,
  type TUpdateConditionDto,
  type TListConditionsQuery,
} from "@/modules/entities/schemas/condition";

/**
 * Thin shell that wires a single AxiosInstance to ConditionCoreRestService.
 * Every public method is a one-liner delegation — no direct HTTP calls here.
 */
export class ConditionRestApiService implements IConditionService {
  private readonly core: ConditionCoreRestService;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    const client = axios.create({
      baseURL: `${url}/conditions`,
      headers: { "Content-Type": "application/json" },
      timeout: 10_000,
      maxRedirects: 5,
    });

    client.interceptors.request.use(async (config) => {
      config.headers.Authorization = `Bearer ${await getAuthToken()}`;
      return config;
    });

    this.core = new ConditionCoreRestService(client);
  }

  /** @inheritdoc */
  create(dto: TCreateCondition): Promise<TConditionResponse> {
    return this.core.create(dto);
  }

  /** @inheritdoc */
  list(query?: TListConditionsQuery): Promise<TPaginatedConditionResponse> {
    return this.core.list(query);
  }

  /** @inheritdoc */
  getById(id: number): Promise<TConditionResponse> {
    return this.core.getById(id);
  }

  /** @inheritdoc */
  update(id: number, dto: TUpdateConditionDto): Promise<TConditionResponse> {
    return this.core.update(id, dto);
  }

  /** @inheritdoc */
  delete(id: number): Promise<void> {
    return this.core.delete(id);
  }
}
