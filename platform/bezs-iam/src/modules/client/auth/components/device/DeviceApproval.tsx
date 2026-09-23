"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useServerAction } from "zsa-react";
import { approveCapabilityAction } from "@/modules/server/presentation/actions/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bot, Check, X, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export interface ApprovalInfo {
  approvalId: string;
  agentId: string | null;
  agentName: string | null;
  capabilities: string[];
  bindingMessage: string | null;
  expiresAt: Date;
}

interface DeviceApprovalProps {
  prefillCode?: string;
  approvalInfo?: ApprovalInfo | null;
}

export function DeviceApproval({ prefillCode, approvalInfo }: DeviceApprovalProps) {
  const router = useRouter();
  const [userCode, setUserCode] = useState(prefillCode ?? "");
  const [done, setDone] = useState(false);
  const [doneAction, setDoneAction] = useState<"approved" | "denied">("approved");

  const { execute, isPending } = useServerAction(approveCapabilityAction);

  async function handleAction(action: "approve" | "deny") {
    const payload = approvalInfo
      ? {
          approval_id: approvalInfo.approvalId,
          agent_id: approvalInfo.agentId ?? undefined,
          action,
          capabilities: approvalInfo.capabilities.length > 0
            ? approvalInfo.capabilities
            : undefined,
        }
      : {
          user_code: userCode.trim().toUpperCase(),
          action,
        };

    const [, err] = await execute({ payload });
    if (err) {
      toast.error(action === "approve" ? "Failed to approve" : "Failed to deny", {
        description: err.message,
      });
      return;
    }
    setDoneAction(action === "approve" ? "approved" : "denied");
    setDone(true);
  }

  if (done) {
    return (
      <Card className="mx-auto w-full max-w-sm text-center">
        <CardContent className="pt-8 pb-6 flex flex-col items-center gap-4">
          {doneAction === "approved" ? (
            <>
              <div className="bg-emerald-500/10 rounded-full p-4">
                <ShieldCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="font-semibold text-lg">Access approved</p>
              <p className="text-sm text-muted-foreground">
                The agent now has access to the requested capabilities. You can close this tab.
              </p>
            </>
          ) : (
            <>
              <div className="bg-rose-500/10 rounded-full p-4">
                <X className="h-8 w-8 text-rose-600 dark:text-rose-400" />
              </div>
              <p className="font-semibold text-lg">Access denied</p>
              <p className="text-sm text-muted-foreground">
                The agent request was denied. You can close this tab.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  if (approvalInfo) {
    const isExpired = new Date(approvalInfo.expiresAt) < new Date();

    if (isExpired) {
      return (
        <Card className="mx-auto w-full max-w-sm border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle>Request expired</CardTitle>
            </div>
            <CardDescription>
              This authorization request has expired. Ask the agent to restart the flow.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" className="w-full" onClick={() => router.back()}>
              Go back
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return (
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-2">
            <Bot className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-xl">{approvalInfo.agentName ?? "An agent"}</CardTitle>
          <CardDescription className="mt-1">
            is requesting access to your account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {approvalInfo.bindingMessage && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              <p className="text-sm font-mono text-amber-700 dark:text-amber-400">
                {approvalInfo.bindingMessage}
              </p>
            </div>
          )}

          {approvalInfo.capabilities.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Requested capabilities</p>
              <div className="flex flex-wrap gap-2">
                {approvalInfo.capabilities.map((cap) => (
                  <Badge key={cap} variant="secondary" className="font-mono text-xs">
                    {cap}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-800 dark:hover:bg-rose-950"
            disabled={isPending}
            onClick={() => handleAction("deny")}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            Deny
          </Button>
          <Button
            className="flex-1"
            disabled={isPending}
            onClick={() => handleAction("approve")}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Approve
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-2">
          <Bot className="h-7 w-7 text-primary" />
        </div>
        <CardTitle>Approve agent access</CardTitle>
        <CardDescription>
          Enter the code shown on your device or agent terminal.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="userCode">Device code</Label>
          <Input
            id="userCode"
            value={userCode}
            onChange={(e) => setUserCode(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX"
            className="text-center font-mono text-lg tracking-widest"
            maxLength={9}
          />
        </div>
      </CardContent>

      <CardFooter className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          disabled={!userCode.trim() || isPending}
          onClick={() => handleAction("deny")}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          Deny
        </Button>
        <Button
          className="flex-1"
          disabled={!userCode.trim() || isPending}
          onClick={() => handleAction("approve")}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Approve
        </Button>
      </CardFooter>
    </Card>
  );
}
