"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SDK = "typescript" | "python" | "go" | "rust";

const SDKS: { id: SDK; label: string; install: string; snippet: (key: string) => string }[] = [
  {
    id: "typescript",
    label: "TypeScript / JS",
    install: "npm install @watcher24/js-sdk",
    snippet: (key) => `import { Watcher24 } from "@watcher24/js-sdk";

const watcher = new Watcher24({ apiKey: "${key}" });

await watcher.log({
  message: "Hello from Watcher24",
  severity: "info",
});`,
  },
  {
    id: "python",
    label: "Python",
    install: "pip install watcher24",
    snippet: (key) => `from watcher24 import Watcher24

watcher = Watcher24(api_key="${key}")

watcher.log(
    message="Hello from Watcher24",
    severity="info",
)`,
  },
  {
    id: "go",
    label: "Go",
    install: "go get github.com/watcher24/go-sdk",
    snippet: (key) => `import "github.com/watcher24/go-sdk"

client := watcher24.New("${key}")

client.Log(ctx, watcher24.LogEntry{
    Message:  "Hello from Watcher24",
    Severity: "info",
})`,
  },
  {
    id: "rust",
    label: "Rust",
    install: 'watcher24 = "0.1"   # Cargo.toml',
    snippet: (key) => `use watcher24::Client;

let client = Client::new("${key}");

client.log("Hello from Watcher24", "info").await?;`,
  },
];

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

export default function InstallSdkPage() {
  const router = useRouter();
  const [selected, setSelected] = React.useState<SDK>("typescript");
  const [apiKey, setApiKey] = React.useState("YOUR_API_KEY");

  React.useEffect(() => {
    const stored = sessionStorage.getItem("w24_onboarding_key");
    if (stored) setApiKey(stored);
  }, []);

  const sdk = SDKS.find((s) => s.id === selected)!;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Install the SDK</CardTitle>
        <CardDescription>
          Choose your language and add Watcher24 to your project.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          {SDKS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(s.id)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                selected === s.id
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Install
            </p>
            <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/50 px-3 py-2">
              <code className="font-mono text-sm">{sdk.install}</code>
              <CopyButton text={sdk.install} />
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Usage
            </p>
            <div className="relative rounded-md border bg-muted/50">
              <div className="absolute right-2 top-2">
                <CopyButton text={sdk.snippet(apiKey)} />
              </div>
              <pre className="overflow-x-auto p-3 pr-10 font-mono text-sm leading-relaxed">
                <code>{sdk.snippet(apiKey)}</code>
              </pre>
            </div>
          </div>
        </div>

        <Button className="w-full" onClick={() => router.push("/onboarding/test-event")}>
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}
