/**
 * DeleteOrganizationModal — self-contained confirmation dialog for deleting an Organization.
 *
 * Layer: client / telemedicine / admin / modals
 * Resource: Organization
 *
 * Opens when the Zustand admin store's type === "deleteOrganization".
 * Reads organizationId + organizationName from store data. No props required.
 * Uses AlertDialog (destructive pattern) instead of Dialog.
 * Mounted once inside OrganizationModalProvider.
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
import { deleteOrganizationAction } from "@/modules/server/presentation/actions/organization";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { useAdminStore } from "../../stores/admin.store";
import { organizationKeys } from "../../queries/organization.queries";

/**
 * Self-contained delete confirmation dialog.
 * Reads the target org id + name from the admin store, no external props needed.
 * Mounted once in OrganizationModalProvider.
 */
export function DeleteOrganizationModal() {
  const isOpen = useAdminStore((s) => s.isOpen);
  const type = useAdminStore((s) => s.type);
  const data = useAdminStore((s) => s.data);
  const onClose = useAdminStore((s) => s.onClose);
  const queryClient = useQueryClient();

  /** Only active when this specific modal type is set. */
  const open = isOpen && type === "deleteOrganization";

  const { execute, isPending } = useServerAction(deleteOrganizationAction, {
    onSuccess: () => {
      toast.success(`"${data?.organizationName ?? "Organization"}" deleted`);
      /** Invalidate all org list queries so the table removes the deleted row. */
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      onClose();
    },
    onError: ({ err }) => {
      handleZSAError({ err, fallbackMessage: "Failed to delete organization" });
    },
  });

  /**
   * Executes the delete server action with revalidation so the table refreshes.
   */
  async function handleDelete() {
    if (!data?.organizationId) return;
    await execute({
      payload: { id: data.organizationId },
      transportOptions: {
        shouldRevalidate: true,
        url: "/telemedicine/admin/organizations",
      },
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Organization</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to permanently delete{" "}
            <strong>{data?.organizationName ?? "this organization"}</strong>?
            This will remove the organization and all its child records (types,
            telecoms, addresses, contacts) from the FHIR server. This action
            cannot be undone.
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
