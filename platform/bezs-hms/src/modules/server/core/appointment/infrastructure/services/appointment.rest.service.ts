/**
 * AppointmentRestApiService — REST transport shell for the Appointment resource.
 *
 * Layer: server / core / appointment / infrastructure / services
 *
 * Implements IAppointmentService by creating a single AxiosInstance (base URL:
 * FHIR_GQL_URL/appointments) and delegating all 7 methods to
 * AppointmentCoreRestService. No business logic here — only constructor wiring
 * and one-liner delegations.
 *
 * Bound by the DI module when FHIR_TRANSPORT != "graphql".
 */

import axios from "axios";
import { getAuthToken } from "@/modules/server/auth/jwt-token";
import { IAppointmentService } from "../../domain/interfaces/appointment.service.interface";
import { AppointmentCoreRestService } from "./rest/appointment.core.rest.service";
import {
  type TAppointmentResponse,
  type TPaginatedAppointmentResponse,
} from "@/modules/entities/schemas/appointment";
import {
  type TBookAppointment,
  type TCreateAppointment,
  type TListAppointmentsQuery,
  type TGetMyAppointments,
  type TAppointmentPatchDto,
} from "@/modules/entities/schemas/appointment";

/**
 * Thin shell that wires a single AxiosInstance to AppointmentCoreRestService.
 * Every public method is a one-liner delegation — no direct HTTP calls here.
 */
export class AppointmentRestApiService implements IAppointmentService {
  private readonly core: AppointmentCoreRestService;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    const client = axios.create({
      baseURL: `${url}/appointments`,
      headers: { "Content-Type": "application/json" },
      timeout: 10_000,
      maxRedirects: 5,
    });

    client.interceptors.request.use(async (config) => {
      config.headers.Authorization = `Bearer ${await getAuthToken()}`;
      return config;
    });

    this.core = new AppointmentCoreRestService(client);
  }

  /** @inheritdoc */
  book(data: TBookAppointment): Promise<TAppointmentResponse> {
    return this.core.book(data);
  }

  /** @inheritdoc */
  create(data: TCreateAppointment): Promise<TAppointmentResponse> {
    return this.core.create(data);
  }

  /** @inheritdoc */
  getMe(
    userId: string,
    query: Omit<TGetMyAppointments, "userId">,
  ): Promise<TPaginatedAppointmentResponse> {
    return this.core.getMe(userId, query);
  }

  /** @inheritdoc */
  list(query?: TListAppointmentsQuery): Promise<TPaginatedAppointmentResponse> {
    return this.core.list(query);
  }

  /** @inheritdoc */
  getById(id: number): Promise<TAppointmentResponse> {
    return this.core.getById(id);
  }

  /** @inheritdoc */
  update(id: number, data: TAppointmentPatchDto): Promise<TAppointmentResponse> {
    return this.core.update(id, data);
  }

  /** @inheritdoc */
  delete(id: number): Promise<void> {
    return this.core.delete(id);
  }

  /** @inheritdoc */
  reschedule(id: number, newSlotId: number): Promise<TAppointmentResponse> {
    return this.core.reschedule(id, newSlotId);
  }
}
