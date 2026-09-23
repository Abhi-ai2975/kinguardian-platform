"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useAdminStore } from "../../stores/admin.store";
import { useServerAction } from "zsa-react";
import { cancelSubscriptionAction } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

export const CancelSubscriptionModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(true);

  const isModalOpen = isOpen && modalType === "cancelSubscription";

  const { execute, isPending } = useServerAction(cancelSubscriptionAction, {
    onSuccess() {
      toast.success("Subscription cancelled.");
      closeModal();
    },
    onError({ err }) {
      handleZSAError({ err, fallbackMessage: "Failed to cancel subscription" });
    },
  });

  async function handleCancel() {
    if (!modalData?.subscriptionId) return;
    await execute({
      payload: {
        subscriptionId: modalData.subscriptionId,
        cancelAtPeriodEnd,
      },
      transportOptions: { shouldRevalidate: true, url: "/admin/billing" },
    });
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={closeModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Subscription</DialogTitle>
          <DialogDescription>
            Cancel the{" "}
            <span className="font-medium capitalize">
              {modalData?.subscriptionPlan ?? "subscription"}
            </span>{" "}
            plan for{" "}
            <span className="font-medium">
              {modalData?.subscriptionUserEmail ?? "this user"}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-md border p-4">
          <Switch
            id="cancel-at-period-end"
            checked={cancelAtPeriodEnd}
            onCheckedChange={setCancelAtPeriodEnd}
          />
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="cancel-at-period-end" className="cursor-pointer">
              Cancel at period end
            </Label>
            <p className="text-xs text-muted-foreground">
              {cancelAtPeriodEnd
                ? "Access continues until the current billing period ends."
                : "Access is revoked immediately — no refund is issued."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={isPending}>
            Keep subscription
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cancel subscription
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
