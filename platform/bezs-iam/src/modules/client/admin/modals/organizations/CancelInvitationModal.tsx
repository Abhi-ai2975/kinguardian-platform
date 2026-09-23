"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAdminStore } from "../../stores/admin.store";
import { useServerAction } from "zsa-react";
import { cancelInvitationAction } from "@/modules/server/presentation/actions/admin/organizations.action";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

export const CancelInvitationModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "cancelInvitation";

  const { execute, isPending } = useServerAction(cancelInvitationAction, {
    onSuccess() {
      toast.success("Invitation cancelled.");
      closeModal();
    },
    onError({ err }) {
      handleZSAError({ err, fallbackMessage: "Failed to cancel invitation" });
    },
  });

  async function handleCancel() {
    if (!modalData?.invitationId || !modalData?.organizationId) return;
    await execute({
      payload: { invitationId: modalData.invitationId, organizationId: modalData.organizationId },
      transportOptions: {
        shouldRevalidate: true,
        url: `/admin/organizations/${modalData.organizationId}`,
      },
    });
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={closeModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Invitation</DialogTitle>
          <DialogDescription>
            Cancel the pending invitation for{" "}
            <span className="font-semibold">{modalData?.invitationEmail}</span>? They will no longer
            be able to join.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={isPending}>
            Keep Invitation
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cancel Invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
