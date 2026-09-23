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
import { removeTeamMemberAction } from "@/modules/server/presentation/actions/admin/organizations.action";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

export const RemoveTeamMemberModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "removeTeamMember";

  const { execute, isPending } = useServerAction(removeTeamMemberAction, {
    onSuccess() {
      toast.success("Member removed from team.");
      closeModal();
    },
    onError({ err }) {
      handleZSAError({ err, fallbackMessage: "Failed to remove team member" });
    },
  });

  async function handleRemove() {
    if (!modalData?.teamMemberId || !modalData?.organizationId) return;
    await execute({
      payload: { teamMemberId: modalData.teamMemberId, organizationId: modalData.organizationId },
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
          <DialogTitle>Remove from Team</DialogTitle>
          <DialogDescription>
            Remove <span className="font-semibold">{modalData?.memberName}</span> from{" "}
            <span className="font-semibold">{modalData?.teamName}</span>?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRemove} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Remove from Team
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
