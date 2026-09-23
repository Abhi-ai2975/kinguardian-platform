"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { authClient } from "@/modules/client/auth/betterauth/auth-client";
import { User } from "@/modules/server/auth/types";
import {
  KeyRound,
  Mail,
  ShieldCheck,
  ShieldOff,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";

const emailSchema = z.object({
  newEmail: z.string().email("Enter a valid email address"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(8, "At least 8 characters"),
    newPassword: z.string().min(8, "At least 8 characters").max(72),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type EmailForm = z.infer<typeof emailSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type TwoFaStep = "idle" | "setup" | "verify" | "backup";

function extractTotpSecret(uri: string): string {
  try {
    return new URL(uri).searchParams.get("secret") ?? uri;
  } catch {
    return uri;
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <Button size="icon" variant="ghost" className="size-7 shrink-0" onClick={copy}>
      {copied ? (
        <Check className="size-3.5 text-green-500" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </Button>
  );
}

export default function SecuritySettings({ user }: { user: User }) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<{ providerId: string }[]>([]);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const [twoFaStep, setTwoFaStep] = useState<TwoFaStep>("idle");
  const [twoFaEnabled, setTwoFaEnabled] = useState(user.twoFactorEnabled ?? false);
  const [twoFaPassword, setTwoFaPassword] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [twoFaPending, setTwoFaPending] = useState(false);

  useEffect(() => {
    authClient.listAccounts().then(({ data }) => {
      if (data) setAccounts(data as { provider: string }[]);
    });
  }, []);

  const hasCredentials = accounts.some((a) => a.providerId === "credential");

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { newEmail: "" },
  });

  async function onEmailSubmit(values: EmailForm) {
    const { error } = await authClient.changeEmail({
      newEmail: values.newEmail,
      callbackURL: "/bezs/settings/security",
    });
    if (error) {
      toast.error(error.message ?? "Failed to change email.");
    } else {
      toast.success("Verification sent to your current email.");
      emailForm.reset();
    }
  }

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onPasswordSubmit(values: PasswordForm) {
    const { error } = await authClient.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: true,
    });
    if (error) {
      toast.error(error.message ?? "Failed to change password.");
    } else {
      toast.success("Password updated. Other sessions have been revoked.");
      passwordForm.reset();
      router.refresh();
    }
  }

  async function handleEnable2FA() {
    if (!twoFaPassword) return;
    setTwoFaPending(true);
    try {
      const { data, error } = await authClient.twoFactor.getTotpUri({ password: twoFaPassword });
      if (error) throw new Error(error.message);
      const uri = (data as { totpURI?: string })?.totpURI ?? "";
      setTotpSecret(extractTotpSecret(uri));
      setTwoFaStep("setup");
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Failed to start 2FA setup.");
    } finally {
      setTwoFaPending(false);
    }
  }

  async function handleVerifyTotp() {
    if (!verifyCode) return;
    setTwoFaPending(true);
    try {
      const { error } = await authClient.twoFactor.verifyTotp({ code: verifyCode });
      if (error) throw new Error(error.message);

      const enableRes = await authClient.twoFactor.enable({ password: twoFaPassword });
      if (enableRes.error) throw new Error(enableRes.error.message);

      const bcRes = await authClient.twoFactor.generateBackupCodes({ password: twoFaPassword });
      const codes = (bcRes.data as { backupCodes?: string[] })?.backupCodes ?? [];
      setBackupCodes(codes);
      setTwoFaEnabled(true);
      setTwoFaStep("backup");
      toast.success("Two-factor authentication enabled!");
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Verification failed.");
    } finally {
      setTwoFaPending(false);
    }
  }

  async function handleDisable2FA() {
    if (!twoFaPassword) return;
    setTwoFaPending(true);
    try {
      const { error } = await authClient.twoFactor.disable({ password: twoFaPassword });
      if (error) throw new Error(error.message);
      setTwoFaEnabled(false);
      setTwoFaStep("idle");
      setTwoFaPassword("");
      toast.success("Two-factor authentication disabled.");
      router.refresh();
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Failed to disable 2FA.");
    } finally {
      setTwoFaPending(false);
    }
  }

  async function handleViewBackupCodes() {
    if (!twoFaPassword) return;
    setTwoFaPending(true);
    try {
      const { data, error } = await authClient.twoFactor.viewBackupCodes({ password: twoFaPassword });
      if (error) throw new Error(error.message);
      const codes = (data as { backupCodes?: string[] })?.backupCodes ?? [];
      setBackupCodes(codes);
      setTwoFaStep("backup");
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Failed to view backup codes.");
    } finally {
      setTwoFaPending(false);
    }
  }

  async function handleRegenerateBackupCodes() {
    if (!twoFaPassword) return;
    setTwoFaPending(true);
    try {
      const { data, error } = await authClient.twoFactor.generateBackupCodes({ password: twoFaPassword });
      if (error) throw new Error(error.message);
      const codes = (data as { backupCodes?: string[] })?.backupCodes ?? [];
      setBackupCodes(codes);
      setTwoFaStep("backup");
      toast.success("Backup codes regenerated. Save them now.");
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Failed to regenerate codes.");
    } finally {
      setTwoFaPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <KeyRound className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Password & Authentication</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Manage your login credentials and account security.
            </p>
          </div>
        </div>

        {!hasCredentials && accounts.length > 0 && (
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            <AlertCircle className="size-4 mt-0.5 shrink-0" />
            <p>
              Your account uses social login only. Email and password settings are not available.
              Add an email/password account from your profile to access these settings.
            </p>
          </div>
        )}

        <Card className={!hasCredentials ? "opacity-50 pointer-events-none" : ""}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground" />
              <CardTitle>Email Address</CardTitle>
            </div>
            <CardDescription>
              Current:{" "}
              <span className="font-medium text-foreground">{user.email}</span>
              {user.emailVerified && (
                <Badge variant="secondary" className="ml-2 text-xs">Verified</Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                <FormField
                  control={emailForm.control}
                  name="newEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="new@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={emailForm.formState.isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {emailForm.formState.isSubmitting && (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  )}
                  Send Verification
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className={!hasCredentials ? "opacity-50 pointer-events-none" : ""}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-muted-foreground" />
              <CardTitle>Change Password</CardTitle>
            </div>
            <CardDescription>
              Updating your password will sign out all other active sessions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showCurrentPw ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowCurrentPw((v) => !v)}
                          >
                            {showCurrentPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showNewPw ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowNewPw((v) => !v)}
                          >
                            {showNewPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={passwordForm.formState.isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {passwordForm.formState.isSubmitting && (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  )}
                  Update Password
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {twoFaEnabled ? (
                  <ShieldCheck className="size-4 text-green-500" />
                ) : (
                  <ShieldOff className="size-4 text-muted-foreground" />
                )}
                <CardTitle>Two-Factor Authentication</CardTitle>
              </div>
              <Badge
                variant={twoFaEnabled ? "default" : "secondary"}
                className={twoFaEnabled ? "bg-green-500/15 text-green-600 border-green-200" : ""}
              >
                {twoFaEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <CardDescription>
              Add an extra layer of security with a time-based one-time password (TOTP)
              authenticator app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Your Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={twoFaPassword}
                onChange={(e) => setTwoFaPassword(e.target.value)}
              />
            </div>

            {twoFaStep === "idle" && (
              <div className="flex flex-wrap gap-2 pt-1">
                {!twoFaEnabled ? (
                  <Button onClick={handleEnable2FA} disabled={twoFaPending || !twoFaPassword}>
                    {twoFaPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                    Set Up 2FA
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleViewBackupCodes}
                      disabled={twoFaPending || !twoFaPassword}
                    >
                      {twoFaPending ? (
                        <Loader2 className="size-4 mr-2 animate-spin" />
                      ) : (
                        <Eye className="size-4 mr-2" />
                      )}
                      View Backup Codes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleRegenerateBackupCodes}
                      disabled={twoFaPending || !twoFaPassword}
                    >
                      {twoFaPending ? (
                        <Loader2 className="size-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="size-4 mr-2" />
                      )}
                      Regenerate Codes
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDisable2FA}
                      disabled={twoFaPending || !twoFaPassword}
                    >
                      {twoFaPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                      Disable 2FA
                    </Button>
                  </>
                )}
              </div>
            )}

            {twoFaStep === "setup" && (
              <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                <div>
                  <p className="text-sm font-medium mb-1">1. Open your authenticator app</p>
                  <p className="text-xs text-muted-foreground">
                    Google Authenticator, Authy, or any TOTP app.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">2. Enter this key manually</p>
                  <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
                    <code className="flex-1 text-sm font-mono tracking-widest break-all">
                      {totpSecret}
                    </code>
                    <CopyButton text={totpSecret} />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">3. Enter the 6-digit code</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="000000"
                      maxLength={6}
                      className="w-36 font-mono text-center tracking-widest"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                    />
                    <Button
                      onClick={handleVerifyTotp}
                      disabled={twoFaPending || verifyCode.length !== 6}
                    >
                      {twoFaPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Verify & Enable"
                      )}
                    </Button>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setTwoFaStep("idle"); setVerifyCode(""); }}
                >
                  Cancel
                </Button>
              </div>
            )}

            {twoFaStep === "backup" && backupCodes.length > 0 && (
              <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Backup Codes</p>
                  <CopyButton text={backupCodes.join("\n")} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Save these codes somewhere safe. Each can be used once if you lose access to
                  your authenticator app.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, i) => (
                    <code
                      key={i}
                      className="rounded-md bg-background border border-border px-3 py-1.5 text-sm font-mono text-center"
                    >
                      {code}
                    </code>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setTwoFaStep("idle"); setVerifyCode(""); }}
                >
                  Done
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
