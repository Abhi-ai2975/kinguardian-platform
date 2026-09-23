// API Keys settings — manage SDK ingestion keys and public browser tokens.
"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Copy, KeyRound, Trash2, Plus, Globe } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ApiKey {
  id: string;
  name: string;
  start: string;
  createdAt: string;
  expiresAt: string | null;
  enabled: boolean;
}

interface App {
  id: string;
  name: string;
}

interface PublicToken {
  id: string;
  name: string;
  start: string;
  enabled: boolean;
  allowedOrigins: string[];
  minuteRateLimit: number;
  appId: string | null;
  createdAt: string;
  lastRequest: string | null;
}

export default function ApiKeysPage() {
  // ── Secret keys state ───────────────────────────────────────────────────────
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  // ── Public tokens state ─────────────────────────────────────────────────────
  const [pubTokens, setPubTokens] = useState<PublicToken[]>([]);
  const [loadingPub, setLoadingPub] = useState(true);
  const [creatingPub, setCreatingPub] = useState(false);
  const [newPubName, setNewPubName] = useState("");
  const [newPubOrigins, setNewPubOrigins] = useState("");
  const [newPubRateLimit, setNewPubRateLimit] = useState("1000");
  const [newPubAppId, setNewPubAppId] = useState("");
  const [createdPubToken, setCreatedPubToken] = useState<string | null>(null);
  const [revokePubTarget, setRevokePubTarget] = useState<PublicToken | null>(null);
  const [revokingPub, setRevokingPub] = useState(false);

  // ── Apps state (for linking public tokens to an app) ───────────────────────
  const [apps, setApps] = useState<App[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  async function fetchKeys() {
    setLoadingKeys(true);
    const { data, error } = await authClient.apiKey.list();
    if (!error && data) {
      const list = (data as unknown as { apiKeys: ApiKey[] }).apiKeys ?? [];
      setKeys(list);
    }
    setLoadingKeys(false);
  }

  async function fetchPubTokens() {
    setLoadingPub(true);
    try {
      const res = await fetch("/api/public-tokens");
      if (res.ok) {
        const data = await res.json();
        setPubTokens(data.tokens ?? []);
      }
    } catch {
      // leave empty
    }
    setLoadingPub(false);
  }

  async function fetchApps() {
    setLoadingApps(true);
    try {
      const res = await fetch("/api/apps");
      if (res.ok) {
        const data = await res.json();
        setApps(Array.isArray(data) ? data : []);
      }
    } catch {
      // leave empty
    }
    setLoadingApps(false);
  }

  useEffect(() => {
    fetchKeys();
    fetchPubTokens();
    fetchApps();
  }, []);

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const { data, error } = await authClient.apiKey.create({
      name: newKeyName || "Default",
    });
    if (error) {
      toast.error(error.message ?? "Failed to create key");
    } else if (data) {
      setCreatedKey((data as { key: string }).key);
      setNewKeyName("");
      await fetchKeys();
      toast.success("API key created");
    }
    setCreating(false);
  }

  async function confirmRevokeKey() {
    if (!revokeTarget) return;
    setRevoking(true);
    const { error } = await authClient.apiKey.delete({ keyId: revokeTarget.id });
    if (error) {
      toast.error(error.message ?? "Failed to revoke key");
    } else {
      toast.success("Key revoked");
      await fetchKeys();
    }
    setRevokeTarget(null);
    setRevoking(false);
  }

  async function handleCreatePubToken(e: React.FormEvent) {
    e.preventDefault();
    setCreatingPub(true);

    const origins = newPubOrigins
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);

    if (origins.length === 0) {
      toast.error("Add at least one allowed origin");
      setCreatingPub(false);
      return;
    }

    const rateLimit = parseInt(newPubRateLimit, 10);

    try {
      const res = await fetch("/api/public-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPubName || "Browser token",
          allowedOrigins: origins,
          minuteRateLimit: isNaN(rateLimit) || rateLimit <= 0 ? 1000 : rateLimit,
          // appId links this token to an application so browser + server events
          // are grouped together in the dashboard. Omitted when no app is selected.
          ...(newPubAppId ? { appId: newPubAppId } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create token");
      } else {
        setCreatedPubToken(data.token);
        setNewPubName("");
        setNewPubOrigins("");
        setNewPubRateLimit("1000");
        setNewPubAppId("");
        await fetchPubTokens();
        toast.success("Public token created — copy it now");
      }
    } catch {
      toast.error("Network error");
    }
    setCreatingPub(false);
  }

  async function confirmRevokePub() {
    if (!revokePubTarget) return;
    setRevokingPub(true);
    try {
      const res = await fetch(`/api/public-tokens?id=${revokePubTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Token revoked");
        await fetchPubTokens();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Failed to revoke token");
      }
    } catch {
      toast.error("Network error");
    }
    setRevokePubTarget(null);
    setRevokingPub(false);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.info("Copied to clipboard");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">API Keys</h1>
        <p className="text-sm text-muted-foreground">
          Manage server-side API keys and public browser tokens
        </p>
      </div>

      <Tabs defaultValue="secret">
        <TabsList>
          <TabsTrigger value="secret">Secret Keys</TabsTrigger>
          <TabsTrigger value="public">Public Tokens</TabsTrigger>
        </TabsList>

        {/* ── Secret API keys tab ─────────────────────────────────────────── */}
        <TabsContent value="secret" className="space-y-6 mt-4">
          {createdKey && (
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
              <CardHeader>
                <CardTitle className="text-sm text-green-800 dark:text-green-300">
                  New API key created
                </CardTitle>
                <CardDescription className="text-green-700 dark:text-green-400">
                  Copy this key now — it will never be shown again.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <code className="flex-1 rounded bg-green-100 dark:bg-green-900/40 px-3 py-1.5 text-xs font-mono break-all">
                  {createdKey}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(createdKey)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setCreatedKey(null)}>
                  Dismiss
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create API Key
              </CardTitle>
              <CardDescription>
                Server-side keys for Node.js, Python, and Go SDKs. Keep these secret.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateKey} className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="key-name" className="text-xs">
                    Key name (optional)
                  </Label>
                  <Input
                    id="key-name"
                    placeholder="e.g. production-backend"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" size="sm" disabled={creating}>
                    {creating ? "Creating…" : "Create"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                API Keys
              </CardTitle>
              <CardDescription>
                Keys authenticate SDK ingestion and the live feed WebSocket.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingKeys ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : keys.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No API keys yet. Create one above.
                </p>
              ) : (
                <div className="space-y-3">
                  {keys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between rounded-md border px-4 py-3"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{key.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {key.start}…
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Created {formatDate(key.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={key.enabled ? "secondary" : "destructive"}
                          className="text-xs"
                        >
                          {key.enabled ? "Active" : "Disabled"}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setRevokeTarget(key)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Public tokens tab ───────────────────────────────────────────── */}
        <TabsContent value="public" className="space-y-6 mt-4">
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
            <CardContent className="pt-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Public tokens</strong> are safe to embed in browser bundles.
                The gateway enforces an origin allowlist and a per-minute rate limit
                so a leaked token cannot be abused at scale.
              </p>
            </CardContent>
          </Card>

          {createdPubToken && (
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
              <CardHeader>
                <CardTitle className="text-sm text-green-800 dark:text-green-300">
                  Public token created
                </CardTitle>
                <CardDescription className="text-green-700 dark:text-green-400">
                  Copy this token now — it will never be shown again.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <code className="flex-1 rounded bg-green-100 dark:bg-green-900/40 px-3 py-1.5 text-xs font-mono break-all">
                  {createdPubToken}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(createdPubToken)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setCreatedPubToken(null)}>
                  Dismiss
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Public Token
              </CardTitle>
              <CardDescription>
                Used with <code className="text-xs">@watcher/browser</code> and{" "}
                <code className="text-xs">@watcher/react</code>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePubToken} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="pub-name" className="text-xs">
                    Token name
                  </Label>
                  <Input
                    id="pub-name"
                    placeholder="e.g. my-app-browser"
                    value={newPubName}
                    onChange={(e) => setNewPubName(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="pub-origins" className="text-xs">
                    Allowed origins{" "}
                    <span className="text-muted-foreground">(one per line)</span>
                  </Label>
                  <Textarea
                    id="pub-origins"
                    placeholder={"https://myapp.com\nhttps://staging.myapp.com"}
                    value={newPubOrigins}
                    onChange={(e) => setNewPubOrigins(e.target.value)}
                    rows={3}
                    className="text-sm font-mono resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Must start with <code>https://</code> or{" "}
                    <code>http://localhost</code>. Max 10 origins.
                  </p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="pub-ratelimit" className="text-xs">
                    Rate limit (events / minute)
                  </Label>
                  <Input
                    id="pub-ratelimit"
                    type="number"
                    min={1}
                    max={10000}
                    value={newPubRateLimit}
                    onChange={(e) => setNewPubRateLimit(e.target.value)}
                    className="h-8 text-sm w-36"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="pub-app" className="text-xs">
                    Link to application{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <select
                    id="pub-app"
                    value={newPubAppId}
                    onChange={(e) => setNewPubAppId(e.target.value)}
                    disabled={loadingApps}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">— No app (org-level) —</option>
                    {apps.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Link to an app to group browser and server events together in the dashboard.
                  </p>
                </div>

                <Button type="submit" size="sm" disabled={creatingPub}>
                  {creatingPub ? "Creating…" : "Create token"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Public Tokens
              </CardTitle>
              <CardDescription>
                Browser-safe tokens with origin allowlist and rate limiting.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPub ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : pubTokens.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No public tokens yet. Create one above.
                </p>
              ) : (
                <div className="space-y-3">
                  {pubTokens.map((token) => (
                    <div
                      key={token.id}
                      className="rounded-md border px-4 py-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">{token.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {token.start}…
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Created {formatDate(token.createdAt)}
                            {token.lastRequest && (
                              <> · Last used {formatDate(token.lastRequest)}</>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={token.enabled ? "secondary" : "destructive"}
                            className="text-xs"
                          >
                            {token.enabled ? "Active" : "Disabled"}
                          </Badge>
                          <Badge variant="outline" className="text-xs font-mono">
                            {token.minuteRateLimit}/min
                          </Badge>
                          {token.appId && (
                            <Badge variant="secondary" className="text-xs">
                              {apps.find((a) => a.id === token.appId)?.name ?? token.appId}
                            </Badge>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setRevokePubTarget(token)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {token.allowedOrigins.map((origin) => (
                          <Badge
                            key={origin}
                            variant="outline"
                            className="text-xs font-mono"
                          >
                            {origin}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Revoke dialogs ───────────────────────────────────────────────────── */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke &ldquo;{revokeTarget?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the key. Any SDK or service using it will immediately stop
              authenticating. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRevokeKey}
              disabled={revoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revoking ? "Revoking…" : "Revoke Key"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!revokePubTarget} onOpenChange={(open) => { if (!open) setRevokePubTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke &ldquo;{revokePubTarget?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the public token. Any browser SDK using it will immediately
              stop sending events. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokingPub}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRevokePub}
              disabled={revokingPub}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokingPub ? "Revoking…" : "Revoke Token"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
