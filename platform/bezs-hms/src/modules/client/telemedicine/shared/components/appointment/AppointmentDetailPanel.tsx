/**
 * AppointmentDetailPanel — row-expand detail component for the appointment tables.
 *
 * Layer: client / telemedicine / shared / components / appointment
 * Resource: Appointment
 *
 * Renders the parts of a FHIR Appointment that the list columns cannot show.
 * The columns surface six fields; `TAppointmentResponse` carries roughly forty
 * scalars and seventeen child arrays, so everything below is otherwise
 * unreachable from the list — most notably the cancellation reason, the notes,
 * and the reschedule chain.
 *
 * One component serves both sides. The record is identical whichever side is
 * looking at it; only the counterpart differs — the doctor's table leads with
 * the patient, the patient's table leads with the practitioner — which is what
 * `perspective` selects. Keeping it as one component is deliberate: the two
 * column files were forked and have already drifted, and a forked panel would
 * do the same.
 *
 * Presentation only — no hooks and no state, so it stays cheap to render inside
 * every expanded row.
 */

import type { Row } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  type TAppointmentResponse,
  type TAppointmentNoteResponse,
  type TAppointmentParticipantResponse,
} from "@/modules/entities/schemas/appointment";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Minimal shape shared by the CodeableConcept-flavoured child arrays
 * (class, service_category, service_type, specialty, reason, ...). Each of them
 * carries a coding display and a free-text fallback under the same two keys, so
 * one accessor reads them all.
 */
interface CodeableLike {
  id?: number;
  coding_display?: string | null;
  text?: string | null;
}

/** Which side of the appointment is looking at the panel. */
export type AppointmentPerspective = "doctor" | "patient";

interface AppointmentDetailPanelProps {
  /** TanStack row carrying the full appointment record. */
  row: Row<TAppointmentResponse>;
  /**
   * Whose table this is. Selects which participant is treated as the
   * counterpart in the overview — the doctor sees the patient and vice versa.
   */
  perspective: AppointmentPerspective;
}

// ── Formatting helpers ────────────────────────────────────────────────────────

/**
 * Formats an ISO 8601 datetime as a localised date.
 *
 * @param iso - UTC datetime from the FHIR API, or nullish.
 * @returns Localised date string, or undefined when absent.
 */
function formatDate(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Formats an ISO 8601 datetime as a localised time.
 *
 * @param iso - UTC datetime from the FHIR API, or nullish.
 * @returns Localised time string, or undefined when absent.
 */
function formatTime(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formats an ISO 8601 datetime as a localised date and time.
 *
 * @param iso - UTC datetime from the FHIR API, or nullish.
 * @returns Localised datetime string, or undefined when absent.
 */
function formatDateTime(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  return new Date(iso).toLocaleString();
}

/**
 * Renders the scheduled window as a single line, e.g. "12 Aug 2026, 09:00 – 09:30".
 * Falls back to whichever end is present rather than showing a half-empty range.
 *
 * @param start - Appointment start instant.
 * @param end - Appointment end instant.
 * @returns Human-readable window, or undefined when neither end is known.
 */
function formatWindow(
  start?: string | null,
  end?: string | null,
): string | undefined {
  const startDate = formatDate(start);
  if (!startDate) return formatDateTime(end);
  const startTime = formatTime(start);
  const endTime = formatTime(end);
  if (!startTime) return startDate;
  return endTime
    ? `${startDate}, ${startTime} – ${endTime}`
    : `${startDate}, ${startTime}`;
}

/**
 * Reads the display label off a CodeableConcept-flavoured child row, preferring
 * the coded display over the free-text fallback.
 *
 * @param item - One entry from a codeable child array.
 * @returns The best available label, or undefined when the entry is empty.
 */
function codeableLabel(item: CodeableLike): string | undefined {
  return item.coding_display ?? item.text ?? undefined;
}

/**
 * Collects the labels from a codeable child array, dropping empty entries.
 *
 * @param items - The child array, which may be null or absent.
 * @returns Non-empty labels, possibly an empty array.
 */
function codeableLabels(items?: CodeableLike[] | null): string[] {
  return (items ?? [])
    .map(codeableLabel)
    .filter((label): label is string => Boolean(label));
}

/**
 * Resolves the practitioner's name from the participant array.
 *
 * @param participants - Appointment participant array, may be null.
 * @returns Display name, or undefined when no practitioner participates.
 */
function practitionerName(
  participants?: TAppointmentParticipantResponse[] | null,
): string | undefined {
  return (
    participants?.find((p) => p.reference_type === "Practitioner")
      ?.reference_display ?? undefined
  );
}

/**
 * Builds the author line for a note, preferring the referenced author over the
 * free-text one.
 *
 * @param note - One annotation from `note[]`.
 * @returns Attribution string, or undefined when the note is unattributed.
 */
function noteAuthor(note: TAppointmentNoteResponse): string | undefined {
  return note.author_reference_display ?? note.author_string ?? undefined;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Full-width detail panel rendered beneath an expanded appointment row.
 *
 * Every section hides itself when its source data is absent, so a sparse
 * appointment (an AI-intake booking, say) collapses to just the overview rather
 * than showing a wall of dashes.
 *
 * @param row - TanStack row carrying the appointment.
 * @param perspective - Whose table this is; picks the counterpart shown.
 */
export function AppointmentDetailPanel({
  row,
  perspective,
}: AppointmentDetailPanelProps) {
  const appointment = row.original;

  /* The counterpart is whoever the viewer is not. */
  const counterpartLabel = perspective === "doctor" ? "Patient" : "Doctor";
  const counterpartName =
    perspective === "doctor"
      ? (appointment.subject_display ?? undefined)
      : practitionerName(appointment.participant);

  const classLabels = codeableLabels(appointment.class);
  const reasonLabels = codeableLabels(appointment.reason);
  const serviceCategoryLabels = codeableLabels(appointment.service_category);
  const serviceTypeLabels = codeableLabels(appointment.service_type);
  const specialtyLabels = codeableLabels(appointment.specialty);
  const instructions = codeableLabels(appointment.patient_instruction);

  const notes = appointment.note ?? [];
  const participants = appointment.participant ?? [];
  const identifiers = appointment.identifier ?? [];
  const virtualServices = appointment.virtual_service ?? [];

  /* Cancellation details are only meaningful once something was cancelled. */
  const cancellationReason =
    appointment.cancelation_reason_display ??
    appointment.cancelation_reason_text ??
    undefined;
  const hasCancellation = Boolean(
    appointment.cancellation_date ?? cancellationReason,
  );

  /* Reschedule chain — both links are set by the reschedule flow. */
  const hasRescheduleChain = Boolean(
    appointment.previous_appointment_id ??
      appointment.originating_appointment_id,
  );

  const hasLinks = Boolean(
    appointment.encounter_id ??
      appointment.based_on?.length ??
      appointment.slot?.length ??
      appointment.account?.length ??
      appointment.replaces?.length,
  );

  return (
    <div className="space-y-5 border-t bg-muted/30 p-4">
      {/* ── Overview ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm md:grid-cols-4">
        <DetailField
          label="Appointment"
          value={
            <span className="font-mono text-xs">
              Appointment/{appointment.id}
            </span>
          }
        />
        <DetailField label={counterpartLabel} value={counterpartName} />
        <DetailField
          label="Scheduled"
          value={formatWindow(appointment.start, appointment.end)}
        />
        <DetailField
          label="Duration"
          value={
            appointment.minutes_duration != null
              ? `${appointment.minutes_duration} min`
              : undefined
          }
        />
        <DetailField
          label="Type"
          value={
            appointment.appointment_type_display ??
            appointment.appointment_type_text ??
            undefined
          }
        />
        <DetailField
          label="Priority"
          value={
            appointment.priority_display ??
            appointment.priority_text ??
            undefined
          }
        />
        <DetailField
          label="Class"
          value={classLabels.length > 0 ? classLabels.join(", ") : undefined}
        />
        <DetailField
          label="Booked on"
          value={formatDateTime(appointment.created ?? appointment.created_at)}
        />
      </div>

      {/* ── Cancellation ─────────────────────────────────────────────────────
          Surfaced first and tinted because it explains the status badge in the
          row above, which on its own only says "Cancelled". */}
      {hasCancellation && (
        <>
          <Separator />
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-destructive">
              Cancellation
            </p>
            <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:grid-cols-4">
              <DetailField label="Reason" value={cancellationReason} />
              <DetailField
                label="Cancelled on"
                value={formatDateTime(appointment.cancellation_date)}
              />
              <DetailField
                label="Code"
                value={
                  appointment.cancelation_reason_code ? (
                    <span className="font-mono text-xs">
                      {appointment.cancelation_reason_code}
                    </span>
                  ) : undefined
                }
              />
            </div>
          </div>
        </>
      )}

      {/* ── Reason for visit ─────────────────────────────────────────────── */}
      {(appointment.description || reasonLabels.length > 0) && (
        <>
          <Separator />
          <Section title="Reason for visit">
            {appointment.description && (
              <p className="text-sm leading-relaxed">
                {appointment.description}
              </p>
            )}
            {reasonLabels.length > 0 && <ChipList items={reasonLabels} />}
          </Section>
        </>
      )}

      {/* ── Service ──────────────────────────────────────────────────────── */}
      {(serviceCategoryLabels.length > 0 ||
        serviceTypeLabels.length > 0 ||
        specialtyLabels.length > 0) && (
        <>
          <Separator />
          <Section title="Service">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <DetailField
                label="Category"
                value={
                  serviceCategoryLabels.length > 0 ? (
                    <ChipList items={serviceCategoryLabels} />
                  ) : undefined
                }
              />
              <DetailField
                label="Service type"
                value={
                  serviceTypeLabels.length > 0 ? (
                    <ChipList items={serviceTypeLabels} />
                  ) : undefined
                }
              />
              <DetailField
                label="Specialty"
                value={
                  specialtyLabels.length > 0 ? (
                    <ChipList items={specialtyLabels} />
                  ) : undefined
                }
              />
            </div>
          </Section>
        </>
      )}

      {/* ── Patient instructions ─────────────────────────────────────────────
          Patient-facing text that has nowhere else to appear in the list. */}
      {instructions.length > 0 && (
        <>
          <Separator />
          <Section title="Patient instructions">
            <ul className="list-inside list-disc space-y-1 text-sm">
              {instructions.map((instruction, index) => (
                <li key={index}>{instruction}</li>
              ))}
            </ul>
          </Section>
        </>
      )}

      {/* ── Notes ────────────────────────────────────────────────────────── */}
      {notes.length > 0 && (
        <>
          <Separator />
          <Section title="Notes">
            <div className="space-y-2">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-md border bg-background p-3"
                >
                  <p className="text-sm leading-relaxed">{note.text ?? "—"}</p>
                  {(noteAuthor(note) ?? note.time) && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {[noteAuthor(note), formatDateTime(note.time)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Participants ─────────────────────────────────────────────────── */}
      {participants.length > 0 && (
        <>
          <Separator />
          <Section title="Participants">
            <div className="space-y-1.5">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex flex-wrap items-center gap-2 text-sm"
                >
                  <span className="font-medium">
                    {participant.reference_display ??
                      participant.reference_type ??
                      "—"}
                  </span>
                  {participant.reference_type && (
                    <Badge variant="secondary" className="text-[10px]">
                      {participant.reference_type}
                    </Badge>
                  )}
                  {codeableLabels(participant.types).map((role) => (
                    <Badge
                      key={role}
                      variant="outline"
                      className="text-[10px] font-normal"
                    >
                      {role}
                    </Badge>
                  ))}
                  {participant.status && (
                    <span className="text-xs text-muted-foreground">
                      {participant.status}
                    </span>
                  )}
                  {participant.required && (
                    <span className="text-xs text-muted-foreground">
                      required
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Virtual service ──────────────────────────────────────────────────
          The channel and capacity only. `address_url` and `session_key` are
          deliberately withheld: they are joining credentials for the room, and
          the consultation is entered through the in-app route that mints its
          own LiveKit token. Rendering them here would leak a bypass into the
          page HTML for anyone who can see the row. */}
      {virtualServices.length > 0 && (
        <>
          <Separator />
          <Section title="Virtual service">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:grid-cols-4">
              {virtualServices.map((service) => (
                <DetailField
                  key={service.id}
                  label={service.channel_type_display ?? "Channel"}
                  value={
                    service.additional_info ??
                    (service.max_participants != null
                      ? `Up to ${service.max_participants} participants`
                      : (service.channel_type_code ?? undefined))
                  }
                />
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Reschedule chain ─────────────────────────────────────────────── */}
      {hasRescheduleChain && (
        <>
          <Separator />
          <Section title="Reschedule history">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:grid-cols-4">
              <DetailField
                label="Rescheduled from"
                value={
                  appointment.previous_appointment_id != null
                    ? (appointment.previous_appointment_display ??
                      `Appointment/${appointment.previous_appointment_id}`)
                    : undefined
                }
              />
              <DetailField
                label="Originally booked as"
                value={
                  appointment.originating_appointment_id != null
                    ? (appointment.originating_appointment_display ??
                      `Appointment/${appointment.originating_appointment_id}`)
                    : undefined
                }
              />
            </div>
          </Section>
        </>
      )}

      {/* ── Linked records ───────────────────────────────────────────────── */}
      {hasLinks && (
        <>
          <Separator />
          <Section title="Linked records">
            <div className="flex flex-wrap gap-1.5">
              {appointment.encounter_id != null && (
                <ReferenceChip
                  label={`Encounter/${appointment.encounter_id}`}
                />
              )}
              {(appointment.based_on ?? []).map((ref) => (
                <ReferenceChip
                  key={`based-on-${ref.id}`}
                  label={
                    ref.reference_display ??
                    `${ref.reference_type}/${ref.reference_id}`
                  }
                />
              ))}
              {(appointment.replaces ?? []).map((ref) => (
                <ReferenceChip
                  key={`replaces-${ref.id}`}
                  label={
                    ref.reference_display ??
                    `${ref.reference_type}/${ref.reference_id}`
                  }
                />
              ))}
              {(appointment.slot ?? []).map((ref) => (
                <ReferenceChip
                  key={`slot-${ref.id}`}
                  label={
                    ref.reference_display ??
                    `${ref.reference_type}/${ref.reference_id}`
                  }
                />
              ))}
              {(appointment.account ?? []).map((ref) => (
                <ReferenceChip
                  key={`account-${ref.id}`}
                  label={
                    ref.reference_display ??
                    `${ref.reference_type}/${ref.reference_id}`
                  }
                />
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Identifiers ──────────────────────────────────────────────────── */}
      {identifiers.length > 0 && (
        <>
          <Separator />
          <Section title="Identifiers">
            <div className="space-y-1 text-sm">
              {identifiers.map((identifier) => (
                <div key={identifier.id} className="flex flex-wrap gap-2">
                  <span className="font-mono text-xs">
                    {identifier.value ?? "—"}
                  </span>
                  {identifier.type_display && (
                    <span className="text-xs text-muted-foreground">
                      {identifier.type_display}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Audit ────────────────────────────────────────────────────────── */}
      <Separator />
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs text-muted-foreground md:grid-cols-4">
        <DetailField
          label="Created"
          value={formatDateTime(appointment.created_at)}
        />
        <DetailField label="Created by" value={appointment.created_by} />
        <DetailField
          label="Updated"
          value={formatDateTime(appointment.updated_at)}
        />
        <DetailField label="Updated by" value={appointment.updated_by} />
      </div>
    </div>
  );
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Renders a labelled value, or nothing at all when the value is empty.
 * Self-hiding keeps a sparse appointment from rendering a grid of dashes.
 *
 * @param label - Field caption.
 * @param value - Field content; falsy values suppress the whole field.
 */
function DetailField({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}

/**
 * Titled section wrapper used between separators in the panel.
 *
 * @param title - Section caption.
 * @param children - Section body.
 */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

/**
 * Renders a list of short labels as badges.
 *
 * @param items - Labels to render.
 */
function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item} variant="secondary" className="font-normal">
          {item}
        </Badge>
      ))}
    </div>
  );
}

/**
 * Renders a FHIR reference as a monospace chip.
 *
 * @param label - Reference display or `Type/id` fallback.
 */
function ReferenceChip({ label }: { label: string }) {
  return (
    <Badge variant="outline" className="font-mono text-[10px] font-normal">
      {label}
    </Badge>
  );
}
