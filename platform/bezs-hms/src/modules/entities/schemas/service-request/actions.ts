/**
 * ServiceRequest ZSA server action schemas.
 *
 * Layer: entities / schemas / service-request
 */

import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  CreateServiceRequestValidationSchema,
  UpdateServiceRequestValidationSchema,
  ListServiceRequestsValidationSchema,
  GetByIdServiceRequestValidationSchema,
  DeleteServiceRequestValidationSchema,
} from "./input";

export const CreateServiceRequestActionSchema = z.object({
  payload: CreateServiceRequestValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateServiceRequestAction = z.infer<typeof CreateServiceRequestActionSchema>;

export const ListServiceRequestsActionSchema = z.object({
  payload: ListServiceRequestsValidationSchema.optional(),
});
export type TListServiceRequestsAction = z.infer<typeof ListServiceRequestsActionSchema>;

export const GetServiceRequestByIdActionSchema = z.object({
  payload: GetByIdServiceRequestValidationSchema,
});
export type TGetServiceRequestByIdAction = z.infer<typeof GetServiceRequestByIdActionSchema>;

export const UpdateServiceRequestActionSchema = z.object({
  payload: UpdateServiceRequestValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateServiceRequestAction = z.infer<typeof UpdateServiceRequestActionSchema>;

export const DeleteServiceRequestActionSchema = z.object({
  payload: DeleteServiceRequestValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteServiceRequestAction = z.infer<typeof DeleteServiceRequestActionSchema>;
