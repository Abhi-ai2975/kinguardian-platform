"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const APP_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : "https://your-watcher24-instance.com";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copy}>
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

export default function TestEventPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = React.useState("YOUR_API_KEY");
  const [sending, setSending] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    const stored = sessionStorage.getItem("w24_onboarding_key");
    if (stored) setApiKey(stored);
  }, []);

  const curlCommand = `curl -X POST ${APP_URL}/api/ingest \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"message":"Hello Watcher24!","severity":"info"}'`;

  async function sendTestEvent() {
    setSending(true);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Hello Watcher24!",
          severity: "info",
          source: "onboarding",
        }),
      });

      if (res.ok || res.status === 202) {
        setSuccess(true);
        // Clear onboarding key from session storage now that we're done.
        sessionStorage.removeItem("w24_onboarding_key");
      } else {
        toast.error("Test event failed — check your API key and try again");
      }
    } catch {
      toast.error("Could not reach the ingest endpoint");
    } finally {
      setSending(false);
    }
  }

  function goToDashboard() {
    sessionStorage.removeItem("w24_onboarding_key");
    router.push("/overview");
  }

  if (success) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <PartyPopper className="h-7 w-7 text-green-600 dark:text-green-400" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Your first event arrived!</h2>
            <p className="text-sm text-muted-foreground">
              Watcher24 is receiving events from your application. Head to the
              dashboard to explore your data.
            </p>
          </div>
          <Button className="w-full max-w-xs" onClick={goToDashboard}>
            Go to dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send a test event</CardTitle>
        <CardDescription>
          Verify that your setup is working by sending your first event.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Via curl
          </p>
          <div className="relative rounded-md border bg-muted/50">
            <div className="absolute right-2 top-2">
              <CopyButton text={curlCommand} />
            </div>
            <pre className="overflow-x-auto p-3 pr-10 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
              <code>{curlCommand}</code>
            </pre>
          </div>
        </div>

        <div className="relative flex items-center">
          <div className="flex-1 border-t" />
          <span className="mx-3 text-xs text-muted-foreground">or</span>
          <div className="flex-1 border-t" />
        </div>

        <Button
          className="w-full"
          variant="outline"
          onClick={sendTestEvent}
          disabled={sending || apiKey === "YOUR_API_KEY"}
        >
          {sending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            "Send test event from browser"
          )}
        </Button>

        <Button variant="ghost" className="w-full text-muted-foreground" onClick={goToDashboard}>
          Skip for now
        </Button>
      </CardContent>
    </Card>
  );
}
