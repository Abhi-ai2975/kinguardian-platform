/**
 * Project settings › Compliance — retention, WORM, legal hold, data residency.
 *
 * Server component: loads current project config and passes compliance fields
 * to ProjectComplianceConfigForm. Settings are stored now but not enforced
 * until Phase 8.
 *
 * @module
 */
import { getProjectConfigAction } from "@/modules/server/presentation/actions/project-config.actions";
import { ProjectComplianceConfigForm } from "@/modules/client/projects/forms/ProjectComplianceConfigForm";
import { ConfigUnavailable } from "@/modules/client/projects/components/settings/ConfigUnavailable";

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectSettingsCompliancePage({ params }: Props) {
  const { projectId } = await params;

  const [config, err] = await getProjectConfigAction({ payload: { projectId } });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Compliance</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure retention periods, WORM policies, legal hold, and data
          residency requirements.
        </p>
      </div>

      {err || !config ? (
        <ConfigUnavailable />
      ) : (
        <ProjectComplianceConfigForm projectId={projectId} config={config} />
      )}
    </div>
  );
}
