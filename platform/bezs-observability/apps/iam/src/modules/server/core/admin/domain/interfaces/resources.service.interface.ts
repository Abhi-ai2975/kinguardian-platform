import {
  TListResourcesResponseSchema,
  TResourceSchema,
  TCreateResourceValidationSchema,
  TUpdateResourceValidationSchema,
  TDeleteResourceValidationSchema,
  TListResourceActionsResponseSchema,
  TResourceActionSchema,
  TCreateResourceActionValidationSchema,
  TUpdateResourceActionValidationSchema,
  TDeleteResourceActionValidationSchema,
} from "@/modules/entities/schemas/admin/resources/resources.schema";

export interface IResourcesService {
  // Resource operations
  listResources(): Promise<TListResourcesResponseSchema>;
  createResource(
    payload: TCreateResourceValidationSchema,
  ): Promise<TResourceSchema>;
  updateResource(
    payload: TUpdateResourceValidationSchema,
  ): Promise<TResourceSchema>;
  deleteResource(
    payload: TDeleteResourceValidationSchema,
  ): Promise<{ success: boolean }>;

  // ResourceAction operations
  listResourceActions(
    resourceId?: string,
  ): Promise<TListResourceActionsResponseSchema>;
  createResourceAction(
    payload: TCreateResourceActionValidationSchema,
  ): Promise<TResourceActionSchema>;
  updateResourceAction(
    payload: TUpdateResourceActionValidationSchema,
  ): Promise<TResourceActionSchema>;
  deleteResourceAction(
    payload: TDeleteResourceActionValidationSchema,
  ): Promise<{ success: boolean }>;
}
