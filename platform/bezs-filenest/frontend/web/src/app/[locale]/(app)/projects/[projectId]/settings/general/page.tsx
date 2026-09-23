/**
 * Project settings › General — update project name and description.
 *
 * Server component: fetches the current project and passes it to
 * UpdateProjectForm pre-filled with existing values.
 *
 * @module
 */
import { getProjectAction } from "@/modules/server/presentation/actions/project.actions";
import { UpdateProjectForm } from "@/modules/client/projects/forms/UpdateProjectForm";
import { ConfigUnavailable } from "@/modules/client/projects/components/settings/ConfigUnavailable";
import { ProjectIdCard } from "@/modules/client/projects/components/settings/ProjectIdCard";

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectSettingsGeneralPage({ params }: Props) {
  const { projectId } = await params;

  const [project, err] = await getProjectAction({ payload: { projectId } });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">General</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Update this project&apos;s name and description.
        </p>
      </div>

      {err || !project ? (
        <ConfigUnavailable />
      ) : (
        <>
          <UpdateProjectForm project={project} />
          <div className="pt-2">
            <ProjectIdCard projectId={project.id} />
          </div>
        </>
      )}
    </div>
  );
}
