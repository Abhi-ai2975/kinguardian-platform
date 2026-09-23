/**
 * CopyButton — copy-to-clipboard button for code blocks.
 *
 * Used inside the custom <pre> renderer in mdx-components.tsx.
 * Shows a Copy icon, switches to a Check icon for 2 seconds on success.
 *
 * @module
 */
"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      aria-label="Copy code"
      className={cn(
        "rounded p-1.5 transition-colors",
        "text-muted-foreground hover:text-foreground hover:bg-muted",
        className,
      )}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
