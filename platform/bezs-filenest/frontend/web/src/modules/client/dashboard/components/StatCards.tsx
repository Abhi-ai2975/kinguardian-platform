/**
 * StatCards — four headline metric cards for the dashboard.
 *
 * Displays total files, storage used, files uploaded this month, and active
 * project count. Pure presentational — receives data as props from the RSC page.
 *
 * @module
 */
import { HardDrive, Files, Upload, FolderOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TDashboardStats } from "@/modules/entities/schemas/dashboard";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, description, icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

interface StatCardsProps {
  stats: TDashboardStats;
}

export function StatCards({ stats }: StatCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total files"
        value={stats.total_files.toLocaleString()}
        description="across all projects"
        icon={<Files className="h-4 w-4" />}
      />
      <StatCard
        title="Storage used"
        value={formatBytes(stats.total_storage_bytes)}
        description="total across all projects"
        icon={<HardDrive className="h-4 w-4" />}
      />
      <StatCard
        title="Uploads this month"
        value={stats.files_uploaded_30d.toLocaleString()}
        description="files uploaded in last 30 days"
        icon={<Upload className="h-4 w-4" />}
      />
      <StatCard
        title="Active projects"
        value={stats.active_projects.toLocaleString()}
        description="in this organisation"
        icon={<FolderOpen className="h-4 w-4" />}
      />
    </div>
  );
}
