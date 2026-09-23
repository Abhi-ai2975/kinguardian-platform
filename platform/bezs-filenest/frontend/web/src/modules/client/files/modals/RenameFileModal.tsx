/**
 * RenameFileModal — dialog for renaming a file's display filename.
 *
 * Opens when file store modalType === "renameFile". Pre-fills the input
 * with the current filename so the user can edit in place.
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
import { useFileStore } from "@/modules/client/files/stores/file.store";
import { renameFileAction } from "@/modules/server/presentation/actions/file.actions";
import { handleZSAError } from "@/modules/client/shared/error/handle-zsa-error";

export function RenameFileModal() {
  const isOpen = useFileStore((s) => s.isOpen);
  const modalType = useFileStore((s) => s.modalType);
  const fileData = useFileStore((s) => s.fileData);
  const onClose = useFileStore((s) => s.onClose);
  const incrementTrigger = useFileStore((s) => s.incrementTrigger);

  const [filename, setFilename] = React.useState("");
  const open = isOpen && modalType === "renameFile";

  React.useEffect(() => {
    if (open) setFilename(fileData?.filename ?? "");
  }, [open, fileData?.filename]);

  const { execute, isPending } = useServerAction(renameFileAction, {
    onSuccess: () => {
      toast.success("File renamed");
      incrementTrigger();
      onClose();
    },
    onError: ({ err }) =>
      handleZSAError({ err, fallbackMessage: "Failed to rename file" }),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fileData?.id || !fileData?.project_id || !filename.trim()) return;
    await execute({
      payload: {
        projectId: fileData.project_id,
        fileId: fileData.id,
        filename: filename.trim(),
      },
      transportOptions: {
        shouldRevalidate: true,
        url: `/projects/${fileData.project_id}/files`,
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename file</DialogTitle>
          <DialogDescription>Enter a new display name for this file.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rename-file" className="text-sm">
              Filename
            </Label>
            <Input
              id="rename-file"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              autoFocus
              disabled={isPending}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!filename.trim() || filename === fileData?.filename || isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
