/**
 * EncounterRestApiService — REST transport shell for the Encounter resource.
 *
 * Layer: server / core / encounter / infrastructure / services
 *
 * Implements IEncounterService by creating a single AxiosInstance (base URL:
 * FHIR_GQL_URL/encounters) and delegating all 5 methods to EncounterCoreRestService.
 * No business logic here — only constructor wiring and one-liner delegations.
 *
 * Bound by the DI module when FHIR_TRANSPORT != "graphql".
 */

import axios from "axios";
import { getAuthToken } from "@/modules/server/auth/jwt-token";
import { IEncounterService } from "../../domain/interfaces/encounter.service.interface";
import { EncounterCoreRestService } from "./rest/encounter.core.rest.service";
import {
  type TEncounterResponse,
  type TPaginatedEncounterResponse,
  type TCreateEncounter,
  type TUpdateEncounterDto,
  type TListEncountersQuery,
} from "@/modules/entities/schemas/encounter";

/**
 * Thin shell that wires a single AxiosInstance to EncounterCoreRestService.
 * Every public method is a one-liner delegation — no direct HTTP calls here.
 */
export class EncounterRestApiService implements IEncounterService {
  private readonly core: EncounterCoreRestService;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    const client = axios.create({
      baseURL: `${url}/encounters`,
      headers: { "Content-Type": "application/json" },
      timeout: 10_000,
      maxRedirects: 5,
    });

    client.interceptors.request.use(async (config) => {
      config.headers.Authorization = `Bearer ${await getAuthToken()}`;
      return config;
    });

    this.core = new EncounterCoreRestService(client);
  }

  /** @inheritdoc */
  create(dto: TCreateEncounter): Promise<TEncounterResponse> {
    return this.core.create(dto);
  }

  /** @inheritdoc */
  list(query?: TListEncountersQuery): Promise<TPaginatedEncounterResponse> {
    return this.core.list(query);
  }

  /** @inheritdoc */
  getById(id: number): Promise<TEncounterResponse> {
    return this.core.getById(id);
  }

  /** @inheritdoc */
  update(id: number, dto: TUpdateEncounterDto): Promise<TEncounterResponse> {
    return this.core.update(id, dto);
  }

  /** @inheritdoc */
  delete(id: number): Promise<void> {
    return this.core.delete(id);
  }
}
