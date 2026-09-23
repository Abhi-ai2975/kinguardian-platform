/**
 * SlotGraphQLService — GraphQL transport stub.
 *
 * Layer: server / core / slot / infrastructure / services
 *
 * Stub implementation of ISlotService for GraphQL transport.
 * Not yet implemented — all methods throw. Bound by the DI module
 * when FHIR_TRANSPORT=graphql.
 */

import { ISlotService } from "../../domain/interfaces/slot.service.interface";
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

/** Stub — GraphQL transport not yet implemented for Slot. */
export class SlotGraphQLService implements ISlotService {
  create(_dto: TCreateSlot): Promise<TSlotResponse> {
    throw new Error("SlotGraphQLService.create: not implemented");
  }

  list(_query?: TListSlotsQuery): Promise<TPaginatedSlotResponse> {
    throw new Error("SlotGraphQLService.list: not implemented");
  }

  getById(_id: number): Promise<TSlotResponse> {
    throw new Error("SlotGraphQLService.getById: not implemented");
  }

  update(_id: number, _dto: TSlotPatchDto): Promise<TSlotResponse> {
    throw new Error("SlotGraphQLService.update: not implemented");
  }

  delete(_id: number): Promise<void> {
    throw new Error("SlotGraphQLService.delete: not implemented");
  }

  generate(_dto: TGenerateSlots): Promise<TSlotGenerateResponse> {
    throw new Error("SlotGraphQLService.generate: not implemented");
  }
}
