/**
 * DeleteFolderModal — confirmation dialog for deleting a folder.
 *
 * The backend rejects the request with 409 if the folder contains files or
 * subfolders. The modal warns the user of this constraint upfront.
 *
 * @module
 */
"use client";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
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
import { useFolderStore } from "@/modules/client/files/stores/folder.store";
import { deleteFolderAction } from "@/modules/server/presentation/actions/folder.actions";
import { handleZSAError } from "@/modules/client/shared/error/handle-zsa-error";

interface DeleteFolderModalProps {
  projectId: string;
}

export function DeleteFolderModal({ projectId }: DeleteFolderModalProps) {
  const isOpen = useFolderStore((s) => s.isOpen);
  const modalType = useFolderStore((s) => s.modalType);
  const folderData = useFolderStore((s) => s.folderData);
  const onClose = useFolderStore((s) => s.onClose);
  const incrementTrigger = useFolderStore((s) => s.incrementTrigger);

  const open = isOpen && modalType === "deleteFolder";

  const { execute, isPending } = useServerAction(deleteFolderAction, {
    onSuccess: () => {
      toast.success(`Folder "${folderData?.name ?? "Folder"}" deleted`);
      incrementTrigger();
      onClose();
    },
    onError: ({ err }) =>
      handleZSAError({ err, fallbackMessage: "Failed to delete folder. Make sure it is empty first." }),
  });

  async function handleDelete() {
    if (!folderData?.id) return;
    await execute({
      payload: { projectId, folderId: folderData.id },
      transportOptions: { shouldRevalidate: true, url: `/projects/${projectId}/files` },
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete folder</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{" "}
            <strong>{folderData?.name ?? "this folder"}</strong>?{" "}
            The folder must be empty (no files or subfolders) before it can be deleted.
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
