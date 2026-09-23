/**
 * DeleteLocationModal — self-contained confirmation dialog for deleting a Location.
 *
 * Layer: client / telemedicine / admin / modals
 * Resource: Location
 *
 * Opens when the Zustand admin store's type === "deleteLocation".
 * Reads locationId + locationName from store data. No props required.
 * Uses AlertDialog (destructive pattern) instead of Dialog/Sheet.
 * Mounted once inside LocationModalProvider.
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
import { deleteLocationAction } from "@/modules/server/presentation/actions/location";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { useAdminStore } from "../../stores/admin.store";
import { locationKeys } from "../../queries/location.queries";

/**
 * Self-contained delete confirmation dialog.
 * Reads the target location id + name from the admin store, no external
 * props needed. Mounted once in LocationModalProvider.
 */
export function DeleteLocationModal() {
  const isOpen = useAdminStore((s) => s.isOpen);
  const type = useAdminStore((s) => s.type);
  const data = useAdminStore((s) => s.data);
  const onClose = useAdminStore((s) => s.onClose);
  const queryClient = useQueryClient();

  const open = isOpen && type === "deleteLocation";

  const { execute, isPending } = useServerAction(deleteLocationAction, {
    onSuccess: () => {
      toast.success(`"${data?.locationName ?? "Location"}" deleted`);
      void queryClient.invalidateQueries({ queryKey: locationKeys.all });
      onClose();
    },
    onError: ({ err }) => {
      handleZSAError({ err, fallbackMessage: "Failed to delete location" });
    },
  });

  /** Executes the delete server action with revalidation so the table refreshes. */
  async function handleDelete() {
    if (!data?.locationId) return;
    await execute({
      payload: { id: data.locationId },
      transportOptions: {
        shouldRevalidate: true,
        url: "/telemedicine/admin/locations",
      },
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Location</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to permanently delete{" "}
            <strong>{data?.locationName ?? "this location"}</strong>? This
            will remove the location and all its child records (identifiers,
            types, telecoms, hours of operation, endpoints) from the FHIR
            server. This action cannot be undone.
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
