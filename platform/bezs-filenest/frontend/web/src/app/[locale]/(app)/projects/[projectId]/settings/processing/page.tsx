/**
 * Project settings › Processing — feature flag toggles (versioning, OCR, virus scan).
 *
 * Server component: loads current project config and passes processing flags
 * to ProjectProcessingConfigForm.
 *
 * @module
 */
import { getProjectConfigAction } from "@/modules/server/presentation/actions/project-config.actions";
import { ProjectProcessingConfigForm } from "@/modules/client/projects/forms/ProjectProcessingConfigForm";
import { ConfigUnavailable } from "@/modules/client/projects/components/settings/ConfigUnavailable";

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectSettingsProcessingPage({ params }: Props) {
  const { projectId } = await params;

  const [config, err] = await getProjectConfigAction({ payload: { projectId } });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Processing</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Enable or disable processing features for files uploaded to this project.
        </p>
      </div>

      {err || !config ? (
        <ConfigUnavailable />
      ) : (
        <ProjectProcessingConfigForm projectId={projectId} config={config} />
      )}
    </div>
  );
}
