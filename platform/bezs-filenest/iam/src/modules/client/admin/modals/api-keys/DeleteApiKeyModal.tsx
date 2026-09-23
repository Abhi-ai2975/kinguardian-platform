"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useAdminStore } from "../../stores/admin.store";
import { deleteApiKeyAction } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { toast } from "sonner";

export function DeleteApiKeyModal() {
  const { type, isOpen, data, onClose } = useAdminStore();
  const open = isOpen && type === "deleteApiKey";
  const [isLoading, setIsLoading] = useState(false);

  async function onConfirm() {
    if (!data?.apiKeyId) return;
    setIsLoading(true);
    const [, error] = await deleteApiKeyAction({
      payload: { keyId: data.apiKeyId },
      transportOptions: { shouldRevalidate: true, url: "/admin/api-keys" },
    });
    setIsLoading(false);

    if (error) {
      handleZSAError({ err: error });
      return;
    }

    toast.success("API key deleted");
    onClose();
  }

  const displayName =
    data?.apiKeyName ??
    (data?.apiKeyStart
      ? `${data.apiKeyPrefix ?? ""}${data.apiKeyStart}…`
      : "this key");

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete API Key</AlertDialogTitle>
          <AlertDialogDescription>
            Delete <strong>{displayName}</strong>? Any service using this key
            will immediately lose access. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
