"use client";
// NotificationsExplorer — full paginated notification list for /notifications.
// Shows read/unread state, severity badge, delivery channel, and timestamp.
// Provides "Mark all read", per-row mark-read on click, and a "Send test" button.
// Uses the same SSE stream as NotificationBell for real-time updates.
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface InAppNotification {
  id: string;
  org_id: string;
  title: string;
  body: string;
  severity: "info" | "warn" | "error";
  read: boolean;
  created_at: string;
}

interface NotificationsResponse {
  notifications: InAppNotification[];
  unread_count: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SEVERITY_BADGE: Record<string, string> = {
  info:  "border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:bg-blue-950/30",
  warn:  "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:bg-amber-950/30",
  error: "border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-300 dark:bg-red-950/30",
};

// ── NotificationsExplorer ─────────────────────────────────────────────────────

interface NotificationsExplorerProps {
  orgId: string;
}

export function NotificationsExplorer({ orgId }: NotificationsExplorerProps) {
  const queryClient = useQueryClient();
  const testIndexRef = useRef(0);
  const [sending, setSending] = useState(false);

  // Real-time updates via SSE — invalidates query whenever a new notification
  // signal arrives, so the list refreshes without manual reload.
  useEffect(() => {
    const es = new EventSource("/api/notifications/stream");
    es.onmessage = () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    };
    return () => es.close();
  }, [queryClient]);

  const { data, isFetching } = useQuery<NotificationsResponse>({
    queryKey: ["/api/notifications", orgId],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    refetchOnWindowFocus: true,
  });

  const notifications = data?.notifications ?? [];
  const unreadCount   = data?.unread_count ?? 0;

  async function markOneRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
  }

  async function sendTest() {
    setSending(true);
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index: testIndexRef.current }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to send test notification");
      } else {
        testIndexRef.current += 1;
        toast.success("Test notification sent");
        // Refetch after a short delay so the DB write has landed.
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        }, 400);
      }
    } catch {
      toast.error("Could not reach the notifier — run `just notifier-dev`");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {isFetching ? "Refreshing…" : `${unreadCount} unread`}
        </p>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead} className="h-8 gap-2">
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={sendTest}
            disabled={sending}
            className="h-8 gap-2"
          >
            <FlaskConical className="h-3.5 w-3.5" />
            {sending ? "Sending…" : "Send test"}
          </Button>
        </div>
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/20 py-20 text-center">
          <Bell className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No notifications yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Alerts and system messages will appear here
          </p>
        </div>
      ) : (
        <div className="rounded-lg border divide-y overflow-hidden">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => { if (!n.read) markOneRead(n.id); }}
              className={cn(
                "w-full text-left flex items-start gap-4 px-5 py-4 hover:bg-muted/40 transition-colors",
                !n.read && "bg-muted/20",
              )}
            >
              {/* Unread stripe */}
              <span
                className={cn(
                  "mt-1 h-2 w-2 shrink-0 rounded-full",
                  n.read ? "bg-muted-foreground/20" : "bg-primary",
                )}
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={cn("text-sm", !n.read && "font-semibold")}>
                    {n.title}
                  </p>
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] uppercase shrink-0", SEVERITY_BADGE[n.severity])}
                  >
                    {n.severity}
                  </Badge>
                  {n.read && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">
                      read
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 leading-snug">
                  {n.body}
                </p>
              </div>

              {/* Timestamp */}
              <span className="text-xs text-muted-foreground/70 whitespace-nowrap shrink-0 mt-0.5">
                {formatDate(n.created_at)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
