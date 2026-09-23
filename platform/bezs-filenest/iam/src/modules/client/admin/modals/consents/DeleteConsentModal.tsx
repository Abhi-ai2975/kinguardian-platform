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
import { deleteConsentAction } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

export const DeleteConsentModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "deleteConsent";

  const { execute, isPending } = useServerAction(deleteConsentAction, {
    onSuccess() {
      toast.success("Consent revoked.");
      closeModal();
    },
    onError({ err }) {
      handleZSAError({ err, fallbackMessage: "Failed to revoke consent" });
    },
  });

  async function handleDelete() {
    if (!modalData?.consentId) return;
    await execute({
      payload: { id: modalData.consentId },
      transportOptions: { shouldRevalidate: true, url: "/admin/consents" },
    });
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={closeModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke Consent</DialogTitle>
          <DialogDescription>
            Are you sure you want to revoke this consent?{" "}
            {modalData?.consentClientId && (
              <>
                Client:{" "}
                <span className="font-mono text-xs">
                  {modalData.consentClientId}
                </span>
                .{" "}
              </>
            )}
            The user will need to re-authorize the next time they use this
            client. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
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
