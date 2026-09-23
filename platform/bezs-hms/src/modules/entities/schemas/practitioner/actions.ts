/**
 * Practitioner ZSA action schemas.
 *
 * Layer: entities / schemas / practitioner
 *
 * Wraps validation schemas in the shape expected by ZSA server actions
 * (payload + optional transportOptions). Mutating operations include
 * transportOptions; reads do not.
 *
 * Imports validation schemas from ./input (relative) to avoid circular
 * barrel references via index.ts.
 */

import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  CreatePractitionerValidationSchema,
  CreatePractitionerFullValidationSchema,
  UpdatePractitionerValidationSchema,
  UpdatePractitionerFullValidationSchema,
  ListPractitionersValidationSchema,
  GetByIdPractitionerValidationSchema,
  GetMyPractitionerValidationSchema,
  DeletePractitionerValidationSchema,
  // names
  AddPractitionerNameSchema,
  PatchPractitionerNameValidationSchema,
  // identifiers
  AddPractitionerIdentifierSchema,
  PatchPractitionerIdentifierValidationSchema,
  // telecom
  AddPractitionerTelecomSchema,
  PatchPractitionerTelecomValidationSchema,
  // addresses
  AddPractitionerAddressSchema,
  PatchPractitionerAddressValidationSchema,
  // photos
  AddPractitionerPhotoSchema,
  PatchPractitionerPhotoValidationSchema,
  // qualifications
  AddPractitionerQualificationSchema,
  PatchPractitionerQualificationValidationSchema,
  // communications
  AddPractitionerCommunicationSchema,
  PatchPractitionerCommunicationValidationSchema,
  // shared sub-resource delete
  DeletePractitionerSubResourceValidationSchema,
} from "./input";

// ── Core CRUD action schemas ──────────────────────────────────────────────────

export const CreatePractitionerActionSchema = z.object({
  payload: CreatePractitionerValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreatePractitionerAction = z.infer<typeof CreatePractitionerActionSchema>;

/** Action schema for POST /practitioners/full — atomic practitioner + sub-resource creation. */
export const CreatePractitionerFullActionSchema = z.object({
  payload: CreatePractitionerFullValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreatePractitionerFullAction = z.infer<typeof CreatePractitionerFullActionSchema>;

/** Action schema for PATCH /practitioners/{id}/full — atomic practitioner + sub-resource update. */
export const UpdatePractitionerFullActionSchema = z.object({
  payload: UpdatePractitionerFullValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdatePractitionerFullAction = z.infer<typeof UpdatePractitionerFullActionSchema>;

export const ListPractitionersActionSchema = z.object({
  payload: ListPractitionersValidationSchema.optional(),
});
export type TListPractitionersAction = z.infer<typeof ListPractitionersActionSchema>;

export const GetPractitionerByIdActionSchema = z.object({
  payload: GetByIdPractitionerValidationSchema,
});
export type TGetPractitionerByIdAction = z.infer<typeof GetPractitionerByIdActionSchema>;

export const GetMyPractitionerActionSchema = z.object({
  payload: GetMyPractitionerValidationSchema,
});
export type TGetMyPractitionerAction = z.infer<typeof GetMyPractitionerActionSchema>;

export const UpdatePractitionerActionSchema = z.object({
  payload: UpdatePractitionerValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdatePractitionerAction = z.infer<typeof UpdatePractitionerActionSchema>;

export const DeletePractitionerActionSchema = z.object({
  payload: DeletePractitionerValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeletePractitionerAction = z.infer<typeof DeletePractitionerActionSchema>;

// ── Names action schemas ──────────────────────────────────────────────────────

export const AddPractitionerNameActionSchema = z.object({
  payload: z.object({ practitionerId: z.number().int().positive() }).merge(AddPractitionerNameSchema),
  transportOptions: TransportOptionsSchema.optional(),
});
export type TAddPractitionerNameAction = z.infer<typeof AddPractitionerNameActionSchema>;

export const ListPractitionerNamesActionSchema = z.object({
  payload: z.object({ practitionerId: z.number().int().positive() }),
});
export type TListPractitionerNamesAction = z.infer<typeof ListPractitionerNamesActionSchema>;

export const PatchPractitionerNameActionSchema = z.object({
  payload: PatchPractitionerNameValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TPatchPractitionerNameAction = z.infer<typeof PatchPractitionerNameActionSchema>;

export const DeletePractitionerNameActionSchema = z.object({
  payload: DeletePractitionerSubResourceValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeletePractitionerNameAction = z.infer<typeof DeletePractitionerNameActionSchema>;

// ── Identifiers action schemas ────────────────────────────────────────────────

export const AddPractitionerIdentifierActionSchema = z.object({
  payload: z.object({ practitionerId: z.number().int().positive() }).merge(AddPractitionerIdentifierSchema),
  transportOptions: TransportOptionsSchema.optional(),
});
export type TAddPractitionerIdentifierAction = z.infer<typeof AddPractitionerIdentifierActionSchema>;

export const ListPractitionerIdentifiersActionSchema = z.object({
  payload: z.object({ practitionerId: z.number().int().positive() }),
});
export type TListPractitionerIdentifiersAction = z.infer<typeof ListPractitionerIdentifiersActionSchema>;

export const PatchPractitionerIdentifierActionSchema = z.object({
  payload: PatchPractitionerIdentifierValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TPatchPractitionerIdentifierAction = z.infer<typeof PatchPractitionerIdentifierActionSchema>;

export const DeletePractitionerIdentifierActionSchema = z.object({
  payload: DeletePractitionerSubResourceValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeletePractitionerIdentifierAction = z.infer<typeof DeletePractitionerIdentifierActionSchema>;

// ── Telecom action schemas ────────────────────────────────────────────────────

export const AddPractitionerTelecomActionSchema = z.object({
  payload: z.object({ practitionerId: z.number().int().positive() }).merge(AddPractitionerTelecomSchema),
  transportOptions: TransportOptionsSchema.optional(),
});
export type TAddPractitionerTelecomAction = z.infer<typeof AddPractitionerTelecomActionSchema>;

export const ListPractitionerTelecomActionSchema = z.object({
  payload: z.object({ practitionerId: z.number().int().positive() }),
});
export type TListPractitionerTelecomAction = z.infer<typeof ListPractitionerTelecomActionSchema>;

export const PatchPractitionerTelecomActionSchema = z.object({
  payload: PatchPractitionerTelecomValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TPatchPractitionerTelecomAction = z.infer<typeof PatchPractitionerTelecomActionSchema>;

export const DeletePractitionerTelecomActionSchema = z.object({
  payload: DeletePractitionerSubResourceValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeletePractitionerTelecomAction = z.infer<typeof DeletePractitionerTelecomActionSchema>;

// ── Addresses action schemas ──────────────────────────────────────────────────

export const AddPractitionerAddressActionSchema = z.object({
  payload: z.object({ practitionerId: z.number().int().positive() }).merge(AddPractitionerAddressSchema),
  transportOptions: TransportOptionsSchema.optional(),
});
export type TAddPractitionerAddressAction = z.infer<typeof AddPractitionerAddressActionSchema>;

export const ListPractitionerAddressesActionSchema = z.object({
  payload: z.object({ practitionerId: z.number().int().positive() }),
});
export type TListPractitionerAddressesAction = z.infer<typeof ListPractitionerAddressesActionSchema>;

export const PatchPractitionerAddressActionSchema = z.object({
  payload: PatchPractitionerAddressValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TPatchPractitionerAddressAction = z.infer<typeof PatchPractitionerAddressActionSchema>;

export const DeletePractitionerAddressActionSchema = z.object({
  payload: DeletePractitionerSubResourceValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeletePractitionerAddressAction = z.infer<typeof DeletePractitionerAddressActionSchema>;

// ── Photos action schemas ─────────────────────────────────────────────────────

export const AddPractitionerPhotoActionSchema = z.object({
  payload: z.object({ practitionerId: z.number().int().positive() }).merge(AddPractitionerPhotoSchema),
  transportOptions: TransportOptionsSchema.optional(),
});
export type TAddPractitionerPhotoAction = z.infer<typeof AddPractitionerPhotoActionSchema>;

export const ListPractitionerPhotosActionSchema = z.object({
  payload: z.object({ practitionerId: z.number().int().positive() }),
});
export type TListPractitionerPhotosAction = z.infer<typeof ListPractitionerPhotosActionSchema>;

export const PatchPractitionerPhotoActionSchema = z.object({
  payload: PatchPractitionerPhotoValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TPatchPractitionerPhotoAction = z.infer<typeof PatchPractitionerPhotoActionSchema>;

export const DeletePractitionerPhotoActionSchema = z.object({
  payload: DeletePractitionerSubResourceValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeletePractitionerPhotoAction = z.infer<typeof DeletePractitionerPhotoActionSchema>;

// ── Qualifications action schemas ─────────────────────────────────────────────

export const AddPractitionerQualificationActionSchema = z.object({
  payload: z.object({ practitionerId: z.number().int().positive() }).merge(AddPractitionerQualificationSchema),
  transportOptions: TransportOptionsSchema.optional(),
});
export type TAddPractitionerQualificationAction = z.infer<typeof AddPractitionerQualificationActionSchema>;

export const ListPractitionerQualificationsActionSchema = z.object({
  payload: z.object({ practitionerId: z.number().int().positive() }),
});
export type TListPractitionerQualificationsAction = z.infer<typeof ListPractitionerQualificationsActionSchema>;

export const PatchPractitionerQualificationActionSchema = z.object({
  payload: PatchPractitionerQualificationValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TPatchPractitionerQualificationAction = z.infer<typeof PatchPractitionerQualificationActionSchema>;

export const DeletePractitionerQualificationActionSchema = z.object({
  payload: DeletePractitionerSubResourceValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeletePractitionerQualificationAction = z.infer<typeof DeletePractitionerQualificationActionSchema>;

// ── Communications action schemas ─────────────────────────────────────────────

export const AddPractitionerCommunicationActionSchema = z.object({
  payload: z.object({ practitionerId: z.number().int().positive() }).merge(AddPractitionerCommunicationSchema),
  transportOptions: TransportOptionsSchema.optional(),
});
export type TAddPractitionerCommunicationAction = z.infer<typeof AddPractitionerCommunicationActionSchema>;

export const ListPractitionerCommunicationsActionSchema = z.object({
  payload: z.object({ practitionerId: z.number().int().positive() }),
});
export type TListPractitionerCommunicationsAction = z.infer<typeof ListPractitionerCommunicationsActionSchema>;

export const PatchPractitionerCommunicationActionSchema = z.object({
  payload: PatchPractitionerCommunicationValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TPatchPractitionerCommunicationAction = z.infer<typeof PatchPractitionerCommunicationActionSchema>;

export const DeletePractitionerCommunicationActionSchema = z.object({
  payload: DeletePractitionerSubResourceValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeletePractitionerCommunicationAction = z.infer<typeof DeletePractitionerCommunicationActionSchema>;
