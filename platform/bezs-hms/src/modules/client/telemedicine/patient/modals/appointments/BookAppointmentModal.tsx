/**
 * BookAppointmentModal — "How would you like to book?" chooser dialog.
 *
 * Layer: client / telemedicine / patient / modals / appointments
 *
 * Shown when the patient clicks "Book Appointment" in the appointments table.
 * Subscribes to the patient Zustand store — no props required.
 * Mounted once inside PatientModalProvider.
 *
 * Presents two paths:
 *   1. AI Intake Assistant → intakeHref  (guided chat / voice intake first)
 *   2. Manual Booking      → bookHref    (direct slot picker)
 *
 * UI mirrors drgodly-mvp BookAppointmentModal exactly.
 */

"use client";

import Link from "next/link";
import { Bot, Calendar, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePatientStore } from "../../stores/patient.store";

/**
 * Booking method chooser dialog.
 * Reads open state and hrefs from the patient Zustand store.
 * No props — controlled entirely by the store.
 */
export function BookAppointmentModal() {
  const isOpen = usePatientStore((s) => s.isOpen);
  const type = usePatientStore((s) => s.type);
  const data = usePatientStore((s) => s.data);
  const onClose = usePatientStore((s) => s.onClose);

  /** Only open when this specific modal type is active. */
  const open = isOpen && type === "bookAppointment";
  const bookHref = data?.bookHref ?? "";
  const intakeHref = data?.intakeHref ?? "";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="rounded-xl animate-in fade-in zoom-in-95 duration-200">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-2xl font-bold tracking-tight">
            How would you like to book?
          </DialogTitle>
          <DialogDescription>
            Choose the method that works best for you.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* ── Option 1: AI Intake Assistant ── */}
          <Card className="group relative h-full cursor-pointer border hover:border-primary/50 hover:shadow-md transition-all rounded-xl py-0">
            <Link href={intakeHref} className="py-6 block" onClick={onClose}>
              <CardHeader className="pb-2">
                <div className="mb-3 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 group-hover:scale-110 transition-transform duration-300">
                  <Bot className="h-6 w-6" />
                </div>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    AI Intake Assistant
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
                  >
                    New
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
                <p className="leading-relaxed">
                  Let our intelligent AI assistant guide you through the process
                  naturally. Perfect if you&apos;re unsure what you need or
                  prefer a conversation.
                </p>
                <div className="flex items-center text-sm font-medium text-primary">
                  Start Chat{" "}
                  <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Link>
          </Card>

          {/* ── Option 2: Manual Booking ── */}
          <Card className="group relative h-full cursor-pointer border hover:border-primary/50 hover:shadow-md transition-all rounded-xl py-0">
            <Link href={bookHref} className="py-6 block" onClick={onClose}>
              <CardHeader className="pb-2">
                <div className="mb-3 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                  Manual Booking
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
                <p className="leading-relaxed">
                  Fill out the standard form at your own pace. Best if you
                  already know exactly what you need and want to see all
                  available slots at a glance.
                </p>
                <div className="flex items-center text-sm font-medium text-primary">
                  Open Form{" "}
                  <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>

        <div className="mt-2 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>

        <p className="mt-2 text-center text-xs text-muted-foreground">
          By booking, you agree to our{" "}
          <span className="underline cursor-pointer hover:text-primary">
            Terms of Service
          </span>{" "}
          and{" "}
          <span className="underline cursor-pointer hover:text-primary">
            Privacy Policy
          </span>
          .
        </p>
      </DialogContent>
    </Dialog>
  );
}
