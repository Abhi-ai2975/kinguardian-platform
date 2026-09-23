/**
 * BookAppointment — 3-step appointment booking wizard.
 *
 * Layer: client / telemedicine / patient / appointments / book
 *
 * Step 1 — Select Practitioner
 *   Fetches all active PractitionerRoles (booking-enriched) from FHIR on mount.
 *   Allows filtering by name/specialty. User picks a role → practitioner_role_id
 *   and practitioner_id are locked in.
 *
 * Step 2 — Choose Date & Slot
 *   Fetches free Slots for the selected PractitionerRole from today onward (start_from = today).
 *   Derives available dates from slot.start datetimes.
 *   DateScroller shows the next 30 days; only dates with free slots are enabled.
 *   User picks a date → time buttons appear → user picks a slot → slot_id locked.
 *
 * Step 3 — Confirm
 *   Shows a summary card. On confirm, calls bookAppointmentAction with
 *   { practitioner_id, slot_id, patient_id }. Success opens a dialog.
 *   The appointment type is normally inherited from the slot by fhir-gql; this
 *   step supplies ROUTINE only when the slot declares none, since the type
 *   cannot be patched in after creation.
 *
 * Data ownership:
 *   patientFhirId — passed from server (getPatientMeAction in page.tsx)
 *   practitioner_id — role.practitioner_ref_id from FHIR
 *   slot_id — selectedSlot.id from FHIR
 */

"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Search,
  Calendar,
  Clock,
  ChevronLeft,
  Filter,
  Loader2,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StepIndicator } from "./StepIndicator";
import { DateScroller } from "./DateScroll";
import {
  PractitionerCard,
  getPractitionerName,
  getPractitionerSpecialty,
} from "./PractitionerCard";
import { listPractitionerRolesForBookingAction } from "@/modules/server/presentation/actions/practitioner-role";
import { listSlotsAction } from "@/modules/server/presentation/actions/slot";
import { bookAppointmentAction } from "@/modules/server/presentation/actions/appointment";
import { linkIntakeToAppointmentAction } from "@/modules/server/presentation/actions/intake";
import { createConsultationAction } from "@/modules/server/presentation/actions/consultation/core.actions";
import type { TPractitionerRoleBookingResponse } from "@/modules/entities/schemas/practitioner-role";
import type { TSlotResponse } from "@/modules/entities/schemas/slot";
import { Link } from "@/i18n/navigation";
import { getProfileInitials } from "@/modules/shared/helper";
import { useServerActionQuery } from "@/lib/zsa-query";
import { patientAppointmentKeys } from "../list/appointmentQueries";

// ── Prop types ────────────────────────────────────────────────────────────────

/** Props passed from the BookAppointmentPage server component. */
interface BookAppointmentProps {
  /** FHIR integer ID of the authenticated patient (from getPatientMeAction). */
  patientFhirId: number;
  /**
   * Human-readable display name of the patient (derived server-side from name[0]).
   * Sent as `patient_display` in the booking payload so the backend stores it as
   * the Patient participant's reference_display — no separate fetch needed on read.
   */
  patientDisplayName?: string;
  /** drgodly string userId from session (for org context). */
  userId: string;
  /** Active organisation ID from session. */
  orgId: string;
  /**
   * Local Intake.id — present when the patient navigated here from the
   * post-intake modal (?intake_id=N). After a successful booking, the
   * intake record is linked to the booked FHIR appointment.
   */
  intakeId?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Fallback appointment type, used only when the booked slot declares none.
 *
 * ROUTINE is the value set's own documented default ("Routine appointment —
 * default if not valued"), and it is the only code in v2-0276 that honestly
 * describes a self-service booking made up to 30 days ahead: WALKIN is by
 * definition unscheduled, EMERGENCY is a triage decision rather than something
 * a patient should be able to self-assign, and CHECKUP/FOLLOWUP are claims
 * about the visit that only the patient or practitioner can make.
 *
 * Needed because the fhir-server cannot patch appointmentType after creation —
 * booking is the only chance to set it.
 */
const DEFAULT_APPOINTMENT_TYPE = {
  appointment_type_system: "http://terminology.hl7.org/CodeSystem/v2-0276",
  appointment_type_code: "ROUTINE",
  appointment_type_display: "Routine appointment",
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Formats a slot's start datetime as a readable time string (e.g. "2:30 PM").
 *
 * @param slot - FHIR Slot response object.
 * @returns Formatted time string or empty string if start is absent.
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
 * Derives the duration in minutes from a slot's start and end datetimes.
 *
 * @param slot - FHIR Slot response object.
 * @returns Duration in minutes or null if either field is absent.
 */
function getSlotDuration(slot: TSlotResponse): number | null {
  if (!slot.start || !slot.end) return null;
  return Math.round(
    (new Date(slot.end).getTime() - new Date(slot.start).getTime()) / 60_000,
  );
}

/**
 * Formats a Date as a long-form string (e.g. "Wednesday, June 15, 2026").
 *
 * @param date - Date to format.
 * @returns Formatted date string.
 */
function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * 3-step appointment booking wizard.
 * Fetches FHIR data client-side via ZSA server actions.
 *
 * @param patientFhirId - FHIR integer patient ID (from session-guarded page).
 * @param userId - drgodly string user ID.
 * @param orgId - Active organisation ID.
 */
export function BookAppointment({
  patientFhirId,
  patientDisplayName,
  userId,
  orgId,
  intakeId,
}: BookAppointmentProps) {
  const queryClient = useQueryClient();

  // ── Step state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);

  // ── Step 1: practitioner list ───────────────────────────────────────────────
  const [selectedRole, setSelectedRole] =
    useState<TPractitionerRoleBookingResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");

  // ── Step 2: slot list ───────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TSlotResponse | null>(null);

  // ── Step 3: booking ─────────────────────────────────────────────────────────
  const [isBooking, setIsBooking] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  // ── Fetch practitioner roles (TanStack Query) ───────────────────────────────
  const {
    data: rolesData,
    isLoading: isLoadingRoles,
    isError: isRolesError,
  } = useServerActionQuery(listPractitionerRolesForBookingAction, {
    input: { payload: { active: true, limit: 100, org_id: orgId } },
    queryKey: ["practitioner-roles-booking", orgId],
  });

  const roles = useMemo<TPractitionerRoleBookingResponse[]>(
    () => rolesData?.data ?? [],
    [rolesData],
  );

  // Show error toast when practitioner fetch fails
  if (isRolesError) {
    toast.error("Failed to load practitioners. Please try again.");
  }

  // ── Fetch free slots for selected practitioner role (TanStack Query) ─────────
  // Date range for the slot query — matches the 30-day DateScroller window exactly.
  const slotDateRange = useMemo(() => {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 30);
    return {
      start_from: from.toISOString().slice(0, 10),
      start_to: to.toISOString().slice(0, 10),
    };
  }, []);

  const {
    data: slotsData,
    isLoading: isLoadingSlots,
    isError: isSlotsError,
  } = useServerActionQuery(listSlotsAction, {
    input: {
      payload: {
        practitioner_role_id: selectedRole?.id ?? 0,
        status: "free",
        // Bound to the 30-day window shown by DateScroller — server filters precisely.
        start_from: slotDateRange.start_from,
        start_to: slotDateRange.start_to,
        limit: 150,
      },
    },
    queryKey: ["slots-free", selectedRole?.id],
    enabled: !!selectedRole,
  });

  const freeSlots = useMemo<TSlotResponse[]>(
    () => slotsData?.data ?? [],
    [slotsData],
  );

  // Show error toast when slots fetch fails
  if (isSlotsError) {
    toast.error("Failed to load available slots. Please try again.");
  }

  // ── Derived: unique specialty labels for the filter dropdown ────────────────
  const specialties = useMemo<string[]>(() => {
    const s = new Set<string>();
    roles.forEach((r) => {
      const spec = getPractitionerSpecialty(r);
      if (spec) s.add(spec);
    });
    return ["All", ...Array.from(s).sort()];
  }, [roles]);

  // ── Derived: filtered practitioner list ─────────────────────────────────────
  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const name = getPractitionerName(r).toLowerCase();
      const spec = getPractitionerSpecialty(r).toLowerCase();
      const matchesSearch =
        name.includes(searchQuery.toLowerCase()) ||
        spec.includes(searchQuery.toLowerCase());
      const matchesSpecialty =
        selectedSpecialty === "All" ||
        getPractitionerSpecialty(r) === selectedSpecialty;
      return matchesSearch && matchesSpecialty;
    });
  }, [roles, searchQuery, selectedSpecialty]);

  // ── Derived: set of ISO date strings that have free slots ──────────────────
  const availableDateStrings = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    freeSlots.forEach((sl) => {
      if (sl.start) s.add(sl.start.slice(0, 10));
    });
    return s;
  }, [freeSlots]);

  // ── Derived: rolling 30-day calendar for the DateScroller ──────────────────
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

  // ── Derived: slots for the currently selected date ──────────────────────────
  const slotsForDate = useMemo<TSlotResponse[]>(() => {
    if (!selectedDate) return [];
    const dateStr = selectedDate.toISOString().slice(0, 10);
    return freeSlots
      .filter((sl) => sl.start?.startsWith(dateStr))
      .sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
  }, [freeSlots, selectedDate]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  /** Advances from step 1 → 2. */
  const handleNextStep = useCallback(() => {
    if (step === 1 && selectedRole) setStep(2);
    else if (step === 2 && selectedDate && selectedSlot) setStep(3);
  }, [step, selectedRole, selectedDate, selectedSlot]);

  /** Goes back one step. */
  const handlePrevStep = useCallback(() => {
    if (step > 1) setStep(step - 1);
  }, [step]);

  /**
   * Submits the booking via bookAppointmentAction.
   * Uses practitioner_ref_id (the Practitioner FK) as practitioner_id.
   */
  const handleConfirmBooking = useCallback(async () => {
    if (!selectedRole || !selectedSlot) {
      toast.error("Please complete all steps before confirming.");
      return;
    }

    const practitionerId = selectedRole.practitioner_ref_id;
    if (!practitionerId) {
      toast.error("Practitioner reference not found. Please try again.");
      return;
    }

    setIsBooking(true);
    const [bookedAppointment, err] = await bookAppointmentAction({
      payload: {
        practitioner_id: practitionerId,
        slot_id: selectedSlot.id,
        patient_id: patientFhirId,
        user_id: userId,
        org_id: orgId,
        /* Display names stored as participant reference_display so they are
           available on read without a secondary Practitioner/Patient fetch. */
        practitioner_display: practitionerName || undefined,
        patient_display: patientDisplayName || undefined,
        /* Appointment type is a floor, not an override. fhir-gql already copies
           the slot's own type onto the appointment, and it treats a supplied
           code as a wholesale replacement — so sending ROUTINE unconditionally
           would clobber a session the practitioner generated as a dedicated
           CHECKUP or FOLLOWUP. Only fill the gap when the slot declares nothing.
           Mirrors the same code-or-text check the booking service applies. */
        ...(selectedSlot.appointment_type_code || selectedSlot.appointment_type_text
          ? {}
          : DEFAULT_APPOINTMENT_TYPE),
      },
    });
    setIsBooking(false);

    if (err) {
      toast.error(
        err.code === "CONFLICT"
          ? "That slot was just taken. Please choose another time."
          : (err.message ?? "Failed to book appointment. Please try again."),
      );
      return;
    }

    // Stale cached list would otherwise still be "fresh" (staleTime) when the
    // patient lands back on the appointments page, hiding the new booking.
    void queryClient.invalidateQueries({ queryKey: patientAppointmentKeys.all });

    // Link the pre-booking intake to this FHIR appointment when present
    if (intakeId && bookedAppointment?.id) {
      await linkIntakeToAppointmentAction({
        payload: { id: intakeId, fhir_appointment_id: bookedAppointment.id },
      });
    }

    // Provision virtual consultation room — user_id is injected server-side
    if (bookedAppointment?.id) {
      const [, roomErr] = await createConsultationAction({
        payload: { fhir_appointment_id: bookedAppointment.id, org_id: orgId },
      });
      if (roomErr) {
        toast.error(
          "Appointment booked but consultation room creation failed. Contact support.",
        );
      }
    }

    setIsSuccessOpen(true);
  }, [selectedRole, selectedSlot, patientFhirId, userId, orgId, intakeId, queryClient]);

  /** Resets all wizard state and closes the success dialog. */
  const resetBooking = useCallback(() => {
    setStep(1);
    setSelectedRole(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setIsSuccessOpen(false);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  const practitionerName = selectedRole
    ? getPractitionerName(selectedRole)
    : "";
  const practitionerSpecialty = selectedRole
    ? getPractitionerSpecialty(selectedRole)
    : "";
  const slotTime = selectedSlot ? getSlotTime(selectedSlot) : "";
  const slotDuration = selectedSlot ? getSlotDuration(selectedSlot) : null;

  return (
    <div className="flex flex-col min-h-[calc(100dvh-10rem)] -mb-6">
      <div className="flex-1">
        {/* Page header */}
        <div className="mb-4">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Book an Appointment
          </h1>
          <p className="text-muted-foreground">
            Find and book with verified specialists
          </p>
        </div>

        <StepIndicator currentStep={step} />

        <div className="mb-4">
          {/* ── Step 1: Select Practitioner ── */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Filters */}
              <div className="mb-4 flex flex-col md:flex-row gap-4 items-center">
                <InputGroup>
                  <InputGroupInput
                    placeholder="Search name or specialty..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <InputGroupAddon>
                    <Search className="w-5 h-5 text-muted-foreground" />
                  </InputGroupAddon>
                </InputGroup>

                <div className="relative w-full md:w-auto min-w-50">
                  <Select
                    value={selectedSpecialty}
                    onValueChange={setSelectedSpecialty}
                  >
                    <SelectTrigger className="w-full h-9">
                      <Filter className="w-5 h-5 text-muted-foreground" />
                      <SelectValue placeholder="Specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      {specialties.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-between items-end mb-4">
                <h2 className="text-xl font-semibold">
                  Choose Your Specialist
                </h2>
                <span className="text-sm text-muted-foreground">
                  {filteredRoles.length} available
                </span>
              </div>

              {/* Practitioner grid */}
              {isLoadingRoles ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                  {filteredRoles.map((role) => (
                    <PractitionerCard
                      key={role.id}
                      role={role}
                      selected={selectedRole?.id === role.id}
                      onSelect={() => {
                        setSelectedRole(role);
                        setSelectedDate(null);
                        setSelectedSlot(null);
                      }}
                    />
                  ))}
                  {filteredRoles.length === 0 && (
                    <Card className="col-span-full p-6 text-center border border-dashed">
                      <p className="text-muted-foreground">
                        No practitioners found matching your criteria.
                      </p>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedSpecialty("All");
                        }}
                        className="mt-2 w-fit mx-auto"
                      >
                        Clear filters
                      </Button>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Choose Date & Slot ── */}
          {step === 2 && selectedRole && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mb-4">
              {/* Header row with back + selected practitioner badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevStep}
                  className="text-muted-foreground self-start"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 bg-muted/40">
                  <span className="text-muted-foreground text-sm">
                    Booking with
                  </span>
                  <Avatar className="h-6 w-6">
                    {selectedRole.practitioner_detail?.photo_url && (
                      <img
                        src={selectedRole.practitioner_detail.photo_url}
                        alt={practitionerName}
                      />
                    )}
                    <AvatarFallback>
                      {getProfileInitials(practitionerName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-foreground text-sm font-semibold">
                    {practitionerName}
                  </span>
                </div>
              </div>

              {isLoadingSlots ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-9 w-full rounded-md" />
                    ))}
                  </div>
                </div>
              ) : freeSlots.length === 0 ? (
                <Card className="p-8 text-center border border-dashed">
                  <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    No free slots available for this practitioner right now.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrevStep}
                    className="mt-3"
                  >
                    Choose another doctor
                  </Button>
                </Card>
              ) : (
                <Card className="space-y-8 py-4 px-4 h-fit">
                  {/* Date Scroller */}
                  <div>
                    <h3 className="font-semibold text-muted-foreground text-sm mb-4">
                      Available Dates{" "}
                      {selectedDate ? `(${selectedDate.toDateString()})` : null}
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

                  {/* Time Slot Grid */}
                  <div
                    className={`transition-opacity duration-300 ${
                      !selectedDate
                        ? "opacity-50 pointer-events-none grayscale"
                        : "opacity-100"
                    }`}
                  >
                    <h3 className="font-semibold mb-4 text-muted-foreground text-sm">
                      Available Times
                    </h3>
                    {slotsForDate.length === 0 ? (
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
                                <span className="text-[10px] opacity-70">
                                  {duration} min
                                </span>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ── Step 3: Confirm ── */}
          {step === 3 && selectedRole && selectedDate && selectedSlot && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
              <div className="mb-3">
                <h2 className="text-xl font-bold">Confirm Your Appointment</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Review the details below before confirming
                </p>
              </div>

              <Card className="overflow-hidden">
                {/* Hero banner */}
                <div className="bg-linear-to-br from-primary/10 via-primary/5 to-transparent px-4 py-3 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-background border-2 border-primary/20 flex items-center justify-center text-base font-bold text-primary shadow-sm shrink-0">
                      {getProfileInitials(practitionerName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-muted-foreground">
                        Appointment with
                      </p>
                      <h3 className="font-bold text-sm truncate">
                        {practitionerName}
                      </h3>
                      {practitionerSpecialty && (
                        <p className="text-xs text-muted-foreground truncate">
                          {practitionerSpecialty}
                        </p>
                      )}
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-full px-2.5 py-0.5 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Ready to Book
                    </div>
                  </div>
                </div>

                {/* Detail tiles */}
                <div className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Appointment type / service */}
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border border-border/60">
                      <div className="p-1.5 rounded-md bg-background border shadow-xs shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                          Type
                        </p>
                        <p className="font-semibold text-sm truncate">
                          {selectedSlot.appointment_type_display ??
                            selectedSlot.service_type?.[0]?.coding_display ??
                            "Consultation"}
                        </p>
                        {slotDuration && (
                          <p className="text-xs text-muted-foreground">
                            {slotDuration} min
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border border-border/60">
                      <div className="p-1.5 rounded-md bg-background border shadow-xs shrink-0">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                          Date
                        </p>
                        <p className="font-semibold text-sm">
                          {formatFullDate(selectedDate)}
                        </p>
                      </div>
                    </div>

                    {/* Time */}
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border border-border/60 sm:col-span-2">
                      <div className="p-1.5 rounded-md bg-background border shadow-xs shrink-0">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                          Time
                        </p>
                        <p className="font-semibold text-sm">{slotTime}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
      {/* end flex-1 */}

      {/* ── Sticky bottom action bar ── */}
      <div className="sticky bottom-0 z-10 -mx-4 px-4 py-3 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 border-t flex justify-end">
        {step < 3 ? (
          <Button
            size="sm"
            className="w-full md:w-fit"
            disabled={
              (step === 1 && !selectedRole) ||
              (step === 2 && (!selectedDate || !selectedSlot))
            }
            onClick={handleNextStep}
          >
            {step === 1 ? "Continue to Time Selection" : "Review Booking"}
          </Button>
        ) : (
          <div className="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={handlePrevStep}>
              Modify Appointment
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmBooking}
              disabled={isBooking}
            >
              {isBooking && <Loader2 className="animate-spin mr-1" />}
              Confirm Booking
            </Button>
          </div>
        )}
      </div>

      {/* ── Success Dialog ── */}
      <Dialog open={isSuccessOpen} onOpenChange={resetBooking}>
        <DialogContent>
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-emerald-400/20 rounded-full flex items-center justify-center mb-6 text-emerald-500 border border-emerald-400/50">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <DialogHeader className="mb-4">
              <DialogTitle asChild>
                <h2 className="text-2xl text-center font-bold">
                  Appointment Confirmed!
                </h2>
              </DialogTitle>
              <DialogDescription className="text-center text-muted-foreground">
                Your appointment has been successfully booked.
              </DialogDescription>
            </DialogHeader>

            {/* Quick summary */}
            <div className="rounded-lg p-4 text-left mb-6 border">
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-3 text-muted-foreground">
                Quick Summary
              </h4>
              <div className="space-y-2 text-sm">
                {selectedRole && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="text-base">👤</span>
                    <span>{practitionerName}</span>
                  </div>
                )}
                {selectedDate && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatFullDate(selectedDate)}</span>
                  </div>
                )}
                {selectedSlot && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{slotTime}</span>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex flex-col! gap-3 w-full">
              <Button variant="default" className="w-full" asChild>
                <Link href="/bezs/telemedicine/patient/appointments">
                  View My Appointments
                </Link>
              </Button>
              <DialogClose asChild>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={resetBooking}
                >
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>

            <p className="text-xs text-muted-foreground mt-4">
              Please arrive 15 minutes early. Need to reschedule? Contact us 24
              hours in advance.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
