/**
 * CreateApiKeyFlow — reusable two-step API key creation component.
 *
 * Step 1: CreateApiKeyForm — collects name + scopes.
 * Step 2: Reveal — shows the full key once with a copy button and warning.
 *
 * Has no Dialog/Card wrapper — renders bare content so it can be embedded
 * in a modal, an onboarding card, or any other container.
 *
 * Props:
 *   organizationId — IAM org that owns the key
 *   projectId      — project scope for the key
 *   onDone(key)    — called when the user clicks "Done" after copying the key
 *
 * @module
 */
"use client";

import * as React from "react";
import { Check, Copy, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CreateApiKeyForm } from "../forms/CreateApiKeyForm";
import type { TCreatedApiKey } from "@/modules/entities/schemas/api-key";

interface RevealStepProps {
  createdKey: TCreatedApiKey;
  onDone: () => void;
  doneLabel?: string;
}

function RevealStep({ createdKey, onDone, doneLabel = "Done" }: RevealStepProps) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    await navigator.clipboard.writeText(createdKey.key);
    setCopied(true);
    toast.success("API key copied");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Copy this key now — it won&apos;t be shown again.
        </p>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
          API Key
        </p>
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
          <code className="font-mono text-sm flex-1 break-all select-all">
            {createdKey.key}
          </code>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copy}>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Name: <strong className="text-foreground">{createdKey.name}</strong>
        &nbsp;·&nbsp;Prefix:{" "}
        <code className="font-mono">{createdKey.start}…</code>
      </p>

      <p className="text-xs text-muted-foreground">
        Store this as{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono">FILENEST_API_KEY</code>{" "}
        in your environment.
      </p>

      <Button className="w-full" onClick={onDone}>
        {doneLabel}
      </Button>
    </div>
  );
}

interface CreateApiKeyFlowProps {
  organizationId: string;
  projectId: string;
  /** Called when the key is created and the reveal step is shown. */
  onCreated?: (key: TCreatedApiKey) => void;
  /** Called when the user clicks Done on the reveal step. */
  onDone: (key: TCreatedApiKey) => void;
  doneLabel?: string;
}

export function CreateApiKeyFlow({
  organizationId,
  projectId,
  onCreated,
  onDone,
  doneLabel,
}: CreateApiKeyFlowProps) {
  const [createdKey, setCreatedKey] = React.useState<TCreatedApiKey | null>(null);

  function handleCreated(key: TCreatedApiKey) {
    setCreatedKey(key);
    onCreated?.(key);
  }

  if (createdKey) {
    return (
      <RevealStep
        createdKey={createdKey}
        onDone={() => onDone(createdKey)}
        doneLabel={doneLabel}
      />
    );
  }

  return (
    <CreateApiKeyForm
      organizationId={organizationId}
      projectId={projectId}
      onSuccess={handleCreated}
    />
  );
}
