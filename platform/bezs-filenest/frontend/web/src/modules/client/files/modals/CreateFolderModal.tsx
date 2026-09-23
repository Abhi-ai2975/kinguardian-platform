/**
 * CreateFolderModal — dialog for creating a new folder or subfolder.
 *
 * Opens when folder store modalType === "createFolder". When folderData is set,
 * the new folder is created as a child of that folder (subfolder). When null,
 * the folder is created at root level.
 *
 * @module
 */
"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useFolderStore } from "@/modules/client/files/stores/folder.store";
import { createFolderAction } from "@/modules/server/presentation/actions/folder.actions";
import { handleZSAError } from "@/modules/client/shared/error/handle-zsa-error";

interface CreateFolderModalProps {
  projectId: string;
}

export function CreateFolderModal({ projectId }: CreateFolderModalProps) {
  const isOpen = useFolderStore((s) => s.isOpen);
  const modalType = useFolderStore((s) => s.modalType);
  const folderData = useFolderStore((s) => s.folderData);
  const onClose = useFolderStore((s) => s.onClose);
  const incrementTrigger = useFolderStore((s) => s.incrementTrigger);

  const [name, setName] = React.useState("");
  const open = isOpen && modalType === "createFolder";

  React.useEffect(() => {
    if (open) setName("");
  }, [open]);

  const { execute, isPending } = useServerAction(createFolderAction, {
    onSuccess: ({ data }) => {
      toast.success(`Folder "${data?.name ?? "Folder"}" created`);
      incrementTrigger();
      onClose();
    },
    onError: ({ err }) =>
      handleZSAError({ err, fallbackMessage: "Failed to create folder" }),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await execute({
      payload: {
        projectId,
        name: name.trim(),
        parent_folder_id: folderData?.id ?? null,
      },
      transportOptions: { shouldRevalidate: true, url: `/projects/${projectId}/files` },
    });
  }

  const parentLabel = folderData ? `Inside "${folderData.name}"` : "At root level";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
          <DialogDescription>{parentLabel}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="folder-name" className="text-sm">
              Folder name
            </Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Medical Reports"
              autoFocus
              disabled={isPending}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
