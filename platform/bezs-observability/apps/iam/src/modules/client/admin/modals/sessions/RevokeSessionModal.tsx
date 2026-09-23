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
import { revokeSessionAction } from "@/modules/server/presentation/actions/admin/sessions.action";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

export const RevokeSessionModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "revokeSession";

  const { execute, isPending } = useServerAction(revokeSessionAction, {
    onSuccess() {
      toast.success("Session revoked successfully.");
      closeModal();
    },
    onError({ err }) {
      handleZSAError({ err, fallbackMessage: "Failed to revoke session" });
    },
  });

  async function handleRevoke() {
    if (!modalData?.sessionToken) return;
    await execute({
      payload: { sessionToken: modalData.sessionToken },
      transportOptions: { shouldRevalidate: true, url: "/admin/sessions" },
    });
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={closeModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke Session</DialogTitle>
          <DialogDescription>
            This will immediately sign out this session. The user will need to log in again on that device.
            {modalData?.sessionIp && (
              <span className="block mt-1 text-xs font-medium">
                IP: {modalData.sessionIp}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRevoke} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Revoke Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
