/**
 * RescheduleAppointmentModal — dialog for rescheduling an appointment on the doctor portal.
 *
 * Layer: client / telemedicine / doctor / modals / appointments
 *
 * Opens when the doctor store's type === "rescheduleAppointment".
 * Fetches free FHIR Slots for the appointment's practitioner, then renders
 * the same DateScroller + time-slot grid used in the patient booking wizard (Step 2).
 *
 * Data flow:
 *   1. Extract practitioner_id from appointment.participant.
 *   2. listPractitionerRolesAction({ practitioner_id }) → practitioner_role_id.
 *   3. listSlotsAction({ practitioner_role_id, status: "free" }) → free slots.
 *   4. User picks date → slot → updateAppointmentAction({ id, start, end }).
 *
 * Mounted once inside DoctorModalProvider. No props required.
 */

"use client";

import { useMemo, useState, useEffect } from "react";
import { Clock, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerActionQuery } from "@/lib/zsa-query";
import { rescheduleAppointmentAction } from "@/modules/server/presentation/actions/appointment";
import { listPractitionerRolesAction } from "@/modules/server/presentation/actions/practitioner-role";
import { listSlotsAction } from "@/modules/server/presentation/actions/slot";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { DateScroller } from "@/modules/client/telemedicine/patient/component/appointments/book/DateScroll";
import { useDoctorStore } from "../../stores/doctor.store";
import { doctorAppointmentKeys } from "../../component/appointments/list/appointmentQueries";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";
import type { TSlotResponse } from "@/modules/entities/schemas/slot";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Formats a slot's start datetime as a readable time string (e.g. "2:30 PM").
 *
 * @param slot - FHIR Slot response object.
 * @returns Formatted local time string, or empty string if start is absent.
 */
function getSlotTime(slot: TSlotResponse): string {
  if (!slot.start) return "";
  return new Date(slot.start).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Derives slot duration in minutes from start and end.
 *
 * @param slot - FHIR Slot response object.
 * @returns Duration in minutes, or null if either field is absent.
 */
function getSlotDuration(slot: TSlotResponse): number | null {
  if (!slot.start || !slot.end) return null;
  return Math.round(
    (new Date(slot.end).getTime() - new Date(slot.start).getTime()) / 60_000,
  );
}

/**
 * Resolves the treating practitioner's display name from the participant array.
 *
 * @param appointment - FHIR Appointment response, may be null.
 * @returns Display name string, or "Doctor" fallback.
 */
function getDoctorName(appointment: TAppointmentResponse | null | undefined): string {
  return (
    appointment?.participant?.find((p) => p.reference_type === "Practitioner")
      ?.reference_display ?? "Doctor"
  );
}

/**
 * Resolves the treating practitioner's integer FHIR ID from the participant array.
 *
 * @param appointment - FHIR Appointment response, may be null.
 * @returns Practitioner integer ID, or null if not found.
 */
function getPractitionerId(
  appointment: TAppointmentResponse | null | undefined,
): number | null {
  return (
    appointment?.participant?.find((p) => p.reference_type === "Practitioner")
      ?.reference_id ?? null
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Self-contained reschedule dialog.
 * Reads the target appointment from the doctor store — no external props needed.
 * Mounted once in DoctorModalProvider.
 */
export function RescheduleAppointmentModal() {
  const isOpen = useDoctorStore((s) => s.isOpen);
  const type = useDoctorStore((s) => s.type);
  const data = useDoctorStore((s) => s.data);
  const onClose = useDoctorStore((s) => s.onClose);
  const queryClient = useQueryClient();

  /** Only active when this specific modal type is set. */
  const open = isOpen && type === "rescheduleAppointment";
  const appointment = data?.appointment;

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TSlotResponse | null>(null);

  // Reset selections each time the modal opens so stale state doesn't carry over.
  useEffect(() => {
    if (open) {
      setSelectedDate(null);
      setSelectedSlot(null);
    }
  }, [open]);

  // ── 30-day date window (memo-stable) ─────────────────────────────────────────
  const dateRange = useMemo(() => {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 30);
    return {
      start_from: from.toISOString().slice(0, 10),
      start_to: to.toISOString().slice(0, 10),
    };
  }, []);

  const calendarDates = useMemo<Date[]>(() => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  const practitionerId = open ? getPractitionerId(appointment) : null;

  // ── Step 1: resolve PractitionerRole from Practitioner integer ID ─────────────
  const { data: rolesData, isLoading: isLoadingRole } = useServerActionQuery(
    listPractitionerRolesAction,
    {
      input: { payload: { practitioner_id: practitionerId ?? 0, limit: 1 } },
      queryKey: ["reschedule-role", practitionerId],
      enabled: !!practitionerId && open,
    },
  );

  const practitionerRoleId = rolesData?.data[0]?.id ?? null;

  // ── Step 2: fetch free slots for the resolved role ────────────────────────────
  const { data: slotsData, isLoading: isLoadingSlots } = useServerActionQuery(
    listSlotsAction,
    {
      input: {
        payload: {
          practitioner_role_id: practitionerRoleId ?? 0,
          status: "free",
          start_from: dateRange.start_from,
          start_to: dateRange.start_to,
          limit: 150,
        },
      },
      queryKey: ["reschedule-slots", practitionerRoleId, dateRange.start_from],
      enabled: !!practitionerRoleId,
    },
  );

  const freeSlots = slotsData?.data ?? [];

  // ── Derived: ISO date strings that have at least one free slot ────────────────
  const availableDateStrings = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    freeSlots.forEach((sl) => {
      if (sl.start) s.add(sl.start.slice(0, 10));
    });
    return s;
  }, [freeSlots]);

  // ── Derived: slots for the currently selected date ────────────────────────────
  const slotsForDate = useMemo<TSlotResponse[]>(() => {
    if (!selectedDate) return [];
    const dateStr = selectedDate.toISOString().slice(0, 10);
    return freeSlots
      .filter((sl) => sl.start?.startsWith(dateStr))
      .sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
  }, [freeSlots, selectedDate]);

  // ── Submit ────────────────────────────────────────────────────────────────────
  const { execute, isPending } = useServerAction(rescheduleAppointmentAction, {
    onSuccess: () => {
      toast.success("Appointment rescheduled successfully");
      // Refresh the appointment table so the updated time is visible.
      void queryClient.invalidateQueries({ queryKey: doctorAppointmentKeys.all });
      // Bust slot cache — the old slot is now free and the new one is busy;
      // stale "free" data would show the booked slot again on next open.
      void queryClient.invalidateQueries({ queryKey: ["reschedule-slots"] });
      void queryClient.invalidateQueries({ queryKey: ["reschedule-role"] });
      onClose();
    },
    onError: ({ err }) => {
      handleZSAError({ err, fallbackMessage: "Failed to reschedule appointment" });
    },
  });

  /**
   * Fires the reschedule action with the selected slot ID.
   * Backend atomically frees old slot, updates appointment timing, marks new slot busy.
   */
  async function handleReschedule() {
    if (!appointment?.id || !selectedSlot?.id) return;
    await execute({
      payload: {
        id: appointment.id,
        new_slot_id: selectedSlot.id,
      },
    });
  }

  const doctorName = getDoctorName(appointment);
  const isLoading = isLoadingRole || isLoadingSlots;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Reschedule Appointment
          </DialogTitle>
          <DialogDescription>
            Pick a new date and time for this appointment
          </DialogDescription>
        </DialogHeader>

        {/* Doctor badge */}
        <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 bg-muted/40 w-fit">
          <span className="text-muted-foreground text-sm">Appointment with</span>
          <Avatar className="h-6 w-6">
            <AvatarFallback>{doctorName[0]}</AvatarFallback>
          </Avatar>
          <span className="text-foreground text-sm font-semibold">{doctorName}</span>
        </div>

        {/* Loading skeleton — mirrors the DateScroller + slot grid layout */}
        {isLoading ? (
          <Card className="space-y-6 p-4">
            {/* Date scroller skeleton */}
            <div>
              <Skeleton className="h-4 w-32 mb-4 rounded" />
              <div className="flex gap-2 overflow-hidden">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-12 rounded-lg shrink-0" />
                ))}
              </div>
            </div>
            {/* Time slot grid skeleton */}
            <div>
              <Skeleton className="h-4 w-28 mb-4 rounded" />
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            </div>
          </Card>
        ) : (
          <Card className="space-y-6 p-4">
            {/* Date Scroller */}
            <div>
              <h3 className="font-semibold text-muted-foreground text-sm mb-4">
                Available Dates{selectedDate ? ` (${selectedDate.toDateString()})` : ""}
              </h3>
              <DateScroller
                dates={calendarDates}
                selectedDate={selectedDate}
                onSelect={(d) => {
                  setSelectedDate(d);
                  setSelectedSlot(null);
                }}
                availableDates={availableDateStrings}
              />
            </div>

            {/* Time slot grid */}
            <div
              className={`transition-opacity duration-300 ${
                !selectedDate ? "opacity-50 pointer-events-none grayscale" : "opacity-100"
              }`}
            >
              <h3 className="font-semibold text-muted-foreground text-sm mb-4">
                Available Times
              </h3>
              {slotsForDate.length === 0 && selectedDate ? (
                <p className="text-sm text-muted-foreground py-4">
                  No available slots for this day.
                </p>
              ) : (
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {slotsForDate.map((slot) => {
                    const isSelected = selectedSlot?.id === slot.id;
                    const time = getSlotTime(slot);
                    const duration = getSlotDuration(slot);
                    return (
                      <Button
                        key={slot.id}
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => setSelectedSlot(slot)}
                        className="flex flex-col items-center gap-0.5 h-auto py-2"
                      >
                        <span className="flex items-center gap-1.5 text-xs">
                          <Clock className="w-3 h-3" />
                          {time}
                        </span>
                        {duration && (
                          <span className="text-[10px] opacity-70">{duration} min</span>
                        )}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isPending}>
              Close
            </Button>
          </DialogClose>
          <Button
            disabled={isPending || !selectedDate || !selectedSlot}
            onClick={handleReschedule}
          >
            {isPending && <Loader2 className="animate-spin mr-1 h-4 w-4" />}
            Reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
