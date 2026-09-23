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
import { reactivateAgentAction } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

export const ReactivateAgentModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "reactivateAgent";

  const { execute, isPending } = useServerAction(reactivateAgentAction, {
    onSuccess() {
      toast.success("Agent reactivated.");
      closeModal();
    },
    onError({ err }) {
      handleZSAError({ err, fallbackMessage: "Failed to reactivate agent" });
    },
  });

  async function handleReactivate() {
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
          <DialogTitle>Reactivate Agent</DialogTitle>
          <DialogDescription>
            Reactivate{" "}
            <span className="font-medium">
              {modalData?.agentName ?? "this agent"}
            </span>
            ? The agent will be able to authenticate again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleReactivate} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reactivate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
