/**
 * project-config.service.interface — domain contract for project configuration access.
 *
 * @module
 */
import type {
  TProjectConfig,
  TUpdateUploadConfig,
  TUpdateSecurityConfig,
  TUpdateProcessingConfig,
  TUpdateComplianceConfig,
} from "@/modules/entities/schemas/project-config";

export interface IProjectConfigService {
  get(projectId: string): Promise<TProjectConfig>;
  updateUpload(projectId: string, dto: Omit<TUpdateUploadConfig, "projectId">): Promise<TProjectConfig>;
  updateSecurity(projectId: string, dto: Omit<TUpdateSecurityConfig, "projectId">): Promise<TProjectConfig>;
  updateProcessing(projectId: string, dto: Omit<TUpdateProcessingConfig, "projectId">): Promise<TProjectConfig>;
  updateCompliance(projectId: string, dto: Omit<TUpdateComplianceConfig, "projectId">): Promise<TProjectConfig>;
}
