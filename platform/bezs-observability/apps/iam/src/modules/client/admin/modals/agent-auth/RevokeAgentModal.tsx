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
import { revokeAgentAction } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

export const RevokeAgentModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "revokeAgent";

  const { execute, isPending } = useServerAction(revokeAgentAction, {
    onSuccess() {
      toast.success("Agent revoked.");
      closeModal();
    },
    onError({ err }) {
      handleZSAError({ err, fallbackMessage: "Failed to revoke agent" });
    },
  });

  async function handleRevoke() {
    if (!modalData?.agentId) return;
    await execute({
      payload: { agent_id: modalData.agentId },
      transportOptions: { shouldRevalidate: true, url: "/admin/agent-auth" },
    });
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={closeModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke Agent</DialogTitle>
          <DialogDescription>
            Are you sure you want to revoke{" "}
            <span className="font-medium">
              {modalData?.agentName ?? "this agent"}
            </span>
            ? The agent will no longer be able to authenticate. You can
            reactivate it later.
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
            Revoke
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
