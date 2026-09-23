/**
 * IntakeCompleteModal — shown after the patient finishes an intake session.
 *
 * Layer: client / telemedicine / patient / intake
 *
 * UI mirrors drgodly-mvp IntakeCompleteModal exactly:
 *   - Large CheckCircle2 success icon in a green circle
 *   - "Intake Session Completed" title
 *   - "Book Appointment" full-width link button (h-12)
 *   - "Maybe Later" ghost button
 *
 * "Book Appointment" navigates to the booking wizard with ?intake_id={id}
 * so the wizard can link the booked FHIR appointment back to this intake.
 */

"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { CalendarCheck, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

/** Props for IntakeCompleteModal. */
interface IntakeCompleteModalProps {
  /** Controls dialog visibility. */
  open: boolean;
  /** Local Intake.id returned from createIntakeAction / updateIntakeAction. */
  intakeId: number;
  /** Localised base path for building the booking link, e.g. "/en/bezs/telemedicine/patient". */
  basePath: string;
}

/**
 * Post-intake completion modal.
 *
 * @param open - Whether the dialog is visible.
 * @param intakeId - The completed intake's local ID.
 * @param basePath - Locale-prefixed base path for navigation.
 */
export function IntakeCompleteModal({ open, intakeId, basePath }: IntakeCompleteModalProps) {
  const router = useRouter();

  function handleClose() {
    router.push(`${basePath}/appointments`);
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent
        /** Prevent accidental dismissal — force an explicit choice. */
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="sm:max-w-md border-0 shadow-dialog animate-scale-in"
      >
        <DialogHeader className="text-center sm:text-center space-y-4">
          {/* Success icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 animate-fade-in">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>

          <DialogTitle className="text-xl font-semibold text-foreground">
            Intake Session Completed
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base">
            Great job! Your intake session is now complete. Would you like to
            book an appointment with the doctor?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col gap-3 sm:flex-col mt-6">
          {/* Book appointment — Link so the browser handles the navigation */}
          <Link
            href={`${basePath}/appointments/book?intake_id=${intakeId}`}
            className={cn(
              buttonVariants(),
              "w-full gap-2 h-12 text-base font-medium",
            )}
          >
            <CalendarCheck className="h-5 w-5" />
            Book Appointment
          </Link>

          <Button
            variant="ghost"
            onClick={handleClose}
            className="w-full h-11 text-muted-foreground hover:text-foreground"
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
