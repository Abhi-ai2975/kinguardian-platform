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
import { removeTeamAction } from "@/modules/server/presentation/actions/admin/organizations.action";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

export const RemoveTeamModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "removeTeam";

  const { execute, isPending } = useServerAction(removeTeamAction, {
    onSuccess() {
      toast.success("Team removed successfully.");
      closeModal();
    },
    onError({ err }) {
      handleZSAError({ err, fallbackMessage: "Failed to remove team" });
    },
  });

  async function handleRemove() {
    if (!modalData?.teamId || !modalData?.organizationId) return;
    await execute({
      payload: { teamId: modalData.teamId, organizationId: modalData.organizationId },
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
          <DialogTitle>Remove Team</DialogTitle>
          <DialogDescription>
            Delete the team <span className="font-semibold">{modalData?.teamName}</span>? All team
            members will be removed from this team.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRemove} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Remove Team
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
