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
import { impersonateUserAction } from "@/modules/server/presentation/actions/admin/users.action";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

export const ImpersonateUserModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "impersonateUser";

  const { execute, isPending } = useServerAction(impersonateUserAction, {
    onSuccess() {
      toast.success(`Now impersonating ${modalData?.userName ?? "user"}. Redirecting...`);
      closeModal();
    },
    onError({ err }) {
      handleZSAError({ err, fallbackMessage: "Failed to impersonate user" });
    },
  });

  async function handleImpersonate() {
    if (!modalData?.userId) return;
    await execute({
      payload: { userId: modalData.userId },
      transportOptions: { shouldRedirect: true, url: "/" },
    });
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={closeModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Impersonate User</DialogTitle>
          <DialogDescription>
            You will be logged in as{" "}
            <span className="font-medium">{modalData?.userName ?? "this user"}</span>.
            You will be redirected to the home page. To stop impersonating, log out
            and sign back in with your admin account.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleImpersonate} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Impersonate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
