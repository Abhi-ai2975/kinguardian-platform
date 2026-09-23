import z from "zod";
import { TransportOptionsSchema } from "../../transport";

// ------------------------------------------------------------------ //
// App schemas
// ------------------------------------------------------------------ //

export const AppSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
  isActive: z.boolean(),
  deletedAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type TAppSchema = z.infer<typeof AppSchema>;

export const ListAppsResponseSchema = z.object({
  apps: z.array(AppSchema),
});
export type TListAppsResponseSchema = z.infer<typeof ListAppsResponseSchema>;

// Create App
export const CreateAppFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});
export type TCreateAppFormSchema = z.infer<typeof CreateAppFormSchema>;

export const CreateAppValidationSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  createdBy: z.string().optional(),
});
export type TCreateAppValidationSchema = z.infer<
  typeof CreateAppValidationSchema
>;

export const CreateAppActionSchema = z.object({
  payload: CreateAppValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateAppActionSchema = z.infer<typeof CreateAppActionSchema>;

// Update App
export const UpdateAppFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
  description: z.string().optional(),
  isActive: z.boolean(),
});
export type TUpdateAppFormSchema = z.infer<typeof UpdateAppFormSchema>;

export const UpdateAppValidationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  updatedBy: z.string().optional(),
});
export type TUpdateAppValidationSchema = z.infer<
  typeof UpdateAppValidationSchema
>;

export const UpdateAppActionSchema = z.object({
  payload: UpdateAppValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateAppActionSchema = z.infer<typeof UpdateAppActionSchema>;

// Delete App
export const DeleteAppValidationSchema = z.object({
  id: z.string().min(1),
});
export type TDeleteAppValidationSchema = z.infer<
  typeof DeleteAppValidationSchema
>;

export const DeleteAppActionSchema = z.object({
  payload: DeleteAppValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteAppActionSchema = z.infer<typeof DeleteAppActionSchema>;

// ------------------------------------------------------------------ //
// MenuNode schemas
// ------------------------------------------------------------------ //

export const MenuNodeSchema = z.object({
  id: z.string(),
  appId: z.string(),
  parentId: z.string().nullable().optional(),
  parentLabel: z.string().nullable().optional(),
  label: z.string(),
  slug: z.string(),
  icon: z.string().nullable().optional(),
  href: z.string().nullable().optional(),
  order: z.number(),
  type: z.enum(["GROUP", "ITEM"]),
  isActive: z.boolean(),
  isVisible: z.boolean().default(true),
  permissionKeys: z.array(z.string()).default([]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type TMenuNodeSchema = z.infer<typeof MenuNodeSchema>;

export const ListMenuNodesResponseSchema = z.object({
  nodes: z.array(MenuNodeSchema),
});
export type TListMenuNodesResponseSchema = z.infer<
  typeof ListMenuNodesResponseSchema
>;

// Create MenuNode
export const CreateMenuNodeFormSchema = z.object({
  appId: z.string().min(1, "App is required"),
  parentId: z.string().optional(),
  label: z.string().min(1, "Label is required"),
  slug: z.string().min(1, "Slug is required"),
  icon: z.string().optional(),
  href: z.string().optional(),
  type: z.enum(["GROUP", "ITEM"]).default("ITEM"),
  order: z.number().default(0),
  isVisible: z.boolean().default(true),
  permissionKeys: z.array(z.string()).default([]),
});
export type TCreateMenuNodeFormSchema = z.infer<
  typeof CreateMenuNodeFormSchema
>;

export const CreateMenuNodeValidationSchema = z.object({
  appId: z.string().min(1),
  parentId: z.string().optional(),
  label: z.string().min(1),
  slug: z.string().min(1),
  icon: z.string().optional(),
  href: z.string().optional(),
  type: z.enum(["GROUP", "ITEM"]).default("ITEM"),
  order: z.number().default(0),
  isVisible: z.boolean().default(true),
  permissionKeys: z.array(z.string()).default([]),
});
export type TCreateMenuNodeValidationSchema = z.infer<
  typeof CreateMenuNodeValidationSchema
>;

export const CreateMenuNodeActionSchema = z.object({
  payload: CreateMenuNodeValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateMenuNodeActionSchema = z.infer<
  typeof CreateMenuNodeActionSchema
>;

// Update MenuNode
export const UpdateMenuNodeFormSchema = z.object({
  parentId: z.string().optional(),
  label: z.string().min(1, "Label is required"),
  slug: z.string().min(1, "Slug is required"),
  icon: z.string().optional(),
  href: z.string().optional(),
  type: z.enum(["GROUP", "ITEM"]),
  order: z.number(),
  isActive: z.boolean(),
  isVisible: z.boolean(),
  permissionKeys: z.array(z.string()).default([]),
});
export type TUpdateMenuNodeFormSchema = z.infer<
  typeof UpdateMenuNodeFormSchema
>;

export const UpdateMenuNodeValidationSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().nullable().optional(),
  label: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  icon: z.string().nullable().optional(),
  href: z.string().nullable().optional(),
  type: z.enum(["GROUP", "ITEM"]).optional(),
  order: z.number().optional(),
  isActive: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  permissionKeys: z.array(z.string()).optional(),
});
export type TUpdateMenuNodeValidationSchema = z.infer<
  typeof UpdateMenuNodeValidationSchema
>;

export const UpdateMenuNodeActionSchema = z.object({
  payload: UpdateMenuNodeValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateMenuNodeActionSchema = z.infer<
  typeof UpdateMenuNodeActionSchema
>;

// Delete MenuNode
export const DeleteMenuNodeValidationSchema = z.object({
  id: z.string().min(1),
});
export type TDeleteMenuNodeValidationSchema = z.infer<
  typeof DeleteMenuNodeValidationSchema
>;

export const DeleteMenuNodeActionSchema = z.object({
  payload: DeleteMenuNodeValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteMenuNodeActionSchema = z.infer<
  typeof DeleteMenuNodeActionSchema
>;

// Reorder MenuNode
export const ReorderMenuNodeValidationSchema = z.object({
  nodeId: z.string().min(1),
  direction: z.enum(["up", "down"]),
});
export type TReorderMenuNodeValidationSchema = z.infer<
  typeof ReorderMenuNodeValidationSchema
>;

export const ReorderMenuNodeActionSchema = z.object({
  payload: ReorderMenuNodeValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TReorderMenuNodeActionSchema = z.infer<
  typeof ReorderMenuNodeActionSchema
>;

// ------------------------------------------------------------------ //
// ResourceAction schemas (for admin reference — NOT for runtime evaluation)
// ------------------------------------------------------------------ //

export const ResourceActionSchema = z.object({
  id: z.string(),
  resourceId: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  key: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type TResourceActionSchema = z.infer<typeof ResourceActionSchema>;

export const ListActionsResponseSchema = z.object({
  actions: z.array(ResourceActionSchema),
});
export type TListActionsResponseSchema = z.infer<
  typeof ListActionsResponseSchema
>;
