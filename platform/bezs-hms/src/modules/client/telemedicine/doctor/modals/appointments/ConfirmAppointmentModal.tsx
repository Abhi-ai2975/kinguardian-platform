/**
 * ConfirmAppointmentModal — self-contained confirmation dialog for confirming a pending appointment.
 *
 * Layer: client / telemedicine / doctor / modals / appointments
 *
 * Opens when the doctor store's type === "confirmAppointment".
 * Reads the target appointment from store data. No props required.
 * Uses AlertDialog and calls updateAppointmentAction with status "booked"
 * (pending → booked). Mounted once inside DoctorModalProvider.
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
 * Self-contained confirm appointment dialog.
 * Flips a pending appointment to booked status.
 * Reads the target appointment from the doctor store — no external props needed.
 * Mounted once in DoctorModalProvider.
 */
export function ConfirmAppointmentModal() {
  const isOpen = useDoctorStore((s) => s.isOpen);
  const type = useDoctorStore((s) => s.type);
  const data = useDoctorStore((s) => s.data);
  const onClose = useDoctorStore((s) => s.onClose);
  const queryClient = useQueryClient();

  /** Only active when this specific modal type is set. */
  const open = isOpen && type === "confirmAppointment";

  const { execute, isPending } = useServerAction(updateAppointmentAction, {
    onSuccess: () => {
      toast.success("Appointment confirmed");
      /** Invalidate all doctor appointment queries so the table refreshes. */
      void queryClient.invalidateQueries({ queryKey: doctorAppointmentKeys.all });
      onClose();
    },
    onError: ({ err }) => {
      handleZSAError({ err, fallbackMessage: "Failed to confirm appointment" });
    },
  });

  /**
   * Executes the confirm action — flips appointment status from pending to booked.
   */
  async function handleConfirm() {
    if (!data?.appointment?.id) return;
    await execute({ payload: { id: data.appointment.id, status: "booked" } });
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm appointment?</AlertDialogTitle>
          <AlertDialogDescription>
            This will move the appointment from{" "}
            <strong>Pending</strong> to <strong>Booked</strong>. The patient
            will be notified.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Not yet</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
