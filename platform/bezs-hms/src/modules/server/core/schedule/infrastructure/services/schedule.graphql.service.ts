/**
 * ScheduleGraphQLService — GraphQL transport stub for ISchedulesService.
 *
 * Layer: infrastructure / services
 * Resource: Schedule (FHIR R4)
 * Transport: GraphQL (not yet implemented)
 *
 * fhir-gql's GraphQL surface does not yet expose Schedule mutations/queries.
 * This stub exists so the DI container can bind a transport based on
 * FHIR_TRANSPORT without a compile error, and fails loudly if selected.
 */

import {
  TListSchedulesQuery,
  TPaginatedScheduleResponse,
  TScheduleResponse,
  TCreateSchedule,
  TPatchScheduleDto,
} from "@/modules/entities/schemas/schedule";
import { ISchedulesService } from "../../domain/interfaces/schedule.service.interface";

export class ScheduleGraphQLService implements ISchedulesService {
  create(_dto: TCreateSchedule): Promise<TScheduleResponse> {
    throw new Error("ScheduleGraphQLService.create is not implemented yet");
  }

  list(_query?: TListSchedulesQuery): Promise<TPaginatedScheduleResponse> {
    throw new Error("ScheduleGraphQLService.list is not implemented yet");
  }

  getById(_id: number): Promise<TScheduleResponse> {
    throw new Error("ScheduleGraphQLService.getById is not implemented yet");
  }

  update(_id: number, _dto: TPatchScheduleDto): Promise<TScheduleResponse> {
    throw new Error("ScheduleGraphQLService.update is not implemented yet");
  }

  delete(_id: number): Promise<void> {
    throw new Error("ScheduleGraphQLService.delete is not implemented yet");
  }
}
