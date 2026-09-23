/**
 * CreateProjectModal — dialog wrapper for the create project flow.
 *
 * Opens when the project store's modalType === "createProject". Wraps
 * CreateProjectForm in a Dialog; on success closes the modal and increments
 * the store trigger so any parent table re-fetches.
 *
 * Mounted once inside ProjectModalProvider — no props required.
 *
 * @module
 */
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProjectStore } from "@/modules/client/projects/stores/project.store";
import { CreateProjectForm } from "@/modules/client/projects/forms/CreateProjectForm";
import type { TProject } from "@/modules/entities/schemas/project";

export function CreateProjectModal() {
  const isOpen = useProjectStore((s) => s.isOpen);
  const modalType = useProjectStore((s) => s.modalType);
  const onClose = useProjectStore((s) => s.onClose);
  const incrementTrigger = useProjectStore((s) => s.incrementTrigger);

  const open = isOpen && modalType === "createProject";

  function handleSuccess(_data: TProject) {
    incrementTrigger();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Create a project to start uploading and managing files.
          </DialogDescription>
        </DialogHeader>
        <CreateProjectForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
