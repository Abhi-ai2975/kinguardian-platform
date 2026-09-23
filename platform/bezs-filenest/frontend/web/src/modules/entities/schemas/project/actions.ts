/**
 * entities/schemas/project/actions — ZSA action envelope schemas.
 *
 * Every action schema carries `transportOptions` as a standard field so the
 * server can call `revalidatePath` or `redirect` after any action completes —
 * reads included. This is the default contract for all action envelopes.
 *
 * @module
 */
import { z } from "zod";
import { TransportOptionsSchema } from "../transport";
import { CreateProjectSchema, ListProjectsParamsSchema, UpdateProjectSchema } from "./input";

export const GetProjectActionSchema = z.object({
  payload: z.object({ projectId: z.string().min(1) }),
  transportOptions: TransportOptionsSchema.optional(),
});

export type TGetProjectAction = z.infer<typeof GetProjectActionSchema>;

export const ListProjectsActionSchema = z.object({
  payload: ListProjectsParamsSchema.optional(),
  transportOptions: TransportOptionsSchema.optional(),
});

export type TListProjectsAction = z.infer<typeof ListProjectsActionSchema>;

export const CreateProjectActionSchema = z.object({
  payload: CreateProjectSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TCreateProjectAction = z.infer<typeof CreateProjectActionSchema>;

export const UpdateProjectActionSchema = z.object({
  payload: UpdateProjectSchema.extend({ projectId: z.string().min(1) }),
  transportOptions: TransportOptionsSchema.optional(),
});

export type TUpdateProjectAction = z.infer<typeof UpdateProjectActionSchema>;

export const DeleteProjectActionSchema = z.object({
  payload: z.object({ projectId: z.string().min(1) }),
  transportOptions: TransportOptionsSchema.optional(),
});

export type TDeleteProjectAction = z.infer<typeof DeleteProjectActionSchema>;
