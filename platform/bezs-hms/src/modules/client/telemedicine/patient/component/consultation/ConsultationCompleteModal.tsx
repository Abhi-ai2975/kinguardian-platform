/**
 * ConsultationCompleteModal — shown after the patient finishes an AI consultation.
 *
 * Layer: client / telemedicine / patient / component / consultation
 *
 * Similar to IntakeCompleteModal but with an optional follow-up CTA:
 *   - Large CheckCircle2 success icon in a green circle
 *   - "Book a Follow-up" link button (optional — doctors are not required)
 *   - "Go to My Appointments" ghost button
 *
 * Prevents accidental dismissal (no outside-click / Escape) to force an
 * explicit choice.
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

/** Props for ConsultationCompleteModal. */
interface ConsultationCompleteModalProps {
  /** Controls dialog visibility. */
  open: boolean;
  /** Localised base path for post-consultation navigation, e.g. "/en/bezs/telemedicine/patient". */
  basePath: string;
}

/**
 * Post-consultation completion modal.
 *
 * @param open - Whether the dialog is visible.
 * @param basePath - Locale-prefixed base path for navigation.
 */
export function ConsultationCompleteModal({
  open,
  basePath,
}: ConsultationCompleteModalProps) {
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
            Consultation Completed
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base">
            Your AI consultation is complete. You can book an appointment with a
            doctor to discuss the findings, or review your appointments.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col gap-3 sm:flex-col mt-6">
          {/* Book follow-up appointment (optional) */}
          <Link
            href={`${basePath}/appointments/book`}
            className={cn(
              buttonVariants(),
              "w-full gap-2 h-12 text-base font-medium",
            )}
          >
            <CalendarCheck className="h-5 w-5" />
            Book a Follow-up Appointment
          </Link>

          <Button
            variant="ghost"
            onClick={handleClose}
            className="w-full h-11 text-muted-foreground hover:text-foreground"
          >
            Go to My Appointments
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
