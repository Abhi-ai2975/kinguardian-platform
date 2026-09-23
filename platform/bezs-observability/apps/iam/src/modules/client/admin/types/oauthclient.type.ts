import { TGetOAuthClientsControllerOutput } from "@/modules/server/core/admin/interface-adapters/controllers/oauthclient/getOAuthclients.controller";
import { ZSAError } from "zsa";

export interface IOAuthClientsTableProps {
  oauthClients: TGetOAuthClientsControllerOutput | null;
  error: ZSAError | null;
}

export type TOAuthClient = TGetOAuthClientsControllerOutput[number];
