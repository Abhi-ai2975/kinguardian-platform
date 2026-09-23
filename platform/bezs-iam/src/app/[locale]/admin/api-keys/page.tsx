import { requireRole } from "@/modules/server/shared/auth/require-role";
import { listApiKeysAction } from "@/modules/server/presentation/actions/admin";
import { ApiKeysTable } from "@/modules/client/admin/components/api-keys/ApiKeysTable";

export default async function ApiKeysPage() {
  const session = await requireRole(["superadmin"]);

  const [result, error] = await listApiKeysAction({});

  return (
    <div className="space-y-8 w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">API Keys</h1>
        <p className="text-sm text-muted-foreground">
          Manage API keys for programmatic access to this system.
        </p>
      </div>
      <ApiKeysTable
        apiKeys={result?.apiKeys ?? null}
        total={result?.total ?? 0}
        error={error ? "Failed to load API keys" : null}
        currentUserId={session!.user.id}
      />
    </div>
  );
}
