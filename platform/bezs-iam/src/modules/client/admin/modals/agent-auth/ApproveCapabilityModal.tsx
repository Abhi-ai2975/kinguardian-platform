"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import { useRef } from "react";
import { useAdminStore } from "../../stores/admin.store";
import { useServerAction } from "zsa-react";
import { approveCapabilityAction } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

export const ApproveCapabilityModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "approveCapability";
  const pendingActionRef = useRef<"approve" | "deny">("approve");

  const { execute, isPending } = useServerAction(approveCapabilityAction, {
    onSuccess() {
      toast.success(
        pendingActionRef.current === "approve"
          ? "Capabilities approved."
          : "Capabilities denied.",
      );
      closeModal();
    },
    onError({ err }) {
      handleZSAError({ err, fallbackMessage: "Failed to process approval" });
    },
  });

  async function handleAction(action: "approve" | "deny") {
    pendingActionRef.current = action;
    await execute({
      payload: {
        approval_id: modalData?.approvalId,
        agent_id: modalData?.approvalAgentId,
        action,
        capabilities: modalData?.approvalCapabilities,
      },
      transportOptions: {
        shouldRevalidate: true,
        url: "/admin/agent-auth",
      },
    });
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={closeModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Capability Approval Request</DialogTitle>
          <DialogDescription>
            Agent{" "}
            <span className="font-medium">
              {modalData?.approvalAgentName ?? modalData?.approvalAgentId ?? "Unknown"}
            </span>{" "}
            is requesting the following capabilities.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {modalData?.approvalBindingMessage && (
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground mb-1">
                Binding Message
              </p>
              <p className="text-sm font-medium">
                {modalData.approvalBindingMessage}
              </p>
            </div>
          )}

          <div className="rounded-md border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground mb-2">
              Requested Capabilities
            </p>
            <div className="flex flex-wrap gap-1">
              {(modalData?.approvalCapabilities ?? []).map((cap) => (
                <Badge
                  key={cap}
                  className={cn(
                    buttonVariants({ size: "sm", variant: "default" }),
                    "cursor-default h-6 rounded-lg text-xs bg-primary/15 text-primary hover:bg-primary/20",
                  )}
                >
                  {cap}
                </Badge>
              ))}
            </div>
          </div>

          {modalData?.approvalMethod && (
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground mb-1">Method</p>
              <p className="text-sm capitalize">
                {modalData.approvalMethod === "device_authorization"
                  ? "Device Authorization"
                  : "CIBA"}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={closeModal} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleAction("deny")}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            Deny
          </Button>
          <Button
            onClick={() => handleAction("approve")}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
