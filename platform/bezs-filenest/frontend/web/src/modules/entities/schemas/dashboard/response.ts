/**
 * entities/schemas/dashboard/response — Zod response schemas for the dashboard domain.
 *
 * Mirrors DashboardResponse from the FastAPI backend. All four data groups
 * (stats, time-series charts, status donut, recent files) arrive in one call.
 *
 * @module
 */
import { z } from "zod";

export const DashboardStatsSchema = z.object({
  total_files: z.number().int(),
  total_storage_bytes: z.number().int(),
  files_uploaded_30d: z.number().int(),
  active_projects: z.number().int(),
});
export type TDashboardStats = z.infer<typeof DashboardStatsSchema>;

export const UploadsByDaySchema = z.object({
  date: z.string(),
  count: z.number().int(),
});
export type TUploadsByDay = z.infer<typeof UploadsByDaySchema>;

export const StorageByDaySchema = z.object({
  date: z.string(),
  bytes: z.number().int(),
});
export type TStorageByDay = z.infer<typeof StorageByDaySchema>;

export const StatusCountSchema = z.object({
  status: z.string(),
  count: z.number().int(),
});
export type TStatusCount = z.infer<typeof StatusCountSchema>;

export const RecentFileSchema = z.object({
  id: z.string(),
  filename: z.string(),
  project_id: z.string(),
  project_name: z.string(),
  status: z.string(),
  size_bytes: z.number().int(),
  created_at: z.string(),
});
export type TRecentFile = z.infer<typeof RecentFileSchema>;

export const DashboardResponseSchema = z.object({
  stats: DashboardStatsSchema,
  uploads_by_day: z.array(UploadsByDaySchema),
  storage_by_day: z.array(StorageByDaySchema),
  status_distribution: z.array(StatusCountSchema),
  recent_files: z.array(RecentFileSchema),
});
export type TDashboardResponse = z.infer<typeof DashboardResponseSchema>;
