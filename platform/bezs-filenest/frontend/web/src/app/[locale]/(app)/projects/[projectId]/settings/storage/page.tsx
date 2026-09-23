/**
 * Project settings › Storage — BYOB storage credentials, connection status, and encryption.
 *
 * Server component: loads current storage config via server action. Passes
 * it to StorageConfigForm (credentials/probe) and StorageEncryptionForm (SSE toggle).
 *
 * Managed-mode projects see an info banner (no credentials to configure) but still
 * have access to the encryption toggle if their provider is MinIO or RustFS.
 *
 * @module
 */
import { getStorageConfigAction } from "@/modules/server/presentation/actions/storage-config.actions";
import { StorageConfigForm } from "@/modules/client/projects/forms/StorageConfigForm";
import { StorageEncryptionForm } from "@/modules/client/projects/forms/StorageEncryptionForm";
import { ConfigUnavailable } from "@/modules/client/projects/components/settings/ConfigUnavailable";

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectSettingsStoragePage({ params }: Props) {
  const { projectId } = await params;

  const [config, err] = await getStorageConfigAction({ payload: { projectId } });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Storage</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure where this project&apos;s files are stored.
        </p>
      </div>

      {err || !config ? (
        <ConfigUnavailable />
      ) : (
        <>
          <StorageConfigForm projectId={projectId} config={config} />
          <div className="border-t pt-6">
            <StorageEncryptionForm projectId={projectId} config={config} />
          </div>
        </>
      )}
    </div>
  );
}
