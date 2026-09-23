import { ZSAError } from "zsa";
import { TConsentSchema } from "@/modules/entities/schemas/admin/consents/consents.schema";
import { TListConsentsControllerOutput } from "@/modules/server/core/admin/interface-adapters/controllers/consents";

export type TConsent = TConsentSchema;

export interface IConsentsTableProps {
  consents: TListConsentsControllerOutput | null;
  error: ZSAError | null;
}
