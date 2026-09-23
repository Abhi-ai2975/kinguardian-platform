"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Check, Copy, Loader2 } from "lucide-react";
import { useAdminStore } from "../../stores/admin.store";
import { useServerAction } from "zsa-react";
import { rotateClientSecretAction } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { useState } from "react";

export const RotateSecretModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "rotateClientSecret";

  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { execute, isPending } = useServerAction(rotateClientSecretAction, {
    onSuccess({ data }) {
      setNewSecret(data?.client_secret ?? null);
      toast.success("Client secret rotated successfully.");
    },
    onError({ err }) {
      handleZSAError({ err, fallbackMessage: "Failed to rotate client secret" });
    },
  });

  async function handleRotate() {
    if (!modalData?.clientId) return;
    await execute({ payload: { client_id: modalData.clientId } });
  }

  function handleCopy() {
    if (!newSecret) return;
    navigator.clipboard.writeText(newSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    setNewSecret(null);
    setCopied(false);
    closeModal();
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rotate Client Secret</DialogTitle>
          <DialogDescription>
            {newSecret
              ? "Your new client secret is shown below. Copy it now — it will not be shown again."
              : `This will invalidate the current secret for ${modalData?.clientName ?? "this client"}. All integrations using the old secret will stop working immediately.`}
          </DialogDescription>
        </DialogHeader>

        {newSecret && (
          <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 font-mono text-sm">
            <span className="flex-1 break-all">{newSecret}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        <DialogFooter>
          {newSecret ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button onClick={handleRotate} disabled={isPending}>
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Rotate Secret
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
