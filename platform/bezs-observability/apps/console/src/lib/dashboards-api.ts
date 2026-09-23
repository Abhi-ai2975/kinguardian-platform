// dashboards-api.ts — typed client for the console's own /api/dashboards routes.
// Components import this instead of calling fetch directly.

export interface WidgetConfig {
  title?: string;
  metric?: string;
  eventType?: string;
  [key: string]: unknown;
}

export interface LayoutItem {
  i: string;          // stable widget UUID
  x: number;
  y: number;
  w: number;
  h: number;
  widgetType: WidgetType;
  widgetConfig: WidgetConfig;
}

export type WidgetType =
  | "area-chart"
  | "bar-chart"
  | "gauge"
  | "stat-card"
  | "world-map"
  | "log-feed"
  | "ai-token-usage"
  | "ai-cost-by-model"
  | "ai-latency-percentiles"
  | "ai-workflow-cost";

export interface Dashboard {
  id: string;
  orgId: string;
  userId: string;
  name: string;
  description: string | null;
  layout: LayoutItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export async function listDashboards(orgId: string): Promise<DashboardSummary[]> {
  const res = await fetch(`/api/dashboards?orgId=${encodeURIComponent(orgId)}`);
  if (!res.ok) throw new Error("Failed to load dashboards");
  const data = await res.json();
  return data.dashboards;
}

export async function getDashboard(id: string): Promise<Dashboard> {
  const res = await fetch(`/api/dashboards/${id}`);
  if (!res.ok) throw new Error("Dashboard not found");
  const data = await res.json();
  return data.dashboard;
}

export async function createDashboard(
  orgId: string,
  name: string,
  description?: string,
): Promise<Dashboard> {
  const res = await fetch("/api/dashboards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orgId, name, description }),
  });
  if (!res.ok) throw new Error("Failed to create dashboard");
  const data = await res.json();
  return data.dashboard;
}

export async function saveDashboardLayout(
  id: string,
  layout: LayoutItem[],
): Promise<void> {
  const res = await fetch(`/api/dashboards/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ layout }),
  });
  if (!res.ok) throw new Error("Failed to save dashboard");
}

export async function updateDashboardMeta(
  id: string,
  patch: { name?: string; description?: string },
): Promise<void> {
  const res = await fetch(`/api/dashboards/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Failed to update dashboard");
}

export async function deleteDashboard(id: string): Promise<void> {
  const res = await fetch(`/api/dashboards/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete dashboard");
}
