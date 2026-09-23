"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { useAdminStore } from "../../stores/admin.store";
import { useServerAction } from "zsa-react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreateHostFormSchema,
  TCreateHostFormSchema,
  TCreateHostResponseDtoSchema,
} from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { CreateHostForm } from "../../forms/agent-auth/CreateHostForm";
import { createHostAction } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

function CredentialRow({
  label,
  value,
  fieldKey,
  copied,
  onCopy,
  highlight = false,
}: {
  label: string;
  value: string;
  fieldKey: string;
  copied: string | null;
  onCopy: (key: string, text: string) => void;
  highlight?: boolean;
}) {
  const isCopied = copied === fieldKey;
  return (
    <div
      className={cn(
        "rounded-md border p-3",
        highlight ? "bg-amber-500/5 border-amber-500/30" : "bg-muted/40",
      )}
    >
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <code className="text-sm font-mono break-all">{value}</code>
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 h-7 w-7"
          onClick={() => onCopy(fieldKey, value)}
        >
          {isCopied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

export const CreateHostModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);

  const isModalOpen = isOpen && modalType === "createHost";

  const [createdHost, setCreatedHost] =
    useState<TCreateHostResponseDtoSchema | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const form = useForm<TCreateHostFormSchema>({
    resolver: zodResolver(CreateHostFormSchema),
    defaultValues: {
      name: "",
      default_capabilities: "",
      jwks_url: "",
    },
  });

  const { execute } = useServerAction(createHostAction, {
    onSuccess({ data }) {
      if (data) setCreatedHost(data);
    },
    onError({ err }) {
      handleZSAError<TCreateHostFormSchema>({
        err,
        form,
        fallbackMessage: "Failed to create host",
      });
    },
  });

  async function handleSubmit(values: TCreateHostFormSchema) {
    const default_capabilities = values.default_capabilities
      ? values.default_capabilities
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
      : [];

    await execute({
      payload: {
        name: values.name,
        default_capabilities,
        jwks_url: values.jwks_url || undefined,
      },
      transportOptions: { shouldRevalidate: true, url: "/admin/agent-auth" },
    });
  }

  function handleCopy(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  }

  function handleClose() {
    setCreatedHost(null);
    setCopied(null);
    form.reset();
    closeModal();
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent>
        {createdHost ? (
          <>
            <DialogHeader>
              <DialogTitle>Host Created</DialogTitle>
              <DialogDescription>
                Copy the Host ID and Enrollment Token now.{" "}
                <span className="text-destructive font-medium">
                  The enrollment token is shown only once.
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <CredentialRow
                label="Host ID"
                value={createdHost.hostId}
                fieldKey="hostId"
                copied={copied}
                onCopy={handleCopy}
              />
              {createdHost.enrollmentToken && (
                <CredentialRow
                  label="Enrollment Token (one-time)"
                  value={createdHost.enrollmentToken}
                  fieldKey="enrollmentToken"
                  copied={copied}
                  onCopy={handleCopy}
                  highlight
                />
              )}
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <p className="text-sm">{createdHost.status}</p>
              </div>
              {createdHost.default_capabilities.length > 0 && (
                <div className="rounded-md border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Default Capabilities
                  </p>
                  <p className="text-sm">
                    {createdHost.default_capabilities.join(", ")}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create Host</DialogTitle>
              <DialogDescription>
                A host represents a service or application that runs AI agents.
                It issues enrollment tokens used by agents to register.
              </DialogDescription>
            </DialogHeader>
            <FormProvider {...form}>
              <CreateHostForm
                onSubmit={handleSubmit}
                onCancel={handleClose}
              />
            </FormProvider>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
