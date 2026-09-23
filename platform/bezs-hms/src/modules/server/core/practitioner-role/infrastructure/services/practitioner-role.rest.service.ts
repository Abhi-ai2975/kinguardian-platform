/**
 * PractitionerRoleRestApiService — REST transport shell for the PractitionerRole resource.
 *
 * Layer: server / core / practitioner-role / infrastructure / services
 *
 * Implements IPractitionerRolesService by creating a single AxiosInstance
 * (base URL: FHIR_GQL_URL/practitioner-roles) and delegating all 6 methods to
 * PractitionerRoleCoreRestService. No business logic here — only wiring.
 *
 * Bound by the DI module when FHIR_TRANSPORT != "graphql".
 */

import axios from "axios";
import { getAuthToken } from "@/modules/server/auth/jwt-token";
import { IPractitionerRolesService } from "../../domain/interfaces/practitioner-role.service.interface";
import { PractitionerRoleCoreRestService } from "./rest/practitioner-role.core.rest.service";
import {
  type TPractitionerRoleResponse,
  type TPaginatedPractitionerRoleResponse,
  type TPaginatedPractitionerRoleBookingResponse,
} from "@/modules/entities/schemas/practitioner-role";
import {
  type TCreatePractitionerRole,
  type TPractitionerRolePatchDto,
  type TListPractitionerRolesQuery,
  type TListPractitionerRolesForBookingQuery,
} from "@/modules/entities/schemas/practitioner-role";

/**
 * Thin shell that wires a single AxiosInstance to PractitionerRoleCoreRestService.
 * Every public method is a one-liner delegation — no direct HTTP calls here.
 */
export class PractitionerRoleRestApiService implements IPractitionerRolesService {
  private readonly core: PractitionerRoleCoreRestService;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    const client = axios.create({
      baseURL: `${url}/practitioner-roles`,
      headers: { "Content-Type": "application/json" },
      timeout: 10_000,
      maxRedirects: 5,
    });

    client.interceptors.request.use(async (config) => {
      config.headers.Authorization = `Bearer ${await getAuthToken()}`;
      return config;
    });

    this.core = new PractitionerRoleCoreRestService(client);
  }

  /** @inheritdoc */
  create(dto: TCreatePractitionerRole): Promise<TPractitionerRoleResponse> {
    return this.core.create(dto);
  }

  /** @inheritdoc */
  list(
    query?: TListPractitionerRolesQuery,
  ): Promise<TPaginatedPractitionerRoleResponse> {
    return this.core.list(query);
  }

  /** @inheritdoc */
  listForBooking(
    query?: TListPractitionerRolesForBookingQuery,
  ): Promise<TPaginatedPractitionerRoleBookingResponse> {
    return this.core.listForBooking(query);
  }

  /** @inheritdoc */
  getById(id: number): Promise<TPractitionerRoleResponse> {
    return this.core.getById(id);
  }

  /** @inheritdoc */
  update(
    id: number,
    dto: TPractitionerRolePatchDto,
  ): Promise<TPractitionerRoleResponse> {
    return this.core.update(id, dto);
  }

  /** @inheritdoc */
  delete(id: number): Promise<void> {
    return this.core.delete(id);
  }
}
