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
import { deletePreferenceTemplateAction } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

export const DeletePreferenceTemplateModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "deletePreferenceTemplate";

  const label =
    modalData?.preferenceTemplateScope === "GLOBAL"
      ? "Global template"
      : `${modalData?.preferenceTemplateCountry ?? "this"} country template`;

  const { execute, isPending } = useServerAction(
    deletePreferenceTemplateAction,
    {
      onSuccess() {
        toast.success("Preference template deleted.");
        closeModal();
      },
      onError({ err }) {
        handleZSAError({
          err,
          fallbackMessage: "Failed to delete preference template",
        });
      },
    },
  );

  async function handleDelete() {
    if (!modalData?.preferenceTemplateId) return;

    await execute({
      payload: { id: modalData.preferenceTemplateId },
      transportOptions: {
        shouldRevalidate: true,
        url: "/admin/preference-templates",
      },
    });
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={closeModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Preference Template</DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete the{" "}
            <span className="font-medium">{label}</span>? This action cannot be
            undone.
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
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
