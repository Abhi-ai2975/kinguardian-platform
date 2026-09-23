/**
 * CancelAppointmentModal — self-contained confirmation dialog for cancelling an appointment.
 *
 * Layer: client / telemedicine / patient / modals / appointments
 *
 * Opens when the patient store's type === "cancelAppointment".
 * Reads the target appointment from store data. No props required.
 * Uses AlertDialog (destructive pattern) and calls updateAppointmentAction
 * with status "cancelled". Mounted once inside PatientModalProvider.
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
import { usePatientStore } from "../../stores/patient.store";
import { patientAppointmentKeys } from "../../component/appointments/list/appointmentQueries";

/**
 * Self-contained cancel confirmation dialog.
 * Reads the target appointment from the patient store — no external props needed.
 * Mounted once in PatientModalProvider.
 */
export function CancelAppointmentModal() {
  const isOpen = usePatientStore((s) => s.isOpen);
  const type = usePatientStore((s) => s.type);
  const data = usePatientStore((s) => s.data);
  const onClose = usePatientStore((s) => s.onClose);
  const queryClient = useQueryClient();

  /** Only active when this specific modal type is set. */
  const open = isOpen && type === "cancelAppointment";

  const { execute, isPending } = useServerAction(updateAppointmentAction, {
    onSuccess: () => {
      toast.success("Appointment cancelled");
      /** Invalidate all patient appointment queries so the table refreshes. */
      void queryClient.invalidateQueries({ queryKey: patientAppointmentKeys.all });
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
            This will mark the appointment as cancelled. You can rebook at any
            time. This action cannot be undone.
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
