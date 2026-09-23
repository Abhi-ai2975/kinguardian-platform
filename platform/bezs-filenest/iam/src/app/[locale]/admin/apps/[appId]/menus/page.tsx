import MenuNodesTable from "@/modules/client/admin/components/apps/MenuNodesTable";
import {
  listAppsAction,
  listMenuNodesAction,
} from "@/modules/server/presentation/actions/admin";
import { requireRole } from "@/modules/server/shared/auth/require-role";
import { notFound } from "next/navigation";

interface MenusPageProps {
  params: Promise<{ appId: string }>;
}

async function MenusPage({ params }: MenusPageProps) {
  await requireRole(["superadmin"]);

  const { appId } = await params;

  const [apps] = await listAppsAction();
  const app = apps?.find((a) => a.id === appId);
  if (!app) notFound();

  const [nodes, error] = await listMenuNodesAction({ appId });

  return (
    <div className="space-y-8 w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{app.name} — Menu Nodes</h1>
        <p className="text-sm">
          Manage navigation menu nodes for this application.
        </p>
      </div>
      <MenuNodesTable
        nodes={nodes ?? null}
        appId={appId}
        appName={app.name}
        error={error ?? null}
      />
    </div>
  );
}

export default MenusPage;
