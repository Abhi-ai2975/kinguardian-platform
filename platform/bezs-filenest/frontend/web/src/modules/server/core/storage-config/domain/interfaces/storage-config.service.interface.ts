/**
 * storage-config.service.interface — domain contract for storage config access.
 *
 * @module
 */
import type {
  TStorageConfig,
  TStorageVerifyResult,
  TUpdateStorageConfig,
} from "@/modules/entities/schemas/storage-config";

export interface IStorageConfigService {
  /**
   * Fetch the non-sensitive storage configuration for a project.
   * @throws ApiError on backend failure.
   */
  get(projectId: string): Promise<TStorageConfig>;

  /**
   * Save BYOB credentials for a project's storage configuration.
   * Sets status to pending_verification.
   * @throws ApiError on backend failure.
   */
  update(projectId: string, dto: Omit<TUpdateStorageConfig, "projectId">): Promise<TStorageConfig>;

  /**
   * Probe the project's storage provider (write + delete a test object).
   * @throws ApiError on backend failure.
   */
  verify(projectId: string): Promise<TStorageVerifyResult>;

  /**
   * Toggle server-side encryption for a MinIO or RustFS project.
   * Rejected with 422 for S3 / R2 / Azure / GCS (always-on encryption).
   * @throws ApiError on backend failure.
   */
  updateSse(projectId: string, sse_enabled: boolean): Promise<TStorageConfig>;
}
