/**
 * Install-SDK onboarding step.
 *
 * Shows language-specific install + usage snippets pre-filled with both the
 * API key and the project ID stored in sessionStorage from the previous steps.
 * Completing this step redirects to the dashboard — onboarding is done.
 *
 * @module
 */

"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Copy, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SDK = "node" | "python";

const SDKS: {
  id: SDK;
  label: string;
  install: string;
  docsHref: string;
  snippet: (key: string, projectId: string) => string;
}[] = [
  {
    id: "node",
    label: "Node.js",
    install: "npm install @filenest/node",
    docsHref: "/docs/sdks/node",
    snippet: (key, projectId) => `import { FileNest } from "@filenest/node";

const fn = new FileNest({
  apiKey: "${key}",
  projectId: "${projectId}",
});

const file = await fn.files.upload({
  filename: "report.pdf",
  data: buffer,
  mimeType: "application/pdf",
});

console.log(file.id);`,
  },
  {
    id: "python",
    label: "Python",
    install: "pip install filenest",
    docsHref: "/docs/sdks/python",
    snippet: (key, projectId) => `from filenest import AsyncFileNest

async with AsyncFileNest(
    api_key="${key}",
    project_id="${projectId}",
) as fn:
    file = await fn.files.upload(
        filename="report.pdf",
        data=pdf_bytes,
        mime_type="application/pdf",
    )
    print(file.id)`,
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
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

export default function InstallSdkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = React.useState<SDK>("node");
  const [apiKey, setApiKey] = React.useState("YOUR_API_KEY");
  const [projectId, setProjectId] = React.useState(
    searchParams.get("projectId") ?? "YOUR_PROJECT_ID",
  );

  React.useEffect(() => {
    const storedKey = sessionStorage.getItem("fn_onboarding_key");
    const storedProjectId = sessionStorage.getItem("fn_onboarding_project_id");
    if (storedKey) setApiKey(storedKey);
    if (storedProjectId) setProjectId(storedProjectId);
  }, []);

  const sdk = SDKS.find((s) => s.id === selected)!;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Install the SDK</CardTitle>
        <CardDescription>
          Add FileNest to your project and make your first upload.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
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
                <CopyButton text={sdk.snippet(apiKey, projectId)} />
              </div>
              <pre className="overflow-x-auto p-3 pr-10 font-mono text-sm leading-relaxed">
                <code>{sdk.snippet(apiKey, projectId)}</code>
              </pre>
            </div>
          </div>

          <Link
            href={sdk.docsHref}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Read the {sdk.label} SDK docs
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <Button className="w-full" onClick={() => router.push("/dashboard")}>
          Go to dashboard
        </Button>
        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          asChild
        >
          <Link href="/docs">Browse the docs</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
