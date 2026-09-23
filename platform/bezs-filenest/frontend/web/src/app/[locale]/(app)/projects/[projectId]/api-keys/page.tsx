/**
 * Project API Keys page — lists and manages API keys scoped to this project.
 *
 * Server component: resolves the project and the current org, fetches the
 * initial key list (sorted newest-first) from the IAM, and passes all data
 * down to the client table.
 *
 * @module
 */
import { getServerSession } from "@/modules/server/auth/get-session";
import { getProjectAction } from "@/modules/server/presentation/actions/project.actions";
import { listApiKeysAction } from "@/modules/server/presentation/actions/api-key.actions";
import { ApiKeysTable } from "@/modules/client/api-keys/components/ApiKeysTable";
import { ApiKeyModalProvider } from "@/modules/client/api-keys/provider/ApiKeyModalProvider";

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectApiKeysPage({ params }: Props) {
  const { projectId } = await params;

  const session = await getServerSession();
  const organizationId = session?.session?.activeOrganizationId ?? "";

  const [[project], [keysData]] = await Promise.all([
    getProjectAction({ payload: { projectId } }),
    listApiKeysAction({
      payload: {
        organizationId,
        projectId,
        sortBy: "createdAt",
        sortDirection: "desc",
      },
    }),
  ]);

  const initialData = keysData ?? { apiKeys: [], total: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">API Keys</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {initialData.total} key{initialData.total !== 1 ? "s" : ""} in{" "}
          <strong className="text-foreground">{project?.name ?? projectId}</strong>.
          Each key carries explicit scopes that limit what it can do.
        </p>
      </div>

      <ApiKeysTable
        initialData={initialData}
        organizationId={organizationId}
        projectId={projectId}
      />

      <ApiKeyModalProvider organizationId={organizationId} projectId={projectId} />
    </div>
  );
}
