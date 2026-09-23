/**
 * DeleteScheduleModal — self-contained confirmation dialog for deleting a Schedule.
 *
 * Layer: client / telemedicine / admin / modals
 * Resource: Schedule
 *
 * Opens when the Zustand admin store's type === "deleteSchedule".
 * Reads scheduleId + scheduleLabel from store data. No props required.
 * Uses AlertDialog (destructive pattern) instead of Dialog/Sheet.
 * Mounted once inside ScheduleModalProvider.
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
import { deleteScheduleAction } from "@/modules/server/presentation/actions/schedule";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { useAdminStore } from "../../stores/admin.store";
import { scheduleKeys } from "../../queries/schedule.queries";

/**
 * Self-contained delete confirmation dialog.
 * Reads the target schedule id + label from the admin store, no external
 * props needed. Mounted once in ScheduleModalProvider.
 */
export function DeleteScheduleModal() {
  const isOpen = useAdminStore((s) => s.isOpen);
  const type = useAdminStore((s) => s.type);
  const data = useAdminStore((s) => s.data);
  const onClose = useAdminStore((s) => s.onClose);
  const queryClient = useQueryClient();

  const open = isOpen && type === "deleteSchedule";

  const { execute, isPending } = useServerAction(deleteScheduleAction, {
    onSuccess: () => {
      toast.success(`"${data?.scheduleLabel ?? "Schedule"}" deleted`);
      void queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      onClose();
    },
    onError: ({ err }) => {
      handleZSAError({ err, fallbackMessage: "Failed to delete schedule" });
    },
  });

  /** Executes the delete server action with revalidation so the table refreshes. */
  async function handleDelete() {
    if (!data?.scheduleId) return;
    await execute({
      payload: { id: data.scheduleId },
      transportOptions: {
        shouldRevalidate: true,
        url: "/telemedicine/admin/schedules",
      },
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to permanently delete{" "}
            <strong>{data?.scheduleLabel ?? "this schedule"}</strong>? This
            will remove the schedule, all its child records (identifiers,
            specialty, service type, service category, actors), and cascade
            to delete every Slot linked to it. This action cannot be undone.
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
