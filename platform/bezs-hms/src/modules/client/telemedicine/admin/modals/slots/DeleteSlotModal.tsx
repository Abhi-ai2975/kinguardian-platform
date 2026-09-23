/**
 * DeleteSlotModal — self-contained confirmation dialog for deleting a Slot.
 *
 * Layer: client / telemedicine / admin / modals
 * Resource: Slot
 *
 * Opens when the Zustand admin store's type === "deleteSlot".
 * Reads slotId + slotLabel from store data. No props required.
 * Uses AlertDialog (destructive pattern) instead of Dialog/Sheet.
 * Mounted once inside SlotModalProvider.
 */

"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { deleteSlotAction } from "@/modules/server/presentation/actions/slot";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { useAdminStore } from "../../stores/admin.store";
import { slotKeys } from "../../queries/slot.queries";

/**
 * Self-contained delete confirmation dialog.
 * Reads the target slot id + label from the admin store, no external props
 * needed. Mounted once in SlotModalProvider.
 */
export function DeleteSlotModal() {
  const isOpen = useAdminStore((s) => s.isOpen);
  const type = useAdminStore((s) => s.type);
  const data = useAdminStore((s) => s.data);
  const onClose = useAdminStore((s) => s.onClose);
  const queryClient = useQueryClient();

  const open = isOpen && type === "deleteSlot";

  const { execute, isPending } = useServerAction(deleteSlotAction, {
    onSuccess: () => {
      toast.success(`"${data?.slotLabel ?? "Slot"}" deleted`);
      void queryClient.invalidateQueries({ queryKey: slotKeys.all });
      onClose();
    },
    onError: ({ err }) => {
      handleZSAError({ err, fallbackMessage: "Failed to delete slot" });
    },
  });

  /** Executes the delete server action with revalidation so the table refreshes. */
  async function handleDelete() {
    if (!data?.slotId) return;
    await execute({
      payload: { id: data.slotId },
      transportOptions: {
        shouldRevalidate: true,
        url: "/telemedicine/admin/slots",
      },
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Slot</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to permanently delete{" "}
            <strong>{data?.slotLabel ?? "this slot"}</strong>? This will
            remove the slot and all its child records (identifiers,
            specialty, service type, service category) from the FHIR server.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
