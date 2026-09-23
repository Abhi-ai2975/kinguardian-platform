/**
 * CancelAppointmentModal — self-contained confirmation dialog for cancelling an appointment.
 *
 * Layer: client / telemedicine / doctor / modals / appointments
 *
 * Opens when the doctor store's type === "cancelAppointment".
 * Reads the target appointment from store data. No props required.
 * Uses AlertDialog (destructive pattern) and calls updateAppointmentAction
 * with status "cancelled". Mounted once inside DoctorModalProvider.
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
import { updateAppointmentAction } from "@/modules/server/presentation/actions/appointment";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { useDoctorStore } from "../../stores/doctor.store";
import { doctorAppointmentKeys } from "../../component/appointments/list/appointmentQueries";

/**
 * Self-contained cancel confirmation dialog.
 * Reads the target appointment from the doctor store — no external props needed.
 * Mounted once in DoctorModalProvider.
 */
export function CancelAppointmentModal() {
  const isOpen = useDoctorStore((s) => s.isOpen);
  const type = useDoctorStore((s) => s.type);
  const data = useDoctorStore((s) => s.data);
  const onClose = useDoctorStore((s) => s.onClose);
  const queryClient = useQueryClient();

  /** Only active when this specific modal type is set. */
  const open = isOpen && type === "cancelAppointment";

  const { execute, isPending } = useServerAction(updateAppointmentAction, {
    onSuccess: () => {
      toast.success("Appointment cancelled");
      /** Invalidate all doctor appointment queries so the table refreshes. */
      void queryClient.invalidateQueries({ queryKey: doctorAppointmentKeys.all });
      onClose();
    },
    onError: ({ err }) => {
      handleZSAError({ err, fallbackMessage: "Failed to cancel appointment" });
    },
  });

  /**
   * Executes the cancel action — flips appointment status to "cancelled".
   */
  async function handleCancel() {
    if (!data?.appointment?.id) return;
    await execute({ payload: { id: data.appointment.id, status: "cancelled" } });
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel appointment?</AlertDialogTitle>
          <AlertDialogDescription>
            This will mark the appointment as cancelled. This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Keep Appointment</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Yes, Cancel
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
