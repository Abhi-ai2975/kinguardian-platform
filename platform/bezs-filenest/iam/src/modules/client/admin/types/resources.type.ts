import { ZSAError } from "zsa";
import { TListResourcesControllerOutput } from "@/modules/server/core/admin/interface-adapters/controllers/resources/listResources.controller";
import { TListResourceActionsControllerOutput } from "@/modules/server/core/admin/interface-adapters/controllers/resources/listResourceActions.controller";

export type TResource = TListResourcesControllerOutput[number];
export type TResourceAction = TListResourceActionsControllerOutput[number];

export interface IResourcesTableProps {
  resources: TListResourcesControllerOutput | null;
  error: ZSAError | null;
}

export interface IResourceActionsTableProps {
  actions: TListResourceActionsControllerOutput | null;
  error: ZSAError | null;
}
