/**
 * Project settings › Uploads — upload restriction configuration.
 *
 * Server component: loads current project config and passes the upload
 * restriction fields to ProjectUploadRestrictionsForm.
 *
 * @module
 */
import { getProjectConfigAction } from "@/modules/server/presentation/actions/project-config.actions";
import { ProjectUploadRestrictionsForm } from "@/modules/client/projects/forms/ProjectUploadRestrictionsForm";
import { ConfigUnavailable } from "@/modules/client/projects/components/settings/ConfigUnavailable";

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectSettingsUploadsPage({ params }: Props) {
  const { projectId } = await params;

  const [config, err] = await getProjectConfigAction({ payload: { projectId } });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Upload restrictions</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Control what files can be uploaded to this project.
        </p>
      </div>

      {err || !config ? (
        <ConfigUnavailable />
      ) : (
        <ProjectUploadRestrictionsForm projectId={projectId} config={config} />
      )}
    </div>
  );
}
