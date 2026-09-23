/**
 * Project settings › Security — network security configuration.
 *
 * Server component: loads current project config and passes the security
 * fields to ProjectSecurityConfigForm.
 *
 * @module
 */
import { getProjectConfigAction } from "@/modules/server/presentation/actions/project-config.actions";
import { ProjectSecurityConfigForm } from "@/modules/client/projects/forms/ProjectSecurityConfigForm";
import { ConfigUnavailable } from "@/modules/client/projects/components/settings/ConfigUnavailable";

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectSettingsSecurityPage({ params }: Props) {
  const { projectId } = await params;

  const [config, err] = await getProjectConfigAction({ payload: { projectId } });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Security</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Restrict API access by IP address, configure CORS origins, and control
          how files are served.
        </p>
      </div>

      {err || !config ? (
        <ConfigUnavailable />
      ) : (
        <ProjectSecurityConfigForm projectId={projectId} config={config} />
      )}
    </div>
  );
}
