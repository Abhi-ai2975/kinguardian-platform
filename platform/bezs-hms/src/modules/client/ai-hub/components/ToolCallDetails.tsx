"use client";

import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  Wrench,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { ToolCallInfo } from "../store/chat-store";

interface ToolCallDetailsProps {
  toolCall: ToolCallInfo;
}

export function ToolCallDetails({ toolCall }: ToolCallDetailsProps) {
  const [open, setOpen] = useState(false);

  const statusConfig = {
    pending: {
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />,
      label: "Calling...",
      badgeClass:
        "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800",
    },
    success: {
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
      label: "Success",
      badgeClass:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800",
    },
    error: {
      icon: <XCircle className="h-3.5 w-3.5 text-red-500" />,
      label: "Error",
      badgeClass:
        "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800",
    },
  };

  const config = statusConfig[toolCall.status];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer group">
        <Wrench className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
          Tool Call: {toolCall.toolName}
        </span>
        <Badge
          variant="outline"
          className={`ml-auto flex-shrink-0 text-xs gap-1 ${config.badgeClass}`}
        >
          {config.icon}
          {config.label}
        </Badge>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 overflow-hidden">
        {/* Form Data Section */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Submitted Data
          </h4>
          <div className="space-y-1.5">
            {Object.entries(toolCall.formData).length === 0 ? (
              <p className="text-xs text-slate-400 italic">No data submitted</p>
            ) : (
              Object.entries(toolCall.formData).map(([key, value]) => (
                <div key={key} className="flex items-start gap-2 text-xs">
                  <span className="font-mono font-medium text-slate-600 dark:text-slate-300 min-w-[100px] flex-shrink-0">
                    {key}:
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 break-all">
                    {typeof value === "object"
                      ? JSON.stringify(value, null, 2)
                      : String(value ?? "")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Result Section */}
        <div className="px-4 py-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Result
          </h4>
          {toolCall.status === "pending" && (
            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Executing tool...
            </div>
          )}
          {toolCall.status === "error" && (
            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">
              ⚠️ {toolCall.error || "Unknown error"}
            </div>
          )}
          {toolCall.status === "success" && (
            <pre className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto max-h-60 whitespace-pre-wrap break-words">
              {typeof toolCall.result === "object"
                ? JSON.stringify(toolCall.result, null, 2)
                : String(toolCall.result ?? "No data returned")}
            </pre>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
