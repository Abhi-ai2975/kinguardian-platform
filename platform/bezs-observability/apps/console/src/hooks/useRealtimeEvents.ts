// useRealtimeEvents — opens a WebSocket to the realtime-go service and
// pushes incoming events into a bounded local ring buffer.
//
// The realtime service requires an API key via ?token= query param.
// If no apiKey is provided, the hook does nothing.
"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface RealtimeEvent {
  event_type: string;
  severity: string;
  message: string;
  timestamp: string;
  application_id?: string;
  user_id?: string;
}

interface UseRealtimeEventsOptions {
  // apiKey to authenticate with the realtime service.
  apiKey: string | null;
  // Maximum events to keep in memory (oldest are dropped when full).
  maxEvents?: number;
  // Whether the connection should be active.
  enabled?: boolean;
}

interface UseRealtimeEventsResult {
  events: RealtimeEvent[];
  connected: boolean;
  error: string | null;
  clear: () => void;
}

// useRealtimeEvents maintains a WebSocket connection to the realtime-go service
// and returns a live-updating list of the most recent events.
export function useRealtimeEvents({
  apiKey,
  maxEvents = 100,
  enabled = true,
}: UseRealtimeEventsOptions): UseRealtimeEventsResult {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => setEvents([]), []);

  useEffect(() => {
    if (!enabled || !apiKey) return;

    const realtimeUrl = process.env.NEXT_PUBLIC_REALTIME_URL ?? "ws://localhost:8081";

    function connect() {
      const ws = new WebSocket(`${realtimeUrl}/ws?token=${encodeURIComponent(apiKey!)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError(null);
      };

      ws.onmessage = (ev) => {
        try {
          const event = JSON.parse(ev.data) as RealtimeEvent;
          setEvents((prev) => {
            // Prepend and cap at maxEvents to act as a ring buffer.
            const next = [event, ...prev];
            return next.length > maxEvents ? next.slice(0, maxEvents) : next;
          });
        } catch {
          // Malformed JSON from the server — ignore silently.
        }
      };

      ws.onclose = () => {
        setConnected(false);
        // Reconnect after 3 s unless the component unmounted.
        reconnectTimerRef.current = setTimeout(connect, 3_000);
      };

      ws.onerror = () => {
        setError("WebSocket connection error — retrying…");
        ws.close();
      };
    }

    connect();

    return () => {
      reconnectTimerRef.current && clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [apiKey, enabled, maxEvents]);

  return { events, connected, error, clear };
}
