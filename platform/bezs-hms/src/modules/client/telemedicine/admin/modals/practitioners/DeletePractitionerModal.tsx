/**
 * DeletePractitionerModal — self-contained confirmation dialog for deleting a Practitioner.
 *
 * Layer: client / telemedicine / admin / modals
 * Resource: Practitioner
 *
 * Opens when the Zustand admin store's type === "deletePractitioner".
 * Reads practitionerId + practitionerLabel from store data. No props
 * required. Uses AlertDialog (destructive pattern) instead of Dialog/Sheet.
 * Mounted once inside PractitionerModalProvider.
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
import { deletePractitionerAction } from "@/modules/server/presentation/actions/practitioner";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { useAdminStore } from "../../stores/admin.store";
import { practitionerKeys } from "../../queries/practitioner.queries";

/**
 * Self-contained delete confirmation dialog.
 * Reads the target practitioner id + label from the admin store, no
 * external props needed. Mounted once in PractitionerModalProvider.
 */
export function DeletePractitionerModal() {
  const isOpen = useAdminStore((s) => s.isOpen);
  const type = useAdminStore((s) => s.type);
  const data = useAdminStore((s) => s.data);
  const onClose = useAdminStore((s) => s.onClose);
  const queryClient = useQueryClient();

  const open = isOpen && type === "deletePractitioner";

  const { execute, isPending } = useServerAction(deletePractitionerAction, {
    onSuccess: () => {
      toast.success(`"${data?.practitionerLabel ?? "Practitioner"}" deleted`);
      void queryClient.invalidateQueries({ queryKey: practitionerKeys.all });
      onClose();
    },
    onError: ({ err }) => {
      handleZSAError({ err, fallbackMessage: "Failed to delete practitioner" });
    },
  });

  /** Executes the delete server action with revalidation so the table refreshes. */
  async function handleDelete() {
    if (!data?.practitionerId) return;
    await execute({
      payload: { id: data.practitionerId },
      transportOptions: {
        shouldRevalidate: true,
        url: "/telemedicine/admin/practitioners",
      },
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Practitioner</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to permanently delete{" "}
            <strong>{data?.practitionerLabel ?? "this practitioner"}</strong>?
            This will remove the practitioner and all its child records
            (names, identifiers, telecom, addresses, photos, qualifications,
            communications) from the FHIR server. This action cannot be
            undone. Any PractitionerRole records linked to this practitioner
            will be left with a dangling reference.
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
