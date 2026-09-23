/**
 * CreateWebhookForm — create or edit a webhook endpoint.
 *
 * When webhookData is provided the form runs in edit mode (PUT), otherwise
 * it creates a new webhook (POST). On successful creation the response
 * includes signing_secret (shown once in a callout). On success calls
 * onSuccess so the parent modal can close and increment the trigger.
 *
 * @module
 */
"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useServerAction } from "zsa-react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  createWebhookAction,
  updateWebhookAction,
} from "@/modules/server/presentation/actions/webhook.actions";
import {
  CreateWebhookFormSchema,
  WEBHOOK_EVENTS,
  type TCreateWebhookForm,
  type TWebhook,
} from "@/modules/entities/schemas/webhook";
import { handleZSAError } from "@/modules/client/shared/error/handle-zsa-error";

interface CreateWebhookFormProps {
  projectId: string;
  webhookData?: TWebhook | null;
  onSuccess: () => void;
}

export function CreateWebhookForm({
  projectId,
  webhookData,
  onSuccess,
}: CreateWebhookFormProps) {
  const isEdit = !!webhookData;
  const [signingSecret, setSigningSecret] = React.useState<string | null>(null);

  const form = useForm<TCreateWebhookForm>({
    resolver: zodResolver(CreateWebhookFormSchema),
    defaultValues: {
      url: webhookData?.url ?? "",
      events: webhookData?.events ?? [],
      is_active: webhookData?.is_active ?? true,
    },
  });

  const { execute: execCreate, isPending: isCreating } = useServerAction(
    createWebhookAction,
    {
      onSuccess: ({ data }) => {
        if (data.signing_secret) setSigningSecret(data.signing_secret);
        toast.success("Webhook created");
        onSuccess();
      },
      onError: ({ err }) =>
        handleZSAError({ err, form, fallbackMessage: "Failed to create webhook" }),
    },
  );

  const { execute: execUpdate, isPending: isUpdating } = useServerAction(
    updateWebhookAction,
    {
      onSuccess: () => {
        toast.success("Webhook updated");
        onSuccess();
      },
      onError: ({ err }) =>
        handleZSAError({ err, form, fallbackMessage: "Failed to update webhook" }),
    },
  );

  const isPending = isCreating || isUpdating;

  async function onSubmit(values: TCreateWebhookForm) {
    if (isEdit && webhookData) {
      await execUpdate({
        payload: {
          projectId,
          webhookId: webhookData.id,
          ...values,
        },
        transportOptions: {
          shouldRevalidate: true,
          url: `/projects/${projectId}/webhooks`,
        },
      });
    } else {
      await execCreate({
        payload: { projectId, ...values },
        transportOptions: {
          shouldRevalidate: true,
          url: `/projects/${projectId}/webhooks`,
        },
      });
    }
  }

  function copySecret() {
    if (signingSecret) {
      void navigator.clipboard.writeText(signingSecret);
      toast.success("Signing secret copied");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      {signingSecret && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertDescription className="space-y-2">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Save this signing secret — it will not be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-background border rounded px-2 py-1 break-all">
                {signingSecret}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={copySecret}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <FieldGroup>
        <Controller
          name="url"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Endpoint URL</FieldLabel>
              <FieldDescription>
                FileNest will POST signed JSON payloads to this URL.
              </FieldDescription>
              <Input
                {...field}
                id={field.name}
                placeholder="https://example.com/webhooks/filenest"
                autoFocus
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        <Controller
          name="events"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Events</FieldLabel>
              <FieldDescription>
                Leave all unchecked to receive every event type.
              </FieldDescription>
              <div className="space-y-2 pt-1">
                {WEBHOOK_EVENTS.map((event) => (
                  <label
                    key={event}
                    className="flex items-center gap-2.5 cursor-pointer select-none"
                  >
                    <Checkbox
                      checked={field.value.includes(event)}
                      onCheckedChange={(checked) => {
                        field.onChange(
                          checked
                            ? [...field.value, event]
                            : field.value.filter((e) => e !== event),
                        );
                      }}
                    />
                    <span className="font-mono text-sm">{event}</span>
                  </label>
                ))}
              </div>
              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        <Controller
          name="is_active"
          control={form.control}
          render={({ field }) => (
            <Field>
              <div className="flex items-center justify-between">
                <div>
                  <FieldLabel htmlFor="is_active">Active</FieldLabel>
                  <FieldDescription>
                    Inactive webhooks receive no deliveries.
                  </FieldDescription>
                </div>
                <Switch
                  id="is_active"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            </Field>
          )}
        />
      </FieldGroup>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending
          ? isEdit
            ? "Saving…"
            : "Creating…"
          : isEdit
            ? "Save changes"
            : "Create webhook"}
      </Button>
    </form>
  );
}
