/**
 * AppointmentGraphqlService — GraphQL transport stub for the Appointment resource.
 *
 * Layer: server / core / appointment / infrastructure / services
 *
 * Placeholder implementation used when FHIR_TRANSPORT="graphql".
 * All methods throw NotImplementedError — swap in real GQL queries when ready.
 *
 * Bound by the DI module when FHIR_TRANSPORT === "graphql".
 */

import { IAppointmentService } from "../../domain/interfaces/appointment.service.interface";
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

/** Stub — replace method bodies with GQL mutations/queries when GraphQL transport is needed. */
export class AppointmentGraphqlService implements IAppointmentService {
  /** @throws Error — not implemented. */
  book(_data: TBookAppointment): Promise<TAppointmentResponse> {
    throw new Error("AppointmentGraphqlService.book: not implemented");
  }

  /** @throws Error — not implemented. */
  create(_data: TCreateAppointment): Promise<TAppointmentResponse> {
    throw new Error("AppointmentGraphqlService.create: not implemented");
  }

  /** @throws Error — not implemented. */
  getMe(
    _userId: string,
    _query: Omit<TGetMyAppointments, "userId">,
  ): Promise<TPaginatedAppointmentResponse> {
    throw new Error("AppointmentGraphqlService.getMe: not implemented");
  }

  /** @throws Error — not implemented. */
  list(_query?: TListAppointmentsQuery): Promise<TPaginatedAppointmentResponse> {
    throw new Error("AppointmentGraphqlService.list: not implemented");
  }

  /** @throws Error — not implemented. */
  getById(_id: number): Promise<TAppointmentResponse> {
    throw new Error("AppointmentGraphqlService.getById: not implemented");
  }

  /** @throws Error — not implemented. */
  update(_id: number, _data: TAppointmentPatchDto): Promise<TAppointmentResponse> {
    throw new Error("AppointmentGraphqlService.update: not implemented");
  }

  /** @throws Error — not implemented. */
  delete(_id: number): Promise<void> {
    throw new Error("AppointmentGraphqlService.delete: not implemented");
  }

  /** @throws Error — not implemented. */
  reschedule(_id: number, _newSlotId: number): Promise<TAppointmentResponse> {
    throw new Error(
      "AppointmentGraphqlService.reschedule: not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }
}
