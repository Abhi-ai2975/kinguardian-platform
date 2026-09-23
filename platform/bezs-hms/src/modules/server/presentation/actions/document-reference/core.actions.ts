/**
 * DocumentReference ZSA server actions.
 * Layer: server / presentation / actions / document-reference
 * All actions require a valid session (authenticatedProcedure).
 */
"use server";

import {
  CreateDocumentReferenceActionSchema,
  ListDocumentReferencesActionSchema,
  GetDocumentReferenceByIdActionSchema,
  UpdateDocumentReferenceActionSchema,
  DeleteDocumentReferenceActionSchema,
  type TCreateDocumentReferenceAction,
  type TListDocumentReferencesAction,
  type TGetDocumentReferenceByIdAction,
  type TUpdateDocumentReferenceAction,
  type TDeleteDocumentReferenceAction,
} from "@/modules/entities/schemas/document-reference";
import {
  createDocumentReferenceController,
  listDocumentReferencesController,
  getDocumentReferenceByIdController,
  updateDocumentReferenceController,
  deleteDocumentReferenceController,
  type TCreateDocumentReferenceControllerOutput,
  type TListDocumentReferencesControllerOutput,
  type TGetDocumentReferenceByIdControllerOutput,
  type TUpdateDocumentReferenceControllerOutput,
} from "@/modules/server/core/document-reference/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";

export const createDocumentReferenceAction = authenticatedProcedure
  .createServerAction()
  .input(CreateDocumentReferenceActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TCreateDocumentReferenceAction }) => {
    return await runWithTransport<TCreateDocumentReferenceControllerOutput>(async () => {
      const data = await createDocumentReferenceController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const listDocumentReferencesAction = authenticatedProcedure
  .createServerAction()
  .input(ListDocumentReferencesActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListDocumentReferencesAction }) => {
    return await runWithTransport<TListDocumentReferencesControllerOutput>(async () => {
      const data = await listDocumentReferencesController(input.payload);
      return { result: data };
    });
  });

export const getDocumentReferenceByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetDocumentReferenceByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetDocumentReferenceByIdAction }) => {
    return await runWithTransport<TGetDocumentReferenceByIdControllerOutput>(async () => {
      const data = await getDocumentReferenceByIdController(input.payload);
      return { result: data };
    });
  });

export const updateDocumentReferenceAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateDocumentReferenceActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateDocumentReferenceAction }) => {
    return await runWithTransport<TUpdateDocumentReferenceControllerOutput>(async () => {
      const data = await updateDocumentReferenceController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const deleteDocumentReferenceAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteDocumentReferenceActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteDocumentReferenceAction }) => {
    return await runWithTransport<void>(async () => {
      await deleteDocumentReferenceController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
