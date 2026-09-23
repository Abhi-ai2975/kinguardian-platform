/**
 * server/presentation/actions/folder.actions — ZSA server actions for folders.
 *
 * Layer: presentation / actions
 * Resource: Folder
 *
 * listFoldersAction   — read; returns all folders in a project (flat list).
 * createFolderAction  — mutation; creates a folder (optionally nested).
 * deleteFolderAction  — mutation; soft-deletes a folder (must be empty).
 *
 * @module
 */
"use server";

import { authenticatedProcedure } from "./procedures";
import { runWithTransport } from "@/modules/server/utils/run-with-transport";
import {
  listFoldersController,
  createFolderController,
  deleteFolderController,
  type TListFoldersControllerOutput,
  type TCreateFolderControllerOutput,
  type TDeleteFolderControllerOutput,
} from "@/modules/server/core/folder/interface-adapters/controllers";
import {
  ListFoldersActionSchema,
  CreateFolderActionSchema,
  DeleteFolderActionSchema,
  type TListFoldersAction,
  type TCreateFolderAction,
  type TDeleteFolderAction,
} from "@/modules/entities/schemas/folder";

export const listFoldersAction = authenticatedProcedure
  .createServerAction()
  .input(ListFoldersActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListFoldersAction }) => {
    return await runWithTransport<TListFoldersControllerOutput>(async () => {
      const data = await listFoldersController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const createFolderAction = authenticatedProcedure
  .createServerAction()
  .input(CreateFolderActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TCreateFolderAction }) => {
    return await runWithTransport<TCreateFolderControllerOutput>(async () => {
      const data = await createFolderController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const deleteFolderAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteFolderActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteFolderAction }) => {
    return await runWithTransport<TDeleteFolderControllerOutput>(async () => {
      const data = await deleteFolderController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });
