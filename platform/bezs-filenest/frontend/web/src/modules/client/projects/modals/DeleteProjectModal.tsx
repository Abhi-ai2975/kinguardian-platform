/**
 * DeleteProjectModal — confirmation dialog for permanently deleting a project.
 *
 * Opens when the project store's modalType === "deleteProject". Reads project
 * name and id from the store's projectData. Uses AlertDialog (destructive
 * pattern). Mounted once inside ProjectModalProvider — no props required.
 *
 * @module
 */
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import { useProjectStore } from "@/modules/client/projects/stores/project.store";
import { deleteProjectAction } from "@/modules/server/presentation/actions/project.actions";
import { handleZSAError } from "@/modules/client/shared/error/handle-zsa-error";

export function DeleteProjectModal() {
  const isOpen = useProjectStore((s) => s.isOpen);
  const modalType = useProjectStore((s) => s.modalType);
  const projectData = useProjectStore((s) => s.projectData);
  const onClose = useProjectStore((s) => s.onClose);
  const incrementTrigger = useProjectStore((s) => s.incrementTrigger);

  const open = isOpen && modalType === "deleteProject";

  const { execute, isPending } = useServerAction(deleteProjectAction, {
    onSuccess: () => {
      toast.success(`"${projectData?.name ?? "Project"}" deleted`);
      incrementTrigger();
      onClose();
    },
    onError: ({ err }) =>
      handleZSAError({ err, fallbackMessage: "Failed to delete project" }),
  });

  async function handleDelete() {
    if (!projectData?.id) return;
    await execute({
      payload: { projectId: projectData.id },
      transportOptions: { shouldRevalidate: true, url: "/projects" },
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete project</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to permanently delete{" "}
            <strong>{projectData?.name ?? "this project"}</strong>? All files,
            webhooks, and settings will be removed. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
