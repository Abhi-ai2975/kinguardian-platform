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
import { revokeUserSessionsAction } from "@/modules/server/presentation/actions/admin/users.action";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

export const RevokeUserSessionsModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "revokeUserSessions";

  const { execute, isPending } = useServerAction(revokeUserSessionsAction, {
    onSuccess() {
      toast.success("All sessions revoked.");
      closeModal();
    },
    onError({ err }) {
      handleZSAError({ err, fallbackMessage: "Failed to revoke sessions" });
    },
  });

  async function handleRevoke() {
    if (!modalData?.userId) return;
    await execute({
      payload: { userId: modalData.userId },
      transportOptions: { shouldRevalidate: true, url: "/admin/users" },
    });
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={closeModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke All Sessions</DialogTitle>
          <DialogDescription>
            This will immediately sign out{" "}
            <span className="font-medium">{modalData?.userName ?? "this user"}</span>{" "}
            from all devices. They will need to log in again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRevoke} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Revoke All Sessions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
