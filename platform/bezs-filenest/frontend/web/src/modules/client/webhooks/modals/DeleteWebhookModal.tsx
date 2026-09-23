/**
 * DeleteWebhookModal — confirmation dialog for permanently deleting a webhook.
 *
 * Opens when the webhook store's modalType === "deleteWebhook".
 * Mounted once inside WebhookModalProvider — no props required.
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
import { useWebhookStore } from "@/modules/client/webhooks/stores/webhook.store";
import { deleteWebhookAction } from "@/modules/server/presentation/actions/webhook.actions";
import { handleZSAError } from "@/modules/client/shared/error/handle-zsa-error";

interface DeleteWebhookModalProps {
  projectId: string;
}

export function DeleteWebhookModal({ projectId }: DeleteWebhookModalProps) {
  const isOpen = useWebhookStore((s) => s.isOpen);
  const modalType = useWebhookStore((s) => s.modalType);
  const webhookData = useWebhookStore((s) => s.webhookData);
  const onClose = useWebhookStore((s) => s.onClose);
  const incrementTrigger = useWebhookStore((s) => s.incrementTrigger);

  const open = isOpen && modalType === "deleteWebhook";

  const { execute, isPending } = useServerAction(deleteWebhookAction, {
    onSuccess: () => {
      toast.success("Webhook deleted");
      incrementTrigger();
      onClose();
    },
    onError: ({ err }) =>
      handleZSAError({ err, fallbackMessage: "Failed to delete webhook" }),
  });

  async function handleDelete() {
    if (!webhookData?.id) return;
    await execute({
      payload: { projectId, webhookId: webhookData.id },
      transportOptions: {
        shouldRevalidate: true,
        url: `/projects/${projectId}/webhooks`,
      },
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete webhook</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to permanently delete the endpoint{" "}
            <strong className="break-all font-mono text-xs">
              {webhookData?.url ?? "this webhook"}
            </strong>
            ? FileNest will stop delivering events to it immediately. This
            action cannot be undone.
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
