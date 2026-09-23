/**
 * projects/types/project.type — client-side TypeScript types for the projects feature.
 *
 * TProjectRow is the shape passed to TanStack Table column definitions.
 * IProjectsTableProps is the props contract for ProjectsTable.
 *
 * @module
 */
import type { TProject } from "@/modules/entities/schemas/project";

/** Row shape for the projects DataTable — identical to the API response type. */
export type TProjectRow = TProject;

export interface IProjectsTableProps {
  projects: TProjectRow[];
  error?: string | null;
}
