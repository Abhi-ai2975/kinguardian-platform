"use client";
// NotificationBell — header bell icon with unread badge and notification dropdown.
// Opens an SSE connection to /api/notifications/stream for real-time delivery;
// falls back to 30-second polling when the notifier is not running.
// Clicking the bell opens a dropdown showing the 20 most recent in-app
// notifications with severity indicators, read/unread state, and "Mark all read".
import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const SEVERITY_DOT: Record<string, string> = {
  info:  "bg-blue-500",
  warn:  "bg-amber-500",
  error: "bg-red-500",
};

// ── NotificationItem ──────────────────────────────────────────────────────────

function NotificationItem({
  n,
  onRead,
}: {
  n: InAppNotification;
  onRead: (id: string) => void;
}) {
  return (
    <button
      onClick={() => { if (!n.read) onRead(n.id); }}
      className={cn(
        "w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors",
        !n.read && "bg-muted/20",
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Severity dot */}
        <span
          className={cn(
            "mt-1.5 h-2 w-2 shrink-0 rounded-full",
            SEVERITY_DOT[n.severity] ?? "bg-blue-500",
          )}
        />
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm truncate", !n.read && "font-semibold")}>
            {n.title}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {n.body}
          </p>
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            {relativeTime(n.created_at)}
          </p>
        </div>
        {/* Unread dot indicator */}
        {!n.read && (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
        )}
      </div>
    </button>
  );
}

// ── NotificationBell ──────────────────────────────────────────────────────────

export function NotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Open an SSE connection to receive real-time notification signals.
  // When a signal arrives the query cache is invalidated so the bell updates
  // immediately without waiting for the 30-second poll interval.
  // EventSource reconnects automatically on failure, so no manual retry needed.
  useEffect(() => {
    const es = new EventSource("/api/notifications/stream");

    es.onmessage = () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    };

    // onerror is intentionally left as the default — EventSource retries automatically.

    return () => {
      es.close();
    };
  }, [queryClient]);

  const { data } = useQuery<NotificationsResponse>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 30_000,       // poll every 30 seconds
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

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 p-0"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header row */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Notification list */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[360px]">
            {notifications.map((n) => (
              <NotificationItem key={n.id} n={n} onRead={markOneRead} />
            ))}
          </ScrollArea>
        )}

        {/* Footer */}
        <div className="border-t px-4 py-2.5">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="text-xs text-primary hover:underline"
          >
            View all notifications
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
