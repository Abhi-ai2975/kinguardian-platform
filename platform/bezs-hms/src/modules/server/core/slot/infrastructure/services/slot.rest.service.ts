/**
 * SlotRestApiService — REST transport shell for the Slot resource.
 *
 * Layer: server / core / slot / infrastructure / services
 *
 * Implements ISlotService by creating a single AxiosInstance (base URL:
 * FHIR_GQL_URL/slots) and delegating all 5 methods to SlotCoreRestService.
 * No business logic here — only constructor wiring and one-liner delegations.
 *
 * Bound by the DI module when FHIR_TRANSPORT != "graphql".
 */

import axios from "axios";
import { getAuthToken } from "@/modules/server/auth/jwt-token";
import { ISlotService } from "../../domain/interfaces/slot.service.interface";
import { SlotCoreRestService } from "./rest/slot.core.rest.service";
import {
  type TSlotResponse,
  type TPaginatedSlotResponse,
  type TSlotGenerateResponse,
} from "@/modules/entities/schemas/slot";
import {
  type TCreateSlot,
  type TSlotPatchDto,
  type TListSlotsQuery,
  type TGenerateSlots,
} from "@/modules/entities/schemas/slot";

/**
 * Thin shell that wires a single AxiosInstance to SlotCoreRestService.
 * Every public method is a one-liner delegation — no direct HTTP calls here.
 */
export class SlotRestApiService implements ISlotService {
  private readonly core: SlotCoreRestService;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    const client = axios.create({
      baseURL: `${url}/slots`,
      headers: { "Content-Type": "application/json" },
      timeout: 10_000,
      maxRedirects: 5,
    });

    client.interceptors.request.use(async (config) => {
      config.headers.Authorization = `Bearer ${await getAuthToken()}`;
      return config;
    });

    this.core = new SlotCoreRestService(client);
  }

  /** @inheritdoc */
  create(dto: TCreateSlot): Promise<TSlotResponse> {
    return this.core.create(dto);
  }

  /** @inheritdoc */
  list(query?: TListSlotsQuery): Promise<TPaginatedSlotResponse> {
    return this.core.list(query);
  }

  /** @inheritdoc */
  getById(id: number): Promise<TSlotResponse> {
    return this.core.getById(id);
  }

  /** @inheritdoc */
  update(id: number, dto: TSlotPatchDto): Promise<TSlotResponse> {
    return this.core.update(id, dto);
  }

  /** @inheritdoc */
  delete(id: number): Promise<void> {
    return this.core.delete(id);
  }

  /** @inheritdoc */
  generate(dto: TGenerateSlots): Promise<TSlotGenerateResponse> {
    return this.core.generate(dto);
  }
}
