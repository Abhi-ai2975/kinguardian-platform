/**
 * ProjectIdCard — displays the project ID with a copy button.
 *
 * Used on the settings general page so developers can easily grab the
 * project ID needed for SDK configuration.
 *
 * @module
 */
"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProjectIdCardProps {
  projectId: string;
}

export function ProjectIdCard({ projectId }: ProjectIdCardProps) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(projectId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-4 flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">Project ID</span>
        <span className="text-xs text-muted-foreground">
          Use this in your SDK configuration as <code className="font-mono">projectId</code>.
        </span>
      </div>
      <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
        <span className="flex-1 font-mono text-sm text-foreground select-all">{projectId}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn("shrink-0 h-7 w-7 transition-colors", copied && "text-green-600")}
          onClick={copy}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="sr-only">Copy project ID</span>
        </Button>
      </div>
    </div>
  );
}
