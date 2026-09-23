"use client";
// DocActions — per-page action bar shown at the top right of every doc.
// Two actions:
//   1. Copy MD    — copies the raw markdown source to clipboard
//   2. Open in    — dropdown that opens the page in an AI assistant
//                   with the markdown content pre-loaded as context
import { useState } from "react";
import { Check, Copy, ChevronDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  rawMarkdown: string;
  title: string;
}

// Each AI tool gets a prompt containing the full page markdown so the
// assistant has immediate context without needing to follow a URL.
const AI_TOOLS = [
  {
    name: "Claude",
    dot: "#7C3AED",
    buildUrl: (prompt: string) =>
      `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
  },
  {
    name: "ChatGPT",
    dot: "#10A37F",
    buildUrl: (prompt: string) =>
      `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`,
  },
  {
    name: "Perplexity",
    dot: "#20B2AA",
    buildUrl: (prompt: string) =>
      `https://www.perplexity.ai/?q=${encodeURIComponent(prompt)}`,
  },
  {
    name: "Gemini",
    dot: "#4285F4",
    buildUrl: (prompt: string) =>
      `https://gemini.google.com/app?q=${encodeURIComponent(prompt)}`,
  },
];

function buildPrompt(title: string, markdown: string): string {
  return `I'm reading the Watcher24 documentation page: "${title}". Here is the full content:\n\n${markdown}\n\nPlease read through this and help me understand or implement it. Ask what specifically I need help with.`;
}

export function DocActions({ rawMarkdown, title }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopyMd() {
    await navigator.clipboard.writeText(rawMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const prompt = buildPrompt(title, rawMarkdown);

  return (
    <div className="flex items-center gap-1.5">
      {/* Copy MD */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyMd}
        className="h-7 gap-1.5 px-2.5 text-xs"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
        {copied ? "Copied!" : "Copy MD"}
      </Button>

      {/* Open in AI */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 gap-1 px-2.5 text-xs">
            Open in
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {AI_TOOLS.map((tool) => (
            <DropdownMenuItem key={tool.name} asChild>
              <a
                href={tool.buildUrl(prompt)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                {/* Color dot representing the AI tool */}
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: tool.dot }}
                />
                {tool.name}
                <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
              </a>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
