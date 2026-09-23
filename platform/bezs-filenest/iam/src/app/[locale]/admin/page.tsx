import { requireRole } from "@/modules/server/shared/auth/require-role";
import {
  getUsersAction,
  getAllSessionsAction,
  getOAuthClientsAction,
  listOrganizationsAction,
  listConsentsAction,
} from "@/modules/server/presentation/actions/admin";
import { StatCards } from "@/modules/client/admin/components/dashboard/StatCards";
import { LoginActivityChart } from "@/modules/client/admin/components/dashboard/charts/LoginActivityChart";
import { UserGrowthChart } from "@/modules/client/admin/components/dashboard/charts/UserGrowthChart";
import { OAuthUsageChart } from "@/modules/client/admin/components/dashboard/charts/OAuthUsageChart";
import { OrgDistributionChart } from "@/modules/client/admin/components/dashboard/charts/OrgDistributionChart";
import { RecentActivityTable } from "@/modules/client/admin/components/dashboard/RecentActivityTable";
import { UsersOverview } from "@/modules/client/admin/components/dashboard/UsersOverview";
import { OAuthClientsOverview } from "@/modules/client/admin/components/dashboard/OAuthClientsOverview";
import { OrgsOverview } from "@/modules/client/admin/components/dashboard/OrgsOverview";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

async function AdminPage() {
  await requireRole(["superadmin"]);

  const [users] = await getUsersAction();
  const [sessions] = await getAllSessionsAction();
  const [oauthClients] = await getOAuthClientsAction();
  const [organizations] = await listOrganizationsAction();
  const [consents] = await listConsentsAction();

  const userList = users ?? [];
  const sessionList = sessions ?? [];
  const clientList = oauthClients ?? [];
  const orgList = organizations ?? [];
  const consentList = consents ?? [];

  // LoginActivityChart — sessions per day for the last 7 days
  const now = new Date();
  const loginData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    const count = sessionList.filter((s) => {
      const sd = new Date(s.createdAt);
      return sd.toDateString() === d.toDateString();
    }).length;
    return { day: DAY_LABELS[d.getDay()], sessions: count };
  });

  // UserGrowthChart — cumulative users per month for the last 6 months
  const growthData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 0, 23, 59, 59, 999);
    const count = userList.filter((u) => new Date(u.createdAt) <= d).length;
    return { month: MONTH_LABELS[d.getMonth()], users: count };
  });

  // OAuthUsageChart — consent grants per client
  const consentCountMap = new Map<string, number>();
  for (const consent of consentList) {
    consentCountMap.set(consent.clientId, (consentCountMap.get(consent.clientId) ?? 0) + 1);
  }
  const oauthUsageData = clientList.map((c) => ({
    client: (c.client_name ?? c.client_id).slice(0, 12),
    consents: consentCountMap.get(c.client_id) ?? 0,
  }));

  // OrgDistributionChart — members per org
  const orgDistData = orgList.map((org) => ({
    name: org.slug,
    label: org.name,
    users: org.memberCount,
  }));

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          System overview — users, sessions, and access control at a glance.
        </p>
      </div>

      {/* Stat Cards */}
      <StatCards
        userCount={userList.length}
        sessionCount={sessionList.length}
        oauthClientCount={clientList.length}
        orgCount={orgList.length}
      />

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <LoginActivityChart data={loginData} />
        <UserGrowthChart data={growthData} />
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <OAuthUsageChart data={oauthUsageData} />
        <OrgDistributionChart data={orgDistData} />
      </div>

      {/* Activity + Overviews */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivityTable sessions={sessionList} />
        </div>
        <div className="flex flex-col gap-4">
          <UsersOverview users={userList} />
          <OAuthClientsOverview clients={clientList} />
          <OrgsOverview organizations={orgList} />
        </div>
      </div>
    </div>
  );
}

export default AdminPage;
