"use client";

import { useState } from "react";
import { authClient } from "@/modules/client/auth/auth-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  ShieldCheck,
  ShieldOff,
  Copy,
  Check,
  Download,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface SecuritySettingsProps {
  twoFactorEnabled: boolean;
}

interface EnableResult {
  totpURI: string;
  backupCodes: string[];
}

function QRCodeDisplay({ totpUri }: { totpUri: string }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpUri)}`;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="border rounded-lg p-2 bg-white">
        <Image src={qrUrl} alt="TOTP QR code" width={180} height={180} unoptimized />
      </div>
      <details className="w-full">
        <summary className="text-xs text-muted-foreground cursor-pointer">
          Can&apos;t scan? Show manual entry key
        </summary>
        <p className="text-xs font-mono break-all mt-1 bg-muted rounded p-2">
          {totpUri.match(/secret=([^&]+)/)?.[1] ?? totpUri}
        </p>
      </details>
    </div>
  );
}

function BackupCodesList({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([codes.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        {codes.map((code) => (
          <code key={code} className="text-sm font-mono bg-muted rounded px-2 py-1 text-center">
            {code}
          </code>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy all"}
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={handleDownload}>
          <Download className="h-3.5 w-3.5" />
          Download
        </Button>
      </div>
    </div>
  );
}

export function SecuritySettings({ twoFactorEnabled: initialEnabled }: SecuritySettingsProps) {
  const [is2FAEnabled, setIs2FAEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);

  // Enable flow state
  const [showEnableDialog, setShowEnableDialog] = useState(false);
  const [enableStep, setEnableStep] = useState<"password" | "qr" | "done">("password");
  const [enablePassword, setEnablePassword] = useState("");
  const [enableResult, setEnableResult] = useState<EnableResult | null>(null);

  // Disable flow state
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");

  // Regenerate backup codes state
  const [showRegenDialog, setShowRegenDialog] = useState(false);
  const [regenPassword, setRegenPassword] = useState("");
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);

  async function handleEnable() {
    if (!enablePassword) return;
    setLoading(true);
    const { data, error } = await authClient.twoFactor.enable({ password: enablePassword });
    setLoading(false);

    if (error) {
      toast.error("Failed to enable 2FA", { description: error.message });
      return;
    }

    setEnableResult(data);
    setEnableStep("qr");
  }

  function handleEnableDone() {
    setIs2FAEnabled(true);
    setShowEnableDialog(false);
    setEnableStep("password");
    setEnablePassword("");
    setEnableResult(null);
    toast.success("Two-factor authentication enabled");
  }

  async function handleDisable() {
    if (!disablePassword) return;
    setLoading(true);
    const { error } = await authClient.twoFactor.disable({ password: disablePassword });
    setLoading(false);

    if (error) {
      toast.error("Failed to disable 2FA", { description: error.message });
      return;
    }

    setIs2FAEnabled(false);
    setShowDisableDialog(false);
    setDisablePassword("");
    toast.success("Two-factor authentication disabled");
  }

  async function handleRegenBackupCodes() {
    if (!regenPassword) return;
    setLoading(true);
    const { data, error } = await authClient.twoFactor.generateBackupCodes({ password: regenPassword });
    setLoading(false);

    if (error) {
      toast.error("Failed to regenerate backup codes", { description: error.message });
      return;
    }

    setNewBackupCodes(data.backupCodes);
    setRegenPassword("");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Security</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account security settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                {is2FAEnabled ? (
                  <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <ShieldOff className="h-5 w-5 text-muted-foreground" />
                )}
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account using an authenticator app.
              </CardDescription>
            </div>
            <Badge
              variant={is2FAEnabled ? "default" : "secondary"}
              className={is2FAEnabled
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                : ""}
            >
              {is2FAEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {is2FAEnabled ? (
            <>
              <p className="text-sm text-muted-foreground">
                Your account is protected with two-factor authentication. You&apos;ll need
                your authenticator app or email code when signing in.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRegenDialog(true)}
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerate backup codes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-800 dark:hover:bg-rose-950"
                  onClick={() => setShowDisableDialog(true)}
                >
                  <ShieldOff className="h-4 w-4" />
                  Disable 2FA
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Enable 2FA to protect your account. After enabling, you&apos;ll scan a QR code
                with an authenticator app (Google Authenticator, Authy, etc.) and save backup codes.
              </p>
              <Button size="sm" onClick={() => setShowEnableDialog(true)}>
                <ShieldCheck className="h-4 w-4" />
                Enable 2FA
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Enable 2FA dialog */}
      <Dialog
        open={showEnableDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowEnableDialog(false);
            setEnableStep("password");
            setEnablePassword("");
            setEnableResult(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          {enableStep === "password" && (
            <>
              <DialogHeader>
                <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
                <DialogDescription>
                  Confirm your password to generate your TOTP secret.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="enable-password">Password</Label>
                  <Input
                    id="enable-password"
                    type="password"
                    value={enablePassword}
                    onChange={(e) => setEnablePassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleEnable(); }}
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEnableDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEnable} disabled={!enablePassword || loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Continue
                </Button>
              </DialogFooter>
            </>
          )}

          {enableStep === "qr" && enableResult && (
            <>
              <DialogHeader>
                <DialogTitle>Scan QR Code</DialogTitle>
                <DialogDescription>
                  Scan this code with your authenticator app, then save your backup codes.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <QRCodeDisplay totpUri={enableResult.totpURI} />
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Backup codes</p>
                  <p className="text-xs text-muted-foreground">
                    Save these codes somewhere safe. Each can be used once if you lose access to your authenticator.
                  </p>
                  <BackupCodesList codes={enableResult.backupCodes} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleEnableDone} className="w-full">
                  I&apos;ve saved my backup codes — Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable 2FA dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              This will remove 2FA from your account. Confirm your password to continue.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="disable-password">Password</Label>
              <Input
                id="disable-password"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleDisable(); }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisableDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable}
              disabled={!disablePassword || loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate backup codes dialog */}
      <Dialog
        open={showRegenDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowRegenDialog(false);
            setRegenPassword("");
            setNewBackupCodes(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Regenerate Backup Codes</DialogTitle>
            <DialogDescription>
              {newBackupCodes
                ? "Your new backup codes are below. Save them — old codes are now invalid."
                : "Confirm your password to generate new backup codes. Old codes will be invalidated."}
            </DialogDescription>
          </DialogHeader>

          {newBackupCodes ? (
            <div className="py-2">
              <BackupCodesList codes={newBackupCodes} />
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="regen-password">Password</Label>
                <Input
                  id="regen-password"
                  type="password"
                  value={regenPassword}
                  onChange={(e) => setRegenPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleRegenBackupCodes(); }}
                  autoFocus
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {newBackupCodes ? (
              <Button
                className="w-full"
                onClick={() => {
                  setShowRegenDialog(false);
                  setNewBackupCodes(null);
                }}
              >
                Done
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowRegenDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleRegenBackupCodes}
                  disabled={!regenPassword || loading}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Generate
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
