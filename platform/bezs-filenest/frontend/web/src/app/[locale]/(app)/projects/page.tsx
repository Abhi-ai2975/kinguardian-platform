/**
 * ProjectsPage — lists all projects in the active organisation.
 *
 * Server component: fetches page 1 via listProjectsAction and passes the full
 * TProjectList as initialData to ProjectsTable. The client table takes over
 * all subsequent pagination, sorting, and filtering via TanStack Query.
 *
 * @module
 */
import { listProjectsAction } from "@/modules/server/presentation/actions/project.actions";
import { ProjectsTable } from "@/modules/client/projects/components/table/ProjectsTable";
import { ProjectModalProvider } from "@/modules/client/projects/provider/ProjectModalProvider";

export default async function ProjectsPage() {
  const [data] = await listProjectsAction({
    payload: { page: 1, page_size: 20, sort_by: "created_at", sort_dir: "desc" },
  });

  const initialData = data ?? {
    items: [],
    total: 0,
    page: 1,
    page_size: 20,
    total_pages: 1,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {initialData.total} project{initialData.total !== 1 ? "s" : ""} in this organisation
        </p>
      </div>

      <ProjectsTable initialData={initialData} />

      <ProjectModalProvider />
    </div>
  );
}
