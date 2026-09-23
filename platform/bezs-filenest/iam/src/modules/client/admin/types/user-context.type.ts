import { TListUserContextsControllerOutput } from "@/modules/server/core/admin/interface-adapters/controllers/usercontext/listUserContexts.controller";
import { ZSAError } from "zsa";

export type TUserContextListItem = TListUserContextsControllerOutput[number];

export interface IUserContextTableProps {
  items: TListUserContextsControllerOutput | null;
  error: ZSAError | null;
}
