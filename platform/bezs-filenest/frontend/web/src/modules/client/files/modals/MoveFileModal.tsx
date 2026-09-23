/**
 * MoveFileModal — dialog for moving a file to a different folder.
 *
 * Opens when file store modalType === "moveFile". Uses FolderPickerPopover
 * to let the user select the target folder from the hierarchy.
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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FolderPickerPopover } from "@/modules/client/files/components/FolderPickerPopover";
import { useFileStore } from "@/modules/client/files/stores/file.store";
import { moveFileAction } from "@/modules/server/presentation/actions/file.actions";
import { handleZSAError } from "@/modules/client/shared/error/handle-zsa-error";
import type { TFolderList } from "@/modules/entities/schemas/folder";

interface MoveFileModalProps {
  folders: TFolderList;
}

export function MoveFileModal({ folders }: MoveFileModalProps) {
  const isOpen = useFileStore((s) => s.isOpen);
  const modalType = useFileStore((s) => s.modalType);
  const fileData = useFileStore((s) => s.fileData);
  const onClose = useFileStore((s) => s.onClose);
  const incrementTrigger = useFileStore((s) => s.incrementTrigger);

  const [folderId, setFolderId] = React.useState<string | null>(null);
  const open = isOpen && modalType === "moveFile";

  React.useEffect(() => {
    if (open) setFolderId(fileData?.folder_id ?? null);
  }, [open, fileData?.folder_id]);

  const { execute, isPending } = useServerAction(moveFileAction, {
    onSuccess: () => {
      toast.success("File moved");
      incrementTrigger();
      onClose();
    },
    onError: ({ err }) =>
      handleZSAError({ err, fallbackMessage: "Failed to move file" }),
  });

  async function handleMove() {
    if (!fileData?.id || !fileData?.project_id) return;
    await execute({
      payload: {
        projectId: fileData.project_id,
        fileId: fileData.id,
        folder_id: folderId,
      },
      transportOptions: {
        shouldRevalidate: true,
        url: `/projects/${fileData.project_id}/files`,
      },
    });
  }

  const unchanged = folderId === (fileData?.folder_id ?? null);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Move file</DialogTitle>
          <DialogDescription>
            Choose the destination folder for{" "}
            <strong className="font-medium">{fileData?.filename}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label className="text-sm">Destination folder</Label>
          <FolderPickerPopover
            folders={folders}
            value={folderId}
            onChange={setFolderId}
            disabled={isPending}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={unchanged || isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
