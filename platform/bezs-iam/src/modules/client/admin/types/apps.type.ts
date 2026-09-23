import {
  TListAppsControllerOutput,
  TListMenuNodesControllerOutput,
  TListActionsControllerOutput,
} from "@/modules/server/core/admin/interface-adapters/controllers/apps";
import { ZSAError } from "zsa";

export type TApp = TListAppsControllerOutput[number];
export type TMenuNode = TListMenuNodesControllerOutput[number];
export type TAction = TListActionsControllerOutput[number];

export interface IAppsTableProps {
  apps: TListAppsControllerOutput | null;
  error: ZSAError | null;
}

export interface IMenuNodesTreeProps {
  nodes: TListMenuNodesControllerOutput | null;
  appId: string;
  appName: string;
  error: ZSAError | null;
}
