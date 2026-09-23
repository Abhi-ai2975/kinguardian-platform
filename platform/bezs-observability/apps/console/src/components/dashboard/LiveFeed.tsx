// LiveFeed — real-time event stream panel on the overview page.
// Connects to the realtime-go WebSocket and renders a scrolling list of the
// most recent events.
//
// The full API key is never available server-side (better-auth shows it only
// once on creation), so LiveFeed manages its own key state via localStorage.
// On first visit it shows a paste prompt; on subsequent visits it reconnects
// automatically using the stored key.
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRealtimeEvents } from "@/hooks/useRealtimeEvents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wifi, WifiOff, X, Radio, KeyRound } from "lucide-react";
import { formatRelativeTime, severityVariant } from "@/lib/utils";

const LS_KEY = "watcher.livefeed.apikey";

export function LiveFeed() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Read from localStorage only after mount to avoid SSR mismatch.
  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) setApiKey(stored);
    setHydrated(true);
  }, []);

  const { events, connected, error, clear } = useRealtimeEvents({
    apiKey,
    maxEvents: 50,
    enabled: !!apiKey,
  });

  function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    const key = draft.trim();
    if (!key) return;
    localStorage.setItem(LS_KEY, key);
    setApiKey(key);
    setDraft("");
  }

  function handleDisconnect() {
    localStorage.removeItem(LS_KEY);
    setApiKey(null);
    clear();
  }

  const clearEvents = useCallback(() => clear(), [clear]);

  if (!hydrated) return null;

  if (!apiKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Radio className="h-4 w-4" />
            Live Feed
            <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleConnect} className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Paste an API key from{" "}
              <a href="/settings/api-keys" className="underline underline-offset-2">
                Settings → API Keys
              </a>{" "}
              to start the live feed.
            </p>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="wtch_…"
                className="h-8 text-xs font-mono"
                autoComplete="off"
              />
              <Button type="submit" size="sm" disabled={!draft.trim()}>
                <KeyRound className="h-3.5 w-3.5 mr-1" />
                Connect
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Radio className="h-4 w-4" />
          Live Feed
          {connected ? (
            <Wifi className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-muted-foreground animate-pulse" />
          )}
        </CardTitle>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={clearEvents} className="h-7 text-xs">
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDisconnect} className="h-7 text-xs text-muted-foreground">
            Disconnect
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {error && (
          <p className="px-4 py-2 text-xs text-destructive">{error}</p>
        )}
        <ScrollArea className="h-72">
          {events.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              {connected ? "Waiting for events…" : "Connecting…"}
            </div>
          ) : (
            <div className="divide-y">
              {events.map((ev, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                  <Badge
                    variant={severityVariant(ev.severity)}
                    className="shrink-0 mt-0.5 text-[10px] uppercase"
                  >
                    {ev.severity}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{ev.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {ev.event_type}
                      {ev.application_id && ` · ${ev.application_id}`}
                      {" · "}
                      {formatRelativeTime(ev.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
