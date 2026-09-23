/**
 * DeletePractitionerRoleModal — self-contained confirmation dialog for deleting a PractitionerRole.
 *
 * Layer: client / telemedicine / admin / modals
 * Resource: PractitionerRole
 *
 * Opens when the Zustand admin store's type === "deletePractitionerRole".
 * Reads practitionerRoleId + practitionerRoleLabel from store data. No props
 * required. Uses AlertDialog (destructive pattern) instead of Dialog/Sheet.
 * Mounted once inside PractitionerRoleModalProvider.
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
import { deletePractitionerRoleAction } from "@/modules/server/presentation/actions/practitioner-role";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { useAdminStore } from "../../stores/admin.store";
import { practitionerRoleKeys } from "../../queries/practitioner-role.queries";

/**
 * Self-contained delete confirmation dialog.
 * Reads the target role id + label from the admin store, no external props
 * needed. Mounted once in PractitionerRoleModalProvider.
 */
export function DeletePractitionerRoleModal() {
  const isOpen = useAdminStore((s) => s.isOpen);
  const type = useAdminStore((s) => s.type);
  const data = useAdminStore((s) => s.data);
  const onClose = useAdminStore((s) => s.onClose);
  const queryClient = useQueryClient();

  const open = isOpen && type === "deletePractitionerRole";

  const { execute, isPending } = useServerAction(deletePractitionerRoleAction, {
    onSuccess: () => {
      toast.success(`"${data?.practitionerRoleLabel ?? "Practitioner role"}" deleted`);
      void queryClient.invalidateQueries({ queryKey: practitionerRoleKeys.all });
      onClose();
    },
    onError: ({ err }) => {
      handleZSAError({ err, fallbackMessage: "Failed to delete practitioner role" });
    },
  });

  /** Executes the delete server action with revalidation so the table refreshes. */
  async function handleDelete() {
    if (!data?.practitionerRoleId) return;
    await execute({
      payload: { id: data.practitionerRoleId },
      transportOptions: {
        shouldRevalidate: true,
        url: "/telemedicine/admin/practitioner-roles",
      },
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Practitioner Role</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to permanently delete{" "}
            <strong>{data?.practitionerRoleLabel ?? "this practitioner role"}</strong>?
            This will remove the role and all its child records (codes,
            specialties, locations, healthcare services, characteristics,
            communication, contacts, availability, endpoints, identifiers)
            from the FHIR server. This action cannot be undone.
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
