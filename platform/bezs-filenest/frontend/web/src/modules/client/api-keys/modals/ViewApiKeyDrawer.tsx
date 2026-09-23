/**
 * ViewApiKeyDrawer — right-side sheet showing full API key details.
 *
 * Displays name, prefix, status, all scopes grouped by namespace,
 * and timestamps. Triggered from the API keys table "View" action.
 *
 * @module
 */
"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useApiKeyStore } from "../stores/api-key.store";

const SCOPE_GROUPS = [
  {
    label: "Files",
    scopes: ["files:upload", "files:download", "files:read", "files:delete", "files:metadata"],
  },
  {
    label: "Folders",
    scopes: ["folders:read", "folders:write"],
  },
  {
    label: "Upload Tokens",
    scopes: ["upload_tokens:create"],
  },
  {
    label: "Webhooks",
    scopes: ["webhooks:read", "webhooks:write"],
  },
  {
    label: "Projects",
    scopes: ["projects:read", "projects:update"],
  },
  {
    label: "Audit & Compliance",
    scopes: ["audit:read", "compliance:manage"],
  },
] as const;

function formatTs(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
      <span className="flex-1 font-mono text-xs text-foreground truncate">{value}</span>
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 h-6 w-6"
        onClick={copy}
      >
        {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
        <span className="sr-only">Copy</span>
      </Button>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      {children}
    </div>
  );
}

export function ViewApiKeyDrawer() {
  const { isOpen, modalType, keyData, onClose } = useApiKeyStore();

  const open = isOpen && modalType === "viewApiKey";
  const grantedScopes = new Set(keyData?.metadata?.scopes ?? []);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
        <SheetHeader className="border-b px-5 py-4">
          <div className="flex items-start justify-between gap-3 pr-7">
            <div className="flex flex-col gap-0.5 min-w-0">
              <SheetTitle className="truncate">{keyData?.name ?? "API Key"}</SheetTitle>
              <SheetDescription className="font-mono text-xs">
                {keyData?.start}…
              </SheetDescription>
            </div>
            <Badge
              variant={keyData?.enabled ? "default" : "secondary"}
              className="shrink-0 mt-0.5"
            >
              {keyData?.enabled ? "Active" : "Disabled"}
            </Badge>
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-5 py-5">
          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4">
            <DetailRow label="Created">
              <span className="text-sm">{formatTs(keyData?.createdAt)}</span>
            </DetailRow>
            <DetailRow label="Last used">
              <span className="text-sm">{formatTs(keyData?.lastUsedAt)}</span>
            </DetailRow>
            <DetailRow label="Expires">
              <span className="text-sm">{formatTs(keyData?.expiresAt)}</span>
            </DetailRow>
            <DetailRow label="Key ID">
              <span className="font-mono text-xs text-muted-foreground truncate">{keyData?.id}</span>
            </DetailRow>
          </div>

          <Separator />

          {/* Scopes */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Scopes ({grantedScopes.size})
            </span>

            {grantedScopes.size === 0 ? (
              <p className="text-sm text-muted-foreground">No scopes granted.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {SCOPE_GROUPS.map((group) => {
                  const granted = group.scopes.filter((s) => grantedScopes.has(s));
                  if (!granted.length) return null;
                  return (
                    <div key={group.label} className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-foreground">{group.label}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {granted.map((scope) => (
                          <Badge key={scope} variant="secondary" className="font-mono text-xs px-2 py-0.5">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* Metadata IDs */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Metadata
            </span>
            {keyData?.metadata?.projectId && (
              <DetailRow label="Project ID">
                <CopyField value={keyData.metadata.projectId} />
              </DetailRow>
            )}
            {keyData?.metadata?.organizationId && (
              <DetailRow label="Organization ID">
                <CopyField value={keyData.metadata.organizationId} />
              </DetailRow>
            )}
          </div>
        </div>

        {/* Footer action */}
        <div className="border-t px-5 py-4 mt-auto">
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={() => {
              onClose();
              setTimeout(() => {
                useApiKeyStore.getState().onOpen("revokeApiKey", keyData!);
              }, 150);
            }}
          >
            Revoke this key
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
