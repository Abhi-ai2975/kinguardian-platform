/**
 * DeleteFileModal — confirmation dialog for deleting a file.
 *
 * Opens when the file store's modalType === "deleteFile". Reads file data
 * from the store. Mounted once inside FileModalProvider — no props required.
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
import { useFileStore } from "@/modules/client/files/stores/file.store";
import { deleteFileAction } from "@/modules/server/presentation/actions/file.actions";
import { handleZSAError } from "@/modules/client/shared/error/handle-zsa-error";

export function DeleteFileModal() {
  const isOpen = useFileStore((s) => s.isOpen);
  const modalType = useFileStore((s) => s.modalType);
  const fileData = useFileStore((s) => s.fileData);
  const onClose = useFileStore((s) => s.onClose);
  const incrementTrigger = useFileStore((s) => s.incrementTrigger);

  const open = isOpen && modalType === "deleteFile";

  const { execute, isPending } = useServerAction(deleteFileAction, {
    onSuccess: () => {
      toast.success(`"${fileData?.filename ?? "File"}" deleted`);
      incrementTrigger();
      onClose();
    },
    onError: ({ err }) =>
      handleZSAError({ err, fallbackMessage: "Failed to delete file" }),
  });

  async function handleDelete() {
    if (!fileData?.id || !fileData?.project_id) return;
    await execute({
      payload: { projectId: fileData.project_id, fileId: fileData.id },
      transportOptions: {
        shouldRevalidate: true,
        url: `/projects/${fileData.project_id}/files`,
      },
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete file</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to permanently delete{" "}
            <strong>{fileData?.filename ?? "this file"}</strong>? The stored
            bytes will be removed from storage. This action cannot be undone.
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
