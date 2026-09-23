import { ZSAError } from "zsa";
import { TGetAllSessionsControllerOutput } from "@/modules/server/core/admin/interface-adapters/controllers/sessions";

export type TSession = TGetAllSessionsControllerOutput[number];

export interface ISessionsTableProps {
  sessions: TGetAllSessionsControllerOutput | null;
  error: ZSAError | null;
}
