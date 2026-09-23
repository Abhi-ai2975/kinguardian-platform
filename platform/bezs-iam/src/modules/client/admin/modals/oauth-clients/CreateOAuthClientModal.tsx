"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAdminStore } from "../../stores/admin.store";
import { useServerAction } from "zsa-react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreateOAuthClientFormSchema,
  TCreateOAuthClientFormSchema,
  TCreateOAuthClientResponseDtoSchema,
} from "@/modules/entities/schemas/admin/oauthclient/oauthclient.schema";
import { OAuthClientCreateForm } from "../../forms/OAuthClientCreateForm";
import { createOAuthClientAction } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
        <span className="flex-1 font-mono text-sm break-all">{value}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

export const CreateOAuthClientModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);

  const isModalOpen = isOpen && modalType === "createOAuthClient";

  const [createdClient, setCreatedClient] =
    useState<TCreateOAuthClientResponseDtoSchema | null>(null);

  const form = useForm<TCreateOAuthClientFormSchema>({
    resolver: zodResolver(CreateOAuthClientFormSchema),
    defaultValues: {
      redirect_uris: [],
      post_logout_redirect_uris: undefined,
      scope: "openid profile email offline_access",
    },
    shouldUnregister: false,
  });

  const { execute } = useServerAction(createOAuthClientAction, {
    onSuccess({ data }) {
      if (data) setCreatedClient(data);
    },
    onError({ err }) {
      handleZSAError<TCreateOAuthClientFormSchema>({
        err,
        form,
        fallbackMessage: "Failed to create OAuth Client",
      });
    },
  });

  async function handleCreateOAuthClient(values: TCreateOAuthClientFormSchema) {
    const cleanedPostLogout = values.post_logout_redirect_uris
      ?.map((v) => v.trim())
      .filter(Boolean);

    await execute({
      payload: {
        ...values,
        post_logout_redirect_uris:
          cleanedPostLogout && cleanedPostLogout.length > 0
            ? cleanedPostLogout
            : undefined,
      },
      transportOptions: { shouldRevalidate: true, url: "/admin/oauth-clients" },
    });
  }

  function handleClose() {
    setCreatedClient(null);
    form.reset();
    closeModal();
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent>
        {createdClient ? (
          <>
            <DialogHeader>
              <DialogTitle>Client Created</DialogTitle>
              <DialogDescription>
                Copy your credentials now.{" "}
                <span className="font-medium text-destructive">
                  The client secret will not be shown again.
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <CopyField
                label="Client Name"
                value={createdClient.client_name ?? "—"}
              />
              <CopyField label="Client ID" value={createdClient.client_id} />
              {createdClient.client_secret && (
                <CopyField
                  label="Client Secret"
                  value={createdClient.client_secret}
                />
              )}
              {createdClient.redirect_uris?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Redirect URIs
                  </p>
                  <ul className="rounded-md border bg-muted px-3 py-2 space-y-1">
                    {createdClient.redirect_uris.map((uri) => (
                      <li key={uri} className="font-mono text-sm break-all">
                        {uri}
                      </li>
                    ))}
                  </ul>
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
              <DialogTitle>Add OAuth Client</DialogTitle>
              <DialogDescription>
                Fill in the app settings to register a new OAuth client.
              </DialogDescription>
            </DialogHeader>
            <FormProvider {...form}>
              <OAuthClientCreateForm
                onCancel={handleClose}
                onSubmit={handleCreateOAuthClient}
              />
            </FormProvider>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
