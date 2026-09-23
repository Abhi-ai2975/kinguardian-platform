/**
 * Patient ZSA action schemas.
 *
 * Layer: entities / schemas / patient
 *
 * Wraps every input validation schema in the ZSA action envelope:
 *  - Mutating operations (create, update, delete, sub-resource mutations)
 *    include `transportOptions` for cache revalidation.
 *  - Read operations (list, getById, listSubResource) do not.
 *
 * All action schemas use `skipInputParsing: true` in ZSA — the controller
 * performs the actual Zod validation via `safeParseAsync`.
 *
 * TransportOptionsSchema is always imported from the shared transport module —
 * never defined inline.
 */

import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  // Core
  CreatePatientValidationSchema,
  CreatePatientFullValidationSchema,
  UpdatePatientValidationSchema,
  UpdatePatientFullValidationSchema,
  ListPatientsValidationSchema,
  GetPatientByIdValidationSchema,
  DeletePatientValidationSchema,
  // Names
  AddPatientNameValidationSchema,
  PatchPatientNameValidationSchema,
  // Identifiers
  AddPatientIdentifierValidationSchema,
  PatchPatientIdentifierValidationSchema,
  // Telecom
  AddPatientTelecomValidationSchema,
  PatchPatientTelecomValidationSchema,
  // Addresses
  AddPatientAddressValidationSchema,
  PatchPatientAddressValidationSchema,
  // Photos
  AddPatientPhotoValidationSchema,
  PatchPatientPhotoValidationSchema,
  // Contacts
  AddPatientContactValidationSchema,
  PatchPatientContactValidationSchema,
  // Communications
  AddPatientCommunicationValidationSchema,
  PatchPatientCommunicationValidationSchema,
  // General Practitioners
  AddPatientGPValidationSchema,
  PatchPatientGPValidationSchema,
  // Links
  AddPatientLinkValidationSchema,
  PatchPatientLinkValidationSchema,
  // Shared sub-resource helpers
  ListPatientSubResourceValidationSchema,
  DeletePatientSubResourceValidationSchema,
} from "./input";

// ── Core ──────────────────────────────────────────────────────────────────────

export const CreatePatientActionSchema = z.object({
  payload: CreatePatientValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreatePatientAction = z.infer<typeof CreatePatientActionSchema>;

/** Action schema for POST /patients/full — atomic patient + sub-resource creation. */
export const CreatePatientFullActionSchema = z.object({
  payload: CreatePatientFullValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreatePatientFullAction = z.infer<typeof CreatePatientFullActionSchema>;

/** Action schema for PATCH /patients/{id}/full — atomic patient + sub-resource update. */
export const UpdatePatientFullActionSchema = z.object({
  payload: UpdatePatientFullValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdatePatientFullAction = z.infer<typeof UpdatePatientFullActionSchema>;

export const ListPatientsActionSchema = z.object({
  payload: ListPatientsValidationSchema.optional(),
});
export type TListPatientsAction = z.infer<typeof ListPatientsActionSchema>;

export const GetPatientByIdActionSchema = z.object({
  payload: GetPatientByIdValidationSchema,
});
export type TGetPatientByIdAction = z.infer<typeof GetPatientByIdActionSchema>;

export const UpdatePatientActionSchema = z.object({
  payload: UpdatePatientValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdatePatientAction = z.infer<typeof UpdatePatientActionSchema>;

export const DeletePatientActionSchema = z.object({
  payload: DeletePatientValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeletePatientAction = z.infer<typeof DeletePatientActionSchema>;

// ── Names ─────────────────────────────────────────────────────────────────────

export const AddPatientNameActionSchema = z.object({
  payload: AddPatientNameValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TAddPatientNameAction = z.infer<typeof AddPatientNameActionSchema>;

export const ListPatientNamesActionSchema = z.object({
  payload: ListPatientSubResourceValidationSchema,
});
export type TListPatientNamesAction = z.infer<typeof ListPatientNamesActionSchema>;

export const PatchPatientNameActionSchema = z.object({
  payload: PatchPatientNameValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TPatchPatientNameAction = z.infer<typeof PatchPatientNameActionSchema>;

export const DeletePatientNameActionSchema = z.object({
  payload: DeletePatientSubResourceValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeletePatientNameAction = z.infer<typeof DeletePatientNameActionSchema>;

// ── Identifiers ───────────────────────────────────────────────────────────────

export const AddPatientIdentifierActionSchema = z.object({
  payload: AddPatientIdentifierValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TAddPatientIdentifierAction = z.infer<typeof AddPatientIdentifierActionSchema>;

export const ListPatientIdentifiersActionSchema = z.object({
  payload: ListPatientSubResourceValidationSchema,
});
export type TListPatientIdentifiersAction = z.infer<typeof ListPatientIdentifiersActionSchema>;

export const PatchPatientIdentifierActionSchema = z.object({
  payload: PatchPatientIdentifierValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TPatchPatientIdentifierAction = z.infer<typeof PatchPatientIdentifierActionSchema>;

export const DeletePatientIdentifierActionSchema = z.object({
  payload: DeletePatientSubResourceValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeletePatientIdentifierAction = z.infer<typeof DeletePatientIdentifierActionSchema>;

// ── Telecom ───────────────────────────────────────────────────────────────────

export const AddPatientTelecomActionSchema = z.object({
  payload: AddPatientTelecomValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TAddPatientTelecomAction = z.infer<typeof AddPatientTelecomActionSchema>;

export const ListPatientTelecomActionSchema = z.object({
  payload: ListPatientSubResourceValidationSchema,
});
export type TListPatientTelecomAction = z.infer<typeof ListPatientTelecomActionSchema>;

export const PatchPatientTelecomActionSchema = z.object({
  payload: PatchPatientTelecomValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TPatchPatientTelecomAction = z.infer<typeof PatchPatientTelecomActionSchema>;

export const DeletePatientTelecomActionSchema = z.object({
  payload: DeletePatientSubResourceValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeletePatientTelecomAction = z.infer<typeof DeletePatientTelecomActionSchema>;

// ── Addresses ─────────────────────────────────────────────────────────────────

export const AddPatientAddressActionSchema = z.object({
  payload: AddPatientAddressValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TAddPatientAddressAction = z.infer<typeof AddPatientAddressActionSchema>;

export const ListPatientAddressesActionSchema = z.object({
  payload: ListPatientSubResourceValidationSchema,
});
export type TListPatientAddressesAction = z.infer<typeof ListPatientAddressesActionSchema>;

export const PatchPatientAddressActionSchema = z.object({
  payload: PatchPatientAddressValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TPatchPatientAddressAction = z.infer<typeof PatchPatientAddressActionSchema>;

export const DeletePatientAddressActionSchema = z.object({
  payload: DeletePatientSubResourceValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeletePatientAddressAction = z.infer<typeof DeletePatientAddressActionSchema>;

// ── Photos ────────────────────────────────────────────────────────────────────

export const AddPatientPhotoActionSchema = z.object({
  payload: AddPatientPhotoValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TAddPatientPhotoAction = z.infer<typeof AddPatientPhotoActionSchema>;

export const ListPatientPhotosActionSchema = z.object({
  payload: ListPatientSubResourceValidationSchema,
});
export type TListPatientPhotosAction = z.infer<typeof ListPatientPhotosActionSchema>;

export const PatchPatientPhotoActionSchema = z.object({
  payload: PatchPatientPhotoValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TPatchPatientPhotoAction = z.infer<typeof PatchPatientPhotoActionSchema>;

export const DeletePatientPhotoActionSchema = z.object({
  payload: DeletePatientSubResourceValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeletePatientPhotoAction = z.infer<typeof DeletePatientPhotoActionSchema>;

// ── Contacts ──────────────────────────────────────────────────────────────────

export const AddPatientContactActionSchema = z.object({
  payload: AddPatientContactValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TAddPatientContactAction = z.infer<typeof AddPatientContactActionSchema>;

export const ListPatientContactsActionSchema = z.object({
  payload: ListPatientSubResourceValidationSchema,
});
export type TListPatientContactsAction = z.infer<typeof ListPatientContactsActionSchema>;

export const PatchPatientContactActionSchema = z.object({
  payload: PatchPatientContactValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TPatchPatientContactAction = z.infer<typeof PatchPatientContactActionSchema>;

export const DeletePatientContactActionSchema = z.object({
  payload: DeletePatientSubResourceValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeletePatientContactAction = z.infer<typeof DeletePatientContactActionSchema>;

// ── Communications ────────────────────────────────────────────────────────────

export const AddPatientCommunicationActionSchema = z.object({
  payload: AddPatientCommunicationValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TAddPatientCommunicationAction = z.infer<typeof AddPatientCommunicationActionSchema>;

export const ListPatientCommunicationsActionSchema = z.object({
  payload: ListPatientSubResourceValidationSchema,
});
export type TListPatientCommunicationsAction = z.infer<typeof ListPatientCommunicationsActionSchema>;

export const PatchPatientCommunicationActionSchema = z.object({
  payload: PatchPatientCommunicationValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TPatchPatientCommunicationAction = z.infer<typeof PatchPatientCommunicationActionSchema>;

export const DeletePatientCommunicationActionSchema = z.object({
  payload: DeletePatientSubResourceValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeletePatientCommunicationAction = z.infer<typeof DeletePatientCommunicationActionSchema>;

// ── General Practitioners ─────────────────────────────────────────────────────

export const AddPatientGPActionSchema = z.object({
  payload: AddPatientGPValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TAddPatientGPAction = z.infer<typeof AddPatientGPActionSchema>;

export const ListPatientGPsActionSchema = z.object({
  payload: ListPatientSubResourceValidationSchema,
});
export type TListPatientGPsAction = z.infer<typeof ListPatientGPsActionSchema>;

export const PatchPatientGPActionSchema = z.object({
  payload: PatchPatientGPValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TPatchPatientGPAction = z.infer<typeof PatchPatientGPActionSchema>;

export const DeletePatientGPActionSchema = z.object({
  payload: DeletePatientSubResourceValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeletePatientGPAction = z.infer<typeof DeletePatientGPActionSchema>;

// ── Links ─────────────────────────────────────────────────────────────────────

export const AddPatientLinkActionSchema = z.object({
  payload: AddPatientLinkValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TAddPatientLinkAction = z.infer<typeof AddPatientLinkActionSchema>;

export const ListPatientLinksActionSchema = z.object({
  payload: ListPatientSubResourceValidationSchema,
});
export type TListPatientLinksAction = z.infer<typeof ListPatientLinksActionSchema>;

export const PatchPatientLinkActionSchema = z.object({
  payload: PatchPatientLinkValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TPatchPatientLinkAction = z.infer<typeof PatchPatientLinkActionSchema>;

export const DeletePatientLinkActionSchema = z.object({
  payload: DeletePatientSubResourceValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeletePatientLinkAction = z.infer<typeof DeletePatientLinkActionSchema>;
