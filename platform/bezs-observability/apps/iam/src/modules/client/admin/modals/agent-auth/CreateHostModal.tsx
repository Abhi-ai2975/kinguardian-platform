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

export const CreateHostModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);

  const isModalOpen = isOpen && modalType === "createHost";

  const [createdHost, setCreatedHost] =
    useState<TCreateHostResponseDtoSchema | null>(null);
  const [copied, setCopied] = useState(false);

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

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    setCreatedHost(null);
    setCopied(false);
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
                Save the Host ID below. Use it to generate enrollment tokens for
                agents.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground mb-1">Host ID</p>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-sm font-mono break-all">
                    {createdHost.hostId}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="shrink-0 h-7 w-7"
                    onClick={() => handleCopy(createdHost.hostId)}
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
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
