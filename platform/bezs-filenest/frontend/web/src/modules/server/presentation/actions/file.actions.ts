/**
 * server/presentation/actions/file.actions — ZSA server actions for files.
 *
 * Layer: presentation / actions
 * Resource: File
 *
 * listFilesAction            — read; call from RSC pages or client components.
 * deleteFileAction           — mutation; revalidates the files page.
 * getFileDownloadUrlAction   — read; returns presigned URL for client to open.
 * initiateUploadAction       — mutation; creates file record + presigned PUT URL.
 * confirmUploadAction        — mutation; marks file ready after PUT completes.
 * initiateMultipartAction    — mutation; starts multipart upload session.
 * getPartUrlAction           — read; presigned URL for one chunk.
 * completeMultipartAction    — mutation; assembles chunks and triggers pipeline.
 * abortMultipartAction       — mutation; discards in-progress multipart session.
 *
 * @module
 */
"use server";

import { authenticatedProcedure } from "./procedures";
import { runWithTransport } from "@/modules/server/utils/run-with-transport";
import {
  listFilesController,
  deleteFileController,
  getFileDownloadUrlController,
  setTagsController,
  addTagsController,
  updateMetadataController,
  mergeMetadataController,
  initiateUploadController,
  confirmUploadController,
  initiateMultipartController,
  getPartUrlController,
  completeMultipartController,
  abortMultipartController,
  renameFileController,
  moveFileController,
  type TListFilesControllerOutput,
  type TDeleteFileControllerOutput,
  type TGetFileDownloadUrlControllerOutput,
  type TSetTagsControllerOutput,
  type TAddTagsControllerOutput,
  type TUpdateMetadataControllerOutput,
  type TMergeMetadataControllerOutput,
  type TInitiateUploadControllerOutput,
  type TConfirmUploadControllerOutput,
  type TInitiateMultipartControllerOutput,
  type TGetPartUrlControllerOutput,
  type TCompleteMultipartControllerOutput,
  type TAbortMultipartControllerOutput,
  type TRenameFileControllerOutput,
  type TMoveFileControllerOutput,
} from "@/modules/server/core/file/interface-adapters/controllers";
import {
  ListFilesActionSchema,
  DeleteFileActionSchema,
  GetFileDownloadUrlActionSchema,
  SetTagsActionSchema,
  AddTagsActionSchema,
  UpdateMetadataActionSchema,
  MergeMetadataActionSchema,
  InitiateUploadActionSchema,
  ConfirmUploadActionSchema,
  InitiateMultipartActionSchema,
  GetPartUrlActionSchema,
  CompleteMultipartActionSchema,
  AbortMultipartActionSchema,
  RenameFileActionSchema,
  MoveFileActionSchema,
  type TListFilesAction,
  type TDeleteFileAction,
  type TGetFileDownloadUrlAction,
  type TSetTagsAction,
  type TAddTagsAction,
  type TUpdateMetadataAction,
  type TMergeMetadataAction,
  type TInitiateUploadAction,
  type TConfirmUploadAction,
  type TInitiateMultipartAction,
  type TGetPartUrlAction,
  type TCompleteMultipartAction,
  type TAbortMultipartAction,
  type TRenameFileAction,
  type TMoveFileAction,
} from "@/modules/entities/schemas/file";

export const listFilesAction = authenticatedProcedure
  .createServerAction()
  .input(ListFilesActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListFilesAction }) => {
    return await runWithTransport<TListFilesControllerOutput>(async () => {
      const data = await listFilesController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const deleteFileAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteFileActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteFileAction }) => {
    return await runWithTransport<TDeleteFileControllerOutput>(async () => {
      await deleteFileController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });

export const getFileDownloadUrlAction = authenticatedProcedure
  .createServerAction()
  .input(GetFileDownloadUrlActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetFileDownloadUrlAction }) => {
    return await runWithTransport<TGetFileDownloadUrlControllerOutput>(async () => {
      const data = await getFileDownloadUrlController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const setTagsAction = authenticatedProcedure
  .createServerAction()
  .input(SetTagsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TSetTagsAction }) => {
    return await runWithTransport<TSetTagsControllerOutput>(async () => {
      const data = await setTagsController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const addTagsAction = authenticatedProcedure
  .createServerAction()
  .input(AddTagsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TAddTagsAction }) => {
    return await runWithTransport<TAddTagsControllerOutput>(async () => {
      const data = await addTagsController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const updateMetadataAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateMetadataActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateMetadataAction }) => {
    return await runWithTransport<TUpdateMetadataControllerOutput>(async () => {
      const data = await updateMetadataController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const mergeMetadataAction = authenticatedProcedure
  .createServerAction()
  .input(MergeMetadataActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TMergeMetadataAction }) => {
    return await runWithTransport<TMergeMetadataControllerOutput>(async () => {
      const data = await mergeMetadataController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

// ── Upload actions ───────────────────────────────────────────────────────────

export const initiateUploadAction = authenticatedProcedure
  .createServerAction()
  .input(InitiateUploadActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TInitiateUploadAction }) => {
    return await runWithTransport<TInitiateUploadControllerOutput>(async () => {
      const data = await initiateUploadController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const confirmUploadAction = authenticatedProcedure
  .createServerAction()
  .input(ConfirmUploadActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TConfirmUploadAction }) => {
    return await runWithTransport<TConfirmUploadControllerOutput>(async () => {
      const data = await confirmUploadController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const initiateMultipartAction = authenticatedProcedure
  .createServerAction()
  .input(InitiateMultipartActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TInitiateMultipartAction }) => {
    return await runWithTransport<TInitiateMultipartControllerOutput>(async () => {
      const data = await initiateMultipartController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const getPartUrlAction = authenticatedProcedure
  .createServerAction()
  .input(GetPartUrlActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetPartUrlAction }) => {
    return await runWithTransport<TGetPartUrlControllerOutput>(async () => {
      const data = await getPartUrlController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const completeMultipartAction = authenticatedProcedure
  .createServerAction()
  .input(CompleteMultipartActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TCompleteMultipartAction }) => {
    return await runWithTransport<TCompleteMultipartControllerOutput>(async () => {
      const data = await completeMultipartController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const abortMultipartAction = authenticatedProcedure
  .createServerAction()
  .input(AbortMultipartActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TAbortMultipartAction }) => {
    return await runWithTransport<TAbortMultipartControllerOutput>(async () => {
      const data = await abortMultipartController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const renameFileAction = authenticatedProcedure
  .createServerAction()
  .input(RenameFileActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TRenameFileAction }) => {
    return await runWithTransport<TRenameFileControllerOutput>(async () => {
      const data = await renameFileController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const moveFileAction = authenticatedProcedure
  .createServerAction()
  .input(MoveFileActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TMoveFileAction }) => {
    return await runWithTransport<TMoveFileControllerOutput>(async () => {
      const data = await moveFileController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });
