"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/modules/client/auth/betterauth/auth-client";
import { Monitor, Smartphone, Globe, Loader2, LogOut, ShieldAlert } from "lucide-react";

type SessionItem = {
  id: string;
  token: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

function parseUA(ua: string | null): { browser: string; os: string; isMobile: boolean } {
  if (!ua) return { browser: "Unknown Browser", os: "Unknown OS", isMobile: false };
  const isMobile = /Mobile|Android|iPhone|iPad/.test(ua);
  const browser = ua.includes("Edg")
    ? "Edge"
    : ua.includes("Chrome")
    ? "Chrome"
    : ua.includes("Firefox")
    ? "Firefox"
    : ua.includes("Safari")
    ? "Safari"
    : ua.includes("Opera")
    ? "Opera"
    : "Browser";
  const os = ua.includes("Windows")
    ? "Windows"
    : ua.includes("Mac OS")
    ? "macOS"
    : ua.includes("Linux")
    ? "Linux"
    : ua.includes("Android")
    ? "Android"
    : ua.includes("iPhone") || ua.includes("iPad")
    ? "iOS"
    : "Unknown";
  return { browser, os, isMobile };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function SessionsSettings({ currentToken }: { currentToken: string }) {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingToken, setRevokingToken] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  useEffect(() => {
    authClient.listSessions().then(({ data }) => {
      if (data) setSessions(data as SessionItem[]);
      setLoading(false);
    });
  }, []);

  async function handleRevoke(token: string) {
    setRevokingToken(token);
    const { error } = await authClient.revokeSession({ token });
    if (error) {
      toast.error(error.message ?? "Failed to revoke session.");
    } else {
      setSessions((prev) => prev.filter((s) => s.token !== token));
      toast.success("Session revoked.");
    }
    setRevokingToken(null);
  }

  async function handleRevokeOthers() {
    setRevokingAll(true);
    const { error } = await authClient.revokeOtherSessions();
    if (error) {
      toast.error(error.message ?? "Failed to revoke sessions.");
    } else {
      setSessions((prev) => prev.filter((s) => s.token === currentToken));
      toast.success("All other sessions have been revoked.");
    }
    setRevokingAll(false);
  }

  const otherSessions = sessions.filter((s) => s.token !== currentToken);
  const currentSession = sessions.find((s) => s.token === currentToken);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <ShieldAlert className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Active Sessions</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Devices currently signed in to your account.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Sessions</CardTitle>
              <CardDescription>
                {loading
                  ? "Loading sessions…"
                  : `${sessions.length} active session${sessions.length !== 1 ? "s" : ""}`}
              </CardDescription>
            </div>
            {otherSessions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10"
                disabled={revokingAll}
                onClick={handleRevokeOthers}
              >
                {revokingAll ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : (
                  <LogOut className="size-3.5 mr-1.5" />
                )}
                Revoke all others
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No active sessions found.
              </p>
            ) : (
              <>
                {currentSession && (
                  <SessionRow
                    session={currentSession}
                    isCurrent
                    isRevoking={false}
                    onRevoke={() => {}}
                  />
                )}
                {otherSessions.map((s) => (
                  <SessionRow
                    key={s.token}
                    session={s}
                    isCurrent={false}
                    isRevoking={revokingToken === s.token}
                    onRevoke={() => handleRevoke(s.token)}
                  />
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function SessionRow({
  session,
  isCurrent,
  isRevoking,
  onRevoke,
}: {
  session: SessionItem;
  isCurrent: boolean;
  isRevoking: boolean;
  onRevoke: () => void;
}) {
  const { browser, os, isMobile } = parseUA(session.userAgent);
  const DeviceIcon = isMobile ? Smartphone : Monitor;

  return (
    <div
      className={`flex items-center gap-4 rounded-lg border px-4 py-3 ${
        isCurrent ? "border-primary/40 bg-primary/5" : "border-border"
      }`}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <DeviceIcon className="size-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium truncate">
            {browser} · {os}
          </p>
          {isCurrent && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              This device
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {session.ipAddress && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Globe className="size-3" />
              {session.ipAddress}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {timeAgo(session.updatedAt ?? session.createdAt)}
          </span>
        </div>
      </div>
      {!isCurrent && (
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={isRevoking}
          onClick={onRevoke}
        >
          {isRevoking ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <LogOut className="size-3.5" />
          )}
        </Button>
      )}
    </div>
  );
}
