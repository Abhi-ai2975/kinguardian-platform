/**
 * RevokeApiKeyModal — confirmation dialog for revoking an API key.
 *
 * Calls revokeApiKeyAction, increments the table trigger on success.
 *
 * @module
 */
"use client";

import { useServerAction } from "zsa-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { revokeApiKeyAction } from "@/modules/server/presentation/actions/api-key.actions";
import { handleZSAError } from "@/modules/client/shared/error/handle-zsa-error";
import { useApiKeyStore } from "../stores/api-key.store";

interface RevokeApiKeyModalProps {
  projectId: string;
}

export function RevokeApiKeyModal({ projectId }: RevokeApiKeyModalProps) {
  const { isOpen, modalType, keyData, onClose, incrementTrigger } = useApiKeyStore();

  const open = isOpen && modalType === "revokeApiKey";

  const { execute, isPending } = useServerAction(revokeApiKeyAction, {
    onSuccess: () => {
      toast.success("API key revoked");
      incrementTrigger();
      onClose();
    },
    onError: ({ err }) =>
      handleZSAError({ err, fallbackMessage: "Failed to revoke API key" }),
  });

  async function handleRevoke() {
    if (!keyData) return;
    await execute({
      payload: { keyId: keyData.id },
      transportOptions: { shouldRevalidate: true, url: `/projects/${projectId}/api-keys` },
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
          <AlertDialogDescription>
            The key{" "}
            <strong className="text-foreground font-mono">
              {keyData?.name ?? ""}
            </strong>{" "}
            ({keyData?.start}…) will be permanently revoked. Any application using it
            will lose access immediately.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={handleRevoke} disabled={isPending}>
            {isPending ? "Revoking…" : "Revoke key"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
