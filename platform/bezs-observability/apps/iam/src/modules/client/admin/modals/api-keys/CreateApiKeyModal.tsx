"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAdminStore } from "../../stores/admin.store";
import { ApiKeyForm } from "../../forms/api-keys/ApiKeyForm";
import { createApiKeyAction } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { TCreateApiKeyValidationSchema } from "@/modules/entities/schemas/admin/api-keys/api-keys.schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export function CreateApiKeyModal() {
  const { type, isOpen, data, onClose } = useAdminStore();
  const open = isOpen && type === "createApiKey";

  const [isLoading, setIsLoading] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleClose() {
    setCreatedKey(null);
    setCopied(false);
    onClose();
  }

  async function onSubmit(values: TCreateApiKeyValidationSchema) {
    setIsLoading(true);
    const [result, error] = await createApiKeyAction({
      payload: {
        ...values,
        userId: data?.apiKeyReferenceId ?? values.userId,
      },
      transportOptions: { shouldRevalidate: true, url: "/admin/api-keys" },
    });
    setIsLoading(false);

    if (error) {
      handleZSAError({ err: error });
      return;
    }

    if (result?.key) {
      setCreatedKey(result.key);
      toast.success("API key created");
    }
  }

  async function copyKey() {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {createdKey ? "API Key Created" : "Create API Key"}
          </DialogTitle>
        </DialogHeader>

        {createdKey ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Copy your API key now — it will not be shown again.
            </p>
            <div className="flex items-center gap-2 rounded-md border bg-muted p-3 font-mono text-sm break-all">
              <span className="flex-1">{createdKey}</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={copyKey}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="size-4 text-green-500" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        ) : (
          <ApiKeyForm
            onSubmit={onSubmit}
            onCancel={handleClose}
            isLoading={isLoading}
            submitLabel="Create API Key"
            defaultValues={{ userId: data?.apiKeyReferenceId ?? "" }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
