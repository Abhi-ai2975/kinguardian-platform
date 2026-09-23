/**
 * ProjectModalProvider — mounts all project modals once, client-only.
 *
 * The mount guard (isMounted) ensures modals are never rendered during SSR —
 * the Zustand store relies on browser APIs and must not hydrate on the server.
 *
 * Usage: render <ProjectModalProvider /> once inside the projects layout or page
 * that hosts the projects table. Modals are controlled entirely by the project
 * store; no props are needed here or in the modal components.
 *
 * @module
 */
"use client";

import { useEffect, useState } from "react";
import { CreateProjectModal } from "@/modules/client/projects/modals/CreateProjectModal";
import { DeleteProjectModal } from "@/modules/client/projects/modals/DeleteProjectModal";

export function ProjectModalProvider() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <>
      <CreateProjectModal />
      <DeleteProjectModal />
    </>
  );
}
