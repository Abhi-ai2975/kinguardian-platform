/**
 * server/presentation/actions/project.actions — ZSA server actions for projects.
 *
 * Layer: presentation / actions
 * Resource: Project
 *
 * Actions are thin: apply the ZSA gate (authenticatedProcedure), delegate to
 * the controller, and wrap mutations in runWithTransport for revalidation.
 * No business logic, no direct filenestApi calls — those live in the layers below.
 *
 * listProjectsAction   — read; safe to call directly from RSC pages.
 * createProjectAction  — mutation; revalidates caller-supplied path on success.
 * updateProjectAction  — mutation; revalidates caller-supplied path on success.
 * deleteProjectAction  — mutation; revalidates caller-supplied path on success.
 *
 * @module
 */
"use server";

import { authenticatedProcedure } from "./procedures";
import { runWithTransport } from "@/modules/server/utils/run-with-transport";
import {
  getProjectController,
  listProjectsController,
  createProjectController,
  updateProjectController,
  deleteProjectController,
  type TGetProjectControllerOutput,
  type TListProjectsControllerOutput,
  type TCreateProjectControllerOutput,
  type TUpdateProjectControllerOutput,
  type TDeleteProjectControllerOutput,
} from "@/modules/server/core/project/interface-adapters/controllers";
import {
  GetProjectActionSchema,
  ListProjectsActionSchema,
  CreateProjectActionSchema,
  UpdateProjectActionSchema,
  DeleteProjectActionSchema,
  type TGetProjectAction,
  type TListProjectsAction,
  type TCreateProjectAction,
  type TUpdateProjectAction,
  type TDeleteProjectAction,
} from "@/modules/entities/schemas/project";

export const getProjectAction = authenticatedProcedure
  .createServerAction()
  .input(GetProjectActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetProjectAction }) => {
    return await runWithTransport<TGetProjectControllerOutput>(async () => {
      const data = await getProjectController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const listProjectsAction = authenticatedProcedure
  .createServerAction()
  .input(ListProjectsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListProjectsAction }) => {
    return await runWithTransport<TListProjectsControllerOutput>(async () => {
      const data = await listProjectsController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const createProjectAction = authenticatedProcedure
  .createServerAction()
  .input(CreateProjectActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TCreateProjectAction }) => {
    return await runWithTransport<TCreateProjectControllerOutput>(async () => {
      const data = await createProjectController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const updateProjectAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateProjectActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateProjectAction }) => {
    return await runWithTransport<TUpdateProjectControllerOutput>(async () => {
      const data = await updateProjectController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const deleteProjectAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteProjectActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteProjectAction }) => {
    return await runWithTransport<TDeleteProjectControllerOutput>(async () => {
      await deleteProjectController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
