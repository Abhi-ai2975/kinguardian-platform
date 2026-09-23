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
import { deleteResourceActionAction } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

export const DeleteResourceActionModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "deleteResourceAction";

  const { execute, isPending } = useServerAction(deleteResourceActionAction, {
    onSuccess() {
      toast.success("Resource action deleted successfully.");
      closeModal();
    },
    onError({ err }) {
      handleZSAError({
        err,
        fallbackMessage: "Failed to delete resource action",
      });
    },
  });

  async function handleDelete() {
    if (!modalData?.resourceActionId) return;
    await execute({
      payload: { id: modalData.resourceActionId },
      transportOptions: {
        shouldRevalidate: true,
        url: "/admin/resource-actions",
      },
    });
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={closeModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Resource Action</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-semibold">
              {modalData?.resourceActionKey ?? "this action"}
            </span>
            ? Any menu nodes using this permission key will become publicly
            visible. This action cannot be undone.
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
            Delete Action
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
