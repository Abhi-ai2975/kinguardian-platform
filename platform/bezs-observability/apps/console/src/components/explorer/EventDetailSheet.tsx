"use client";
// EventDetailSheet — slide-over panel showing every stored field for a single event.
// Opened by clicking any row in the EventsExplorer table.
// Sections: Application, User/Session, Trace Context, Timestamps, Network, Payload.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, GitBranch } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { severityVariant, formatDate } from "@/lib/utils";
import type { EventRow } from "@/lib/clickhouse";

// ─── Small primitives ─────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      onClick={copy}
      className="ml-1.5 shrink-0 text-muted-foreground/60 hover:text-foreground transition-colors"
      aria-label="Copy to clipboard"
    >
      {copied
        ? <Check className="h-3 w-3 text-green-500" />
        : <Copy className="h-3 w-3" />
      }
    </button>
  );
}

// FieldRow renders one label + value pair inside a Section.
// Returns null when value is absent so sections auto-collapse cleanly.
function FieldRow({
  label,
  value,
  mono = false,
  copy = false,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  copy?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[9rem_1fr] items-start gap-4 py-2.5">
      <span className="text-xs text-muted-foreground leading-5">{label}</span>
      <div className="flex items-start min-w-0">
        <span className={`text-xs break-all leading-5 ${mono ? "font-mono" : ""}`}>
          {value}
        </span>
        {copy && <CopyButton value={value} />}
      </div>
    </div>
  );
}

// Section wraps a group of FieldRows with a label and a subtle card background.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
        {title}
      </p>
      <div className="rounded-lg border bg-muted/20 divide-y px-3">
        {children}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parsePayload(raw: string | null | undefined): string | null {
  if (!raw || raw === "{}" || raw === "null" || raw === "") return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      Object.keys(parsed).length === 0
    ) {
      return null;
    }
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw.trim() || null;
  }
}

function calcLatencyMs(timestamp: string, ingestedAt: string): string | null {
  const diff =
    new Date(ingestedAt).getTime() - new Date(timestamp).getTime();
  if (isNaN(diff) || diff < 0) return null;
  return `${diff}ms`;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface EventDetailSheetProps {
  event: EventRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Base path for the "View full trace" link. Defaults to /traces so callers
  // in the general events explorer keep the existing behaviour. The AI events
  // explorer passes /ai/traces to stay within the AI observability flow.
  traceBasePath?: string;
}

export function EventDetailSheet({
  event,
  open,
  onOpenChange,
  traceBasePath = "/traces",
}: EventDetailSheetProps) {
  const router = useRouter();

  if (!event) return null;

  const payload  = parsePayload(event.payload);
  const latency  = calcLatencyMs(event.timestamp, event.ingested_at);
  const hasUser  = !!(event.user_id || event.session_id);
  const hasTrace = !!(event.trace_id || event.span_id);
  const hasNet   = !!(event.ip_address || event.region);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {/* ── Fixed header ─────────────────────────────────────────────── */}
        <SheetHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wide">
              {event.event_type}
            </Badge>
            <Badge
              variant={severityVariant(event.severity)}
              className="text-[10px] uppercase"
            >
              {event.severity}
            </Badge>
            <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
              {formatDate(event.timestamp)}
            </span>
          </div>

          <SheetTitle className="break-all">{event.message}</SheetTitle>

          <SheetDescription className="font-mono">
            {[event.application_id, event.environment]
              .filter(Boolean)
              .join(" · ")}
          </SheetDescription>
        </SheetHeader>

        {/* ── Scrollable body ──────────────────────────────────────────── */}
        <ScrollArea className="flex-1 px-6 py-5">
          <div className="space-y-5 pb-10">

            {/* Application */}
            <Section title="Application">
              <FieldRow label="App ID"       value={event.application_id}  mono copy />
              <FieldRow label="Environment"  value={event.environment} />
              <FieldRow label="Source"       value={event.source || undefined} />
              <FieldRow label="Service"      value={event.service_name || undefined} mono />
              <FieldRow label="SDK Version"  value={event.sdk_version} mono />
              <FieldRow label="Runtime"      value={event.runtime} mono />
            </Section>

            {/* User & Session */}
            {hasUser && (
              <Section title="User & Session">
                <FieldRow label="User ID"    value={event.user_id}    mono copy />
                <FieldRow label="Session ID" value={event.session_id} mono copy />
              </Section>
            )}

            {/* Trace Context */}
            {hasTrace && (
              <Section title="Trace Context">
                <FieldRow label="Trace ID"       value={event.trace_id}       mono copy />
                <FieldRow label="Span ID"        value={event.span_id}        mono copy />
                <FieldRow label="Parent Span ID" value={event.parent_span_id} mono copy />
                {event.trace_id && (
                  <div className="py-2.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-2 w-full justify-between"
                      onClick={() => {
                        onOpenChange(false);
                        router.push(`${traceBasePath}/${event.trace_id}`);
                      }}
                    >
                      View full trace
                      <GitBranch className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </Section>
            )}

            {/* Timestamps */}
            <Section title="Timestamps">
              <FieldRow
                label="Event time"
                value={new Date(event.timestamp).toISOString()}
                mono
              />
              <FieldRow
                label="Ingested at"
                value={new Date(event.ingested_at).toISOString()}
                mono
              />
              {latency && (
                <FieldRow label="Ingest latency" value={latency} mono />
              )}
            </Section>

            {/* Network */}
            {hasNet && (
              <Section title="Network">
                <FieldRow label="IP Address" value={event.ip_address} mono />
                <FieldRow label="Region"     value={event.region} />
              </Section>
            )}

            {/* Payload */}
            {payload && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Payload
                  </p>
                  <CopyButton value={payload} />
                </div>
                <pre className="rounded-lg border bg-muted/40 px-4 py-3 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
                  {payload}
                </pre>
              </div>
            )}

          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
