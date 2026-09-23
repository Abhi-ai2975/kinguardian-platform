/**
 * DeleteHealthcareServiceModal — self-contained confirmation dialog for
 * deleting a HealthcareService.
 *
 * Layer: client / telemedicine / admin / modals
 * Resource: HealthcareService
 *
 * Opens when the Zustand admin store's type === "deleteHealthcareService".
 * Reads healthcareServiceId + healthcareServiceName from store data. No
 * props required. Uses AlertDialog (destructive pattern) instead of Sheet.
 * Mounted once inside HealthcareServiceModalProvider.
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
import { deleteHealthcareServiceAction } from "@/modules/server/presentation/actions/healthcare-service";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { useAdminStore } from "../../stores/admin.store";
import { healthcareServiceKeys } from "../../queries/healthcare-service.queries";

/**
 * Self-contained delete confirmation dialog.
 * Reads the target healthcare service id + name from the admin store, no
 * external props needed. Mounted once in HealthcareServiceModalProvider.
 */
export function DeleteHealthcareServiceModal() {
  const isOpen = useAdminStore((s) => s.isOpen);
  const type = useAdminStore((s) => s.type);
  const data = useAdminStore((s) => s.data);
  const onClose = useAdminStore((s) => s.onClose);
  const queryClient = useQueryClient();

  const open = isOpen && type === "deleteHealthcareService";

  const { execute, isPending } = useServerAction(deleteHealthcareServiceAction, {
    onSuccess: () => {
      toast.success(`"${data?.healthcareServiceName ?? "Healthcare service"}" deleted`);
      void queryClient.invalidateQueries({ queryKey: healthcareServiceKeys.all });
      onClose();
    },
    onError: ({ err }) => {
      handleZSAError({ err, fallbackMessage: "Failed to delete healthcare service" });
    },
  });

  /** Executes the delete server action with revalidation so the table refreshes. */
  async function handleDelete() {
    if (!data?.healthcareServiceId) return;
    await execute({
      payload: { id: data.healthcareServiceId },
      transportOptions: {
        shouldRevalidate: true,
        url: "/telemedicine/admin/healthcare-services",
      },
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Healthcare Service</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to permanently delete{" "}
            <strong>{data?.healthcareServiceName ?? "this healthcare service"}</strong>?
            This will remove the service and all its child records
            (identifiers, categories, types, locations, telecoms, etc.) from
            the FHIR server. This action cannot be undone.
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
