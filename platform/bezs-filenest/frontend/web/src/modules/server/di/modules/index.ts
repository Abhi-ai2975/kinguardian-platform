/**
 * Barrel export for all DI module registration functions.
 * Import from here in container.ts to keep it tidy as new domains are added.
 */
export { registerDashboardModule } from "./dashboard/dashboard.module";
export { registerProjectModule } from "./project/project.module";
export { registerStorageConfigModule } from "./storage-config/storage-config.module";
export { registerProjectConfigModule } from "./project-config/project-config.module";
export { registerApiKeyModule } from "./api-key/api-key.module";
export { registerFileModule } from "./file/file.module";
export { registerWebhookModule } from "./webhook/webhook.module";
export { registerFolderModule } from "./folder/folder.module";
export { registerUsageModule } from "./usage/usage.module";
