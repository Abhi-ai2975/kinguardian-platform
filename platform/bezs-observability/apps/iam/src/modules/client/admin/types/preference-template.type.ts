import { TGetPreferenceTemplatesControllerOutput } from "@/modules/server/core/admin/interface-adapters/controllers/preference-templates/getPreferenceTemplates.controller";
import { ZSAError } from "zsa";

export interface IPreferenceTemplatesTableProps {
  templates: TGetPreferenceTemplatesControllerOutput | null;
  error: ZSAError | null;
}

export type TPreferenceTemplate =
  TGetPreferenceTemplatesControllerOutput[number];
