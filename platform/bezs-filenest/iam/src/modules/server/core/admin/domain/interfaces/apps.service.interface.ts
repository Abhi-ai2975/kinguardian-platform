import {
  TListAppsResponseSchema,
  TAppSchema,
  TCreateAppValidationSchema,
  TUpdateAppValidationSchema,
  TDeleteAppValidationSchema,
  TListMenuNodesResponseSchema,
  TMenuNodeSchema,
  TCreateMenuNodeValidationSchema,
  TUpdateMenuNodeValidationSchema,
  TDeleteMenuNodeValidationSchema,
  TReorderMenuNodeValidationSchema,
  TListActionsResponseSchema,
} from "@/modules/entities/schemas/admin/apps/apps.schema";

export interface IAppsService {
  // App operations
  listApps(): Promise<TListAppsResponseSchema>;
  createApp(payload: TCreateAppValidationSchema): Promise<TAppSchema>;
  updateApp(payload: TUpdateAppValidationSchema): Promise<TAppSchema>;
  deleteApp(payload: TDeleteAppValidationSchema): Promise<{ success: boolean }>;

  // MenuNode operations
  listMenuNodes(appId: string): Promise<TListMenuNodesResponseSchema>;
  createMenuNode(
    payload: TCreateMenuNodeValidationSchema,
  ): Promise<TMenuNodeSchema>;
  updateMenuNode(
    payload: TUpdateMenuNodeValidationSchema,
  ): Promise<TMenuNodeSchema>;
  deleteMenuNode(
    payload: TDeleteMenuNodeValidationSchema,
  ): Promise<{ success: boolean }>;
  reorderMenuNode(
    payload: TReorderMenuNodeValidationSchema,
  ): Promise<{ success: boolean }>;

  // ResourceAction operations (read-only — admin reference)
  listActions(): Promise<TListActionsResponseSchema>;
}
