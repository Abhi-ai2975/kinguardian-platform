/**
 * Project settings root — redirects to /settings/storage.
 *
 * The settings layout now uses a sidebar with sub-routes. This redirect
 * ensures that /settings lands on the first tab rather than a blank page.
 *
 * @module
 */
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectSettingsPage({ params }: Props) {
  const { projectId } = await params;
  redirect(`/projects/${projectId}/settings/general`);
}
