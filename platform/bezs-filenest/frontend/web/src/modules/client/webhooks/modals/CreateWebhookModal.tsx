/**
 * CreateWebhookModal — dialog for creating or editing a webhook.
 *
 * Opens for modalType "createWebhook". When webhookData is set the form
 * runs in edit mode; otherwise it creates a new webhook.
 *
 * @module
 */
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useWebhookStore } from "@/modules/client/webhooks/stores/webhook.store";
import { CreateWebhookForm } from "../forms/CreateWebhookForm";

interface CreateWebhookModalProps {
  projectId: string;
}

export function CreateWebhookModal({ projectId }: CreateWebhookModalProps) {
  const isOpen = useWebhookStore((s) => s.isOpen);
  const modalType = useWebhookStore((s) => s.modalType);
  const webhookData = useWebhookStore((s) => s.webhookData);
  const onClose = useWebhookStore((s) => s.onClose);
  const incrementTrigger = useWebhookStore((s) => s.incrementTrigger);

  const open = isOpen && modalType === "createWebhook";
  const isEdit = !!webhookData;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit webhook" : "Add webhook"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the endpoint URL, event subscriptions, or active status."
              : "Configure an HTTPS endpoint to receive signed FileNest event payloads."}
          </DialogDescription>
        </DialogHeader>
        <CreateWebhookForm
          projectId={projectId}
          webhookData={webhookData}
          onSuccess={() => {
            incrementTrigger();
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
