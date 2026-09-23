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
import { revokeAllSessionsAction } from "@/modules/server/presentation/actions/admin/sessions.action";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

export const RevokeAllSessionsModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);

  const isModalOpen = isOpen && modalType === "revokeAllSessions";

  const { execute, isPending } = useServerAction(revokeAllSessionsAction, {
    onSuccess({ data }) {
      toast.success(`All sessions revoked. ${data.count} session(s) terminated.`);
      closeModal();
    },
    onError({ err }) {
      handleZSAError({ err, fallbackMessage: "Failed to revoke all sessions" });
    },
  });

  async function handleRevokeAll() {
    await execute({
      transportOptions: { shouldRevalidate: true, url: "/admin/sessions" },
    });
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={closeModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke All Sessions</DialogTitle>
          <DialogDescription>
            This will immediately terminate <span className="font-medium">all active sessions</span> for every user,
            including your own. Everyone will be signed out and will need to log in again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRevokeAll} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Revoke All Sessions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
