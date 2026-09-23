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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminStore } from "../../stores/admin.store";
import { useServerAction } from "zsa-react";
import { revokeHostAction } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

export const RevokeHostModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "revokeHost";

  const { execute, isPending } = useServerAction(revokeHostAction, {
    onSuccess() {
      toast.success("Host revoked.");
      closeModal();
    },
    onError({ err }) {
      handleZSAError({ err, fallbackMessage: "Failed to revoke host" });
    },
  });

  async function handleRevoke() {
    if (!modalData?.hostId) return;
    await execute({
      payload: { host_id: modalData.hostId },
      transportOptions: { shouldRevalidate: true, url: "/admin/agent-auth" },
    });
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={closeModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke Host</DialogTitle>
          <DialogDescription>
            Are you sure you want to revoke{" "}
            <span className="font-medium">
              {modalData?.hostName ?? "this host"}
            </span>
            ? All agents registered under this host will also be revoked. This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRevoke}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Revoke Host
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
