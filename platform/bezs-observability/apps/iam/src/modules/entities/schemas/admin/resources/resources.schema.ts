import z from "zod";
import { TransportOptionsSchema } from "../../transport";

// ------------------------------------------------------------------ //
// Resource schemas
// ------------------------------------------------------------------ //

export const ResourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  actionsCount: z.number().default(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type TResourceSchema = z.infer<typeof ResourceSchema>;

export const ListResourcesResponseSchema = z.object({
  resources: z.array(ResourceSchema),
});
export type TListResourcesResponseSchema = z.infer<
  typeof ListResourcesResponseSchema
>;

// Create Resource
export const CreateResourceFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});
export type TCreateResourceFormSchema = z.infer<typeof CreateResourceFormSchema>;

export const CreateResourceValidationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});
export type TCreateResourceValidationSchema = z.infer<
  typeof CreateResourceValidationSchema
>;

export const CreateResourceInput = z.object({
  payload: CreateResourceValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateResourceInput = z.infer<typeof CreateResourceInput>;

// Update Resource
export const UpdateResourceFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});
export type TUpdateResourceFormSchema = z.infer<typeof UpdateResourceFormSchema>;

export const UpdateResourceValidationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});
export type TUpdateResourceValidationSchema = z.infer<
  typeof UpdateResourceValidationSchema
>;

export const UpdateResourceInput = z.object({
  payload: UpdateResourceValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateResourceInput = z.infer<typeof UpdateResourceInput>;

// Delete Resource
export const DeleteResourceValidationSchema = z.object({
  id: z.string().min(1),
});
export type TDeleteResourceValidationSchema = z.infer<
  typeof DeleteResourceValidationSchema
>;

export const DeleteResourceInput = z.object({
  payload: DeleteResourceValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteResourceInput = z.infer<typeof DeleteResourceInput>;

// ------------------------------------------------------------------ //
// ResourceAction schemas
// ------------------------------------------------------------------ //

export const ResourceActionSchema = z.object({
  id: z.string(),
  resourceId: z.string(),
  resourceName: z.string().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  key: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type TResourceActionSchema = z.infer<typeof ResourceActionSchema>;

export const ListResourceActionsResponseSchema = z.object({
  actions: z.array(ResourceActionSchema),
});
export type TListResourceActionsResponseSchema = z.infer<
  typeof ListResourceActionsResponseSchema
>;

// Create ResourceAction
export const CreateResourceActionFormSchema = z.object({
  resourceId: z.string().min(1, "Resource is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  key: z.string().min(1, "Key is required").regex(/^[a-z0-9_:-]+$/, "Key must be lowercase (e.g. patient:read)"),
});
export type TCreateResourceActionFormSchema = z.infer<
  typeof CreateResourceActionFormSchema
>;

export const CreateResourceActionValidationSchema = z.object({
  resourceId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  key: z.string().min(1),
});
export type TCreateResourceActionValidationSchema = z.infer<
  typeof CreateResourceActionValidationSchema
>;

export const CreateResourceActionInput = z.object({
  payload: CreateResourceActionValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateResourceActionInput = z.infer<
  typeof CreateResourceActionInput
>;

// Update ResourceAction
export const UpdateResourceActionFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  key: z.string().min(1, "Key is required").regex(/^[a-z0-9_:-]+$/, "Key must be lowercase (e.g. patient:read)"),
});
export type TUpdateResourceActionFormSchema = z.infer<
  typeof UpdateResourceActionFormSchema
>;

export const UpdateResourceActionValidationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  key: z.string().min(1).optional(),
});
export type TUpdateResourceActionValidationSchema = z.infer<
  typeof UpdateResourceActionValidationSchema
>;

export const UpdateResourceActionInput = z.object({
  payload: UpdateResourceActionValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateResourceActionInput = z.infer<
  typeof UpdateResourceActionInput
>;

// Delete ResourceAction
export const DeleteResourceActionValidationSchema = z.object({
  id: z.string().min(1),
});
export type TDeleteResourceActionValidationSchema = z.infer<
  typeof DeleteResourceActionValidationSchema
>;

export const DeleteResourceActionInput = z.object({
  payload: DeleteResourceActionValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteResourceActionInput = z.infer<
  typeof DeleteResourceActionInput
>;
