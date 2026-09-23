"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GetApiKeyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId") ?? "";

  const [apiKey, setApiKey] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);   // drives the checkmark icon (resets after 2s)
  const [hasCopied, setHasCopied] = React.useState(false); // latches true once, never resets
  const [loading, setLoading] = React.useState(false);
  const [generated, setGenerated] = React.useState(false);

  async function generateKey() {
    setLoading(true);

    const { data, error } = await authClient.apiKey.create({
      name: "Default",
      organizationId: orgId || undefined,
    });

    if (error || !data) {
      toast.error(error?.message ?? "Failed to generate API key");
      setLoading(false);
      return;
    }

    const rawKey = (data as { key: string }).key;
    setApiKey(rawKey);
    setGenerated(true);
    // Store temporarily for SDK code examples on the next steps.
    sessionStorage.setItem("w24_onboarding_key", rawKey);
    setLoading(false);
  }

  async function copyKey() {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setHasCopied(true);
    toast.success("API key copied");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleContinue() {
    if (!apiKey) return;
    router.push("/onboarding/install-sdk");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your API key</CardTitle>
        <CardDescription>
          This key authenticates your application with Watcher24. It will only
          be shown once — copy it now and store it securely.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!generated ? (
          <Button
            onClick={generateKey}
            disabled={loading}
            className="w-full"
          >
            <KeyRound className="mr-2 h-4 w-4" />
            {loading ? "Generating…" : "Generate API key"}
          </Button>
        ) : (
          <>
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3">
              <code className="flex-1 break-all font-mono text-sm select-all">
                {apiKey}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={copyKey}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Store this key in your environment variables as{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">
                WATCHER24_API_KEY
              </code>
              . You can create additional keys in Settings → API Keys.
            </p>
            <Button
              className="w-full"
              onClick={handleContinue}
              disabled={!hasCopied}
            >
              {hasCopied ? "Continue to install SDK" : "Copy your key to continue"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
