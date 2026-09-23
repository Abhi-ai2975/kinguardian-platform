/**
 * ClinicalWorkspace — step 3 of the doctor's Clinical Records drill-down.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records
 *
 * The full clinical record for one appointment, across seven tabs: Note,
 * Diagnoses, Prescriptions, Orders, Documents, Intake and Timeline. This
 * component owns all editable state so that a single autosave and a single
 * publish cover everything the doctor typed, wherever they typed it.
 *
 * Timeline replaces the old Visit tab's static appointment/encounter cards
 * with buildAppointmentTimeline's chronological event list — booking through
 * chart approval, assembled from props this component already receives, no
 * extra fetch involved.
 *
 * Entries write straight to FHIR. There is no staging row and no publish step
 * here: the doctor working in this screen is editing the patient's record, so
 * saving an entry creates or updates it in the EMR immediately, and removing
 * one deletes it.
 *
 * The SOAP note is the exception — it is read-only here and written only on the
 * post-consultation review page, which is where a batch of AI suggestions gets
 * accepted in one act. Both header states link there: "Review & approve" before
 * anything is in the chart, "Edit note & entries" afterwards.
 *
 * Seed priority is: published FHIR records → staged draft → AI full report.
 * Published records win because they carry fhirId, which is what makes an edit
 * an update rather than a duplicate.
 */

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileStack,
  FileText,
  FlaskConical,
  GitCommitVertical,
  PenLine,
  Pill,
  User,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import {
  isDoctorApproved,
  ReviewBadge,
  ReviewBanner,
} from "@/modules/client/telemedicine/shared/components/clinical/ReviewStatus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  conditionFromFhir,
  medicationFromFhir,
  observationFromFhir,
  serviceRequestFromFhir,
} from "../appointment-review/fromFhir";
import {
  deleteClinicalEntry,
  persistClinicalEntry,
  type ClinicalEntryByKind,
  type ClinicalEntryKind,
} from "./persistEntry";
import type { ClinicalWriteContext } from "../appointment-review/clinicalPayloads";
import {
  normaliseConditions,
  normaliseMedications,
  normaliseObservations,
  normaliseServiceRequests,
  seedSoapNote,
} from "./clinicalDraft";
import { ConsultationNoteCanvas } from "./note/ConsultationNoteCanvas";
import { AppointmentTimeline } from "./timeline/AppointmentTimeline";
import { buildAppointmentTimeline } from "./timeline/buildTimeline";
import { DiagnosesTab } from "./tabs/DiagnosesTab";
import { PrescriptionsTab } from "./tabs/PrescriptionsTab";
import { OrdersTab } from "./tabs/OrdersTab";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { IntakeTab } from "./tabs/IntakeTab";

import type {
  ConditionFormItem,
  MedicationFormItem,
  ObservationFormItem,
  ServiceRequestFormItem,
  SoapNote,
} from "../appointment-review/types";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";
import type { TEncounterResponse } from "@/modules/entities/schemas/encounter";
import type { TConditionResponse } from "@/modules/entities/schemas/condition";
import type { TObservationResponse } from "@/modules/entities/schemas/observation";
import type { TMedicationRequestResponse } from "@/modules/entities/schemas/medication-request";
import type { TServiceRequestResponse } from "@/modules/entities/schemas/service-request";
import type { TDiagnosticReportResponse } from "@/modules/entities/schemas/diagnostic-report";
import type { TDocumentReferenceResponse } from "@/modules/entities/schemas/document-reference";
import type { TIntakeResponse } from "@/modules/entities/schemas/intake";
import type { TConsultationTranscriptMessage } from "@/modules/entities/schemas/consultation";

// ── Constants ─────────────────────────────────────────────────────────────────

// ── Types ─────────────────────────────────────────────────────────────────────

/** Draft state staged on the Consultation row, as loaded by the server page. */
export interface StagedClinicalDraft {
  conditions: unknown;
  observations: unknown;
  medicationRequests: unknown;
  serviceRequests: unknown;
  soapNote: unknown;
}

export interface ClinicalWorkspaceProps {
  /** FHIR Appointment.id — the staging key on the Consultation row. */
  appointmentId: number;
  /** FHIR Patient.id — subject reference for every created resource. */
  patientId: number;
  /** The appointment being documented. */
  appointment: TAppointmentResponse;
  /** Every Encounter linked to the appointment. */
  encounters: TEncounterResponse[];
  /**
   * The encounter all created resources link to — the first of `encounters`.
   * Null when the consultation produced none, which disables publishing.
   */
  encounterId: number | null;
  /** Patient display name for headers and the printable prescription. */
  patientName: string;
  /** Doctor display name for headers and the printable prescription. */
  doctorName: string;
  /** Formatted appointment date for headers. */
  appointmentDate: string | null;
  /** Conditions already published to the EMR for this encounter. */
  savedConditions: TConditionResponse[];
  /** Observations already published to the EMR for this encounter. */
  savedObservations: TObservationResponse[];
  /** MedicationRequests already published to the EMR for this encounter. */
  savedMedications: TMedicationRequestResponse[];
  /** ServiceRequests already published to the EMR for this encounter. */
  savedServiceRequests: TServiceRequestResponse[];
  /** DiagnosticReports for the encounter — resolves uploaded order results. */
  diagnosticReports: TDiagnosticReportResponse[];
  /** DocumentReferences attached to the encounter. */
  documents: TDocumentReferenceResponse[];
  /** Draft staged on the Consultation row, if any. */
  staged: StagedClinicalDraft;
  /** SOAP note from the AI full report — the first-visit seed. */
  aiSoapNote: unknown;
  /** Intake record for the Intake tab, or null when the patient completed none. */
  intake: TIntakeResponse | null;
  /** Live consultation transcript for the Intake tab, possibly empty. */
  transcript: TConsultationTranscriptMessage[];
  /**
   * `Consultation.published_at` — when the doctor approved the note and
   * entries on the review page, or null while they are still AI suggestions.
   */
  publishedAt: Date | string | null;
  /**
   * `Consultation.created_at` — when the AI agent produced the SOAP note and
   * extraction. Feeds the Timeline tab's "AI clinical note generated" event;
   * not used anywhere else on this screen.
   */
  consultationCreatedAt: Date | string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Tabbed clinical record workspace for a single appointment.
 *
 * @param props - Appointment context, published FHIR records, staged draft and
 *                AI seed, as resolved by the server page.
 */
export function ClinicalWorkspace({
  appointmentId,
  patientId,
  appointment,
  encounters,
  encounterId,
  patientName,
  doctorName,
  appointmentDate,
  savedConditions,
  savedObservations,
  savedMedications,
  savedServiceRequests,
  diagnosticReports,
  documents,
  staged,
  aiSoapNote,
  intake,
  transcript,
  publishedAt,
  consultationCreatedAt,
}: ClinicalWorkspaceProps) {
  /* Refreshed after every write so server-derived data — the review status, the
     result files hanging off an order — reflects what was just saved. */
  const router = useRouter();

  /** FHIR subject reference every created resource is attached to. */
  const subject = `Patient/${patientId}`;

  /* Anything already in the EMR takes precedence over the staged draft. */
  const hasPublished =
    savedConditions.length > 0 ||
    savedObservations.length > 0 ||
    savedMedications.length > 0 ||
    savedServiceRequests.length > 0;

  // ── Form state ──────────────────────────────────────────────────────────────

  /* Read-only on this screen — seeded once, never set. The note is edited on
     the review page. */
  const [soap] = useState<SoapNote>(() =>
    seedSoapNote(staged.soapNote, aiSoapNote),
  );
  const [conditions, setConditions] = useState<ConditionFormItem[]>(() =>
    hasPublished
      ? savedConditions.map(conditionFromFhir)
      : normaliseConditions(staged.conditions),
  );
  const [observations, setObservations] = useState<ObservationFormItem[]>(() =>
    hasPublished
      ? savedObservations.map(observationFromFhir)
      : normaliseObservations(staged.observations),
  );
  const [medications, setMedications] = useState<MedicationFormItem[]>(() =>
    hasPublished
      ? savedMedications.map(medicationFromFhir)
      : normaliseMedications(staged.medicationRequests),
  );
  const [serviceRequests, setServiceRequests] = useState<ServiceRequestFormItem[]>(
    () =>
      hasPublished
        ? savedServiceRequests.map(serviceRequestFromFhir)
        : normaliseServiceRequests(staged.serviceRequests),
  );

  // ── Direct-to-EMR writes ────────────────────────────────────────────────────

  /*
   * This workspace writes straight to FHIR. There is no staging row and no
   * publish step: the doctor here is editing the patient's record, so every
   * entry is created, updated or deleted as they save it.
   *
   * The consultation staging columns are still written by the review page,
   * which is a different job — accepting a batch of AI suggestions in one act.
   */
  const writeContext: ClinicalWriteContext | null =
    encounterId != null ? { subject, encounterId } : null;

  /**
   * Builds the save handler for one resource kind.
   *
   * @param kind - Which resource the entries belong to.
   * @returns A handler resolving to the entry's FHIR id.
   * @throws When there is no encounter to attach the record to.
   */
  function persistFor<K extends ClinicalEntryKind>(kind: K) {
    return async (item: ClinicalEntryByKind[K]): Promise<number> => {
      if (!writeContext) {
        /* Every clinical resource hangs off an encounter, so without one there
           is nothing to attach the record to. */
        throw new Error(
          "This visit has no encounter yet, so records cannot be saved to it.",
        );
      }
      const fhirId = await persistClinicalEntry(kind, item, writeContext);
      /* Re-read so anything derived from the record on the server — the review
         status, the result files hanging off an order — reflects the write. */
      router.refresh();
      return fhirId;
    };
  }

  /**
   * Builds the delete handler for one resource kind.
   *
   * An entry with no fhirId was never saved, so there is nothing to delete —
   * the list drops it locally and this resolves immediately.
   *
   * @param kind - Which resource the entries belong to.
   * @returns A handler that removes the entry from the EMR.
   */
  function deleteFor<K extends ClinicalEntryKind>(kind: K) {
    return async (item: ClinicalEntryByKind[K]): Promise<void> => {
      if (item.fhirId == null) return;
      await deleteClinicalEntry(kind, item.fhirId);
      router.refresh();
    };
  }

  // ── Review hand-off ─────────────────────────────────────────────────────────

  /*
   * Publishing and re-extraction deliberately do not live here any more. The
   * review page is the single approval surface: it is where the doctor edits
   * the SOAP note, regenerates the clinical extraction and pushes to the EMR.
   * This workspace shows the record and hands off to it, so there is one place
   * where records enter the chart rather than two that can disagree.
   */
  const reviewHref = `/bezs/telemedicine/doctor/appointments/${appointmentId}/review`;

  // ── Header status ───────────────────────────────────────────────────────────

  /*
   * The approval stamp is authoritative; hasPublished (any FHIR resource on the
   * encounter) is only a fallback for consultations written before the column
   * existed. It is also not equivalent — a doctor who approves the note but
   * rejects every extracted entry creates no FHIR resources at all, and the
   * old count-based check called that "not in the chart".
   */
  const isPublished = isDoctorApproved(publishedAt, hasPublished);

  /* Recomputed only when a dependency actually changes — the builder walks
     every clinical entry on the encounter, which is cheap once but not worth
     redoing on every keystroke in another tab. */
  const timelineEvents = useMemo(
    () =>
      buildAppointmentTimeline({
        appointment,
        encounters,
        intake,
        transcript,
        consultationCreatedAt,
        publishedAt,
        savedConditions,
        savedObservations,
        savedMedications,
        savedServiceRequests,
        diagnosticReports,
        documents,
        doctorName,
      }),
    [
      appointment,
      encounters,
      intake,
      transcript,
      consultationCreatedAt,
      publishedAt,
      savedConditions,
      savedObservations,
      savedMedications,
      savedServiceRequests,
      diagnosticReports,
      documents,
      doctorName,
    ],
  );

  return (
    <div className="space-y-4">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 -mx-1 rounded-md border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 print:hidden">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Clinical Record</p>
            <p className="text-xs text-muted-foreground">
              Edits stage as a draft until you publish
            </p>
          </div>

          <Separator orientation="vertical" className="h-8 hidden sm:block" />

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="size-3.5" />
            <span className="truncate">{patientName}</span>
          </div>

          {appointmentDate && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="size-3.5" />
              <span>{appointmentDate}</span>
            </div>
          )}

          <Badge variant="secondary" className="text-xs font-normal">
            {doctorName}
          </Badge>

          <div className="ml-auto flex items-center gap-3">
            {/* Same wording as every other surface showing this content. */}
            <ReviewBadge approved={isPublished} />

            {/*
              One action, wording chosen by state. Before approval it is the
              call to action that gets the record into the chart; afterwards it
              is the way back in to amend the note or re-run the extraction.
              Both land on the same review page.
            */}
            <Button
              asChild
              size="sm"
              variant={isPublished ? "outline" : "default"}
              className="gap-2"
            >
              <Link href={reviewHref}>
                {isPublished ? (
                  <PenLine className="size-4" />
                ) : (
                  <ClipboardCheck className="size-4" />
                )}
                {isPublished ? "Edit note & entries" : "Review & approve"}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/*
        ── Awaiting-approval notice ──
        Shown until something for this encounter exists in FHIR. Everything on
        this page is then coming from the staging draft or the AI report, which
        looks identical to a real chart entry — so it has to say plainly that
        none of it is in the patient's record yet, and where to go to change
        that. Hidden once published, when the header action is enough.
      */}
      {!isPublished && (
        <ReviewBanner
          subject="note and its clinical entries"
          reviewHref={reviewHref}
        />
      )}

      {/* ── Tabs ── */}
      <Tabs defaultValue="note" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto print:hidden">
          <TabsTrigger value="note" className="gap-1.5">
            <FileText className="size-3.5" />
            Note
          </TabsTrigger>
          <TabsTrigger value="diagnoses" className="gap-1.5">
            <CheckCircle2 className="size-3.5" />
            Diagnoses
          </TabsTrigger>
          <TabsTrigger value="prescriptions" className="gap-1.5">
            <Pill className="size-3.5" />
            Prescriptions
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5">
            <FlaskConical className="size-3.5" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5">
            <FileStack className="size-3.5" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="intake" className="gap-1.5">
            <Brain className="size-3.5" />
            Intake
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5">
            <GitCommitVertical className="size-3.5" />
            Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="note" className="mt-4">
          {/* Read-only. The note is written and approved on the review page —
              the single place that can publish it. Editing it here would stage
              changes on a surface with no way to push them to the chart. */}
          <ConsultationNoteCanvas
            soap={soap}
            readOnly
            /* Stamps a DRAFT line into downloaded copies of an unapproved
               note — the on-screen banner cannot travel with the file. */
            reviewed={isPublished}
            /* The transcript sits with the note it was written from, behind a
               Conversation button, rather than under the Intake tab. */
            transcript={transcript}
            patientName={patientName}
            doctorName={doctorName}
            appointmentDate={appointmentDate}
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <AppointmentTimeline events={timelineEvents} />
        </TabsContent>

        <TabsContent value="diagnoses" className="mt-4">
          <DiagnosesTab
            conditions={conditions}
            onConditionsChange={setConditions}
            observations={observations}
            onObservationsChange={setObservations}
            onPersistCondition={persistFor("condition")}
            onDeleteCondition={deleteFor("condition")}
            onPersistObservation={persistFor("observation")}
            onDeleteObservation={deleteFor("observation")}
          />
        </TabsContent>

        <TabsContent value="prescriptions" className="mt-4">
          <PrescriptionsTab
            medications={medications}
            onMedicationsChange={setMedications}
            onPersistMedication={persistFor("medication")}
            onDeleteMedication={deleteFor("medication")}
            patientName={patientName}
            doctorName={doctorName}
            appointmentDate={appointmentDate}
          />
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <OrdersTab
            serviceRequests={serviceRequests}
            onServiceRequestsChange={setServiceRequests}
            onPersistServiceRequest={persistFor("serviceRequest")}
            onDeleteServiceRequest={deleteFor("serviceRequest")}
            diagnosticReports={diagnosticReports}
            patientId={patientId}
            appointmentId={appointmentId}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentsTab
            documents={documents}
            patientId={patientId}
            encounterId={encounterId}
            appointmentId={appointmentId}
          />
        </TabsContent>

        <TabsContent value="intake" className="mt-4">
          <IntakeTab intake={intake} />
        </TabsContent>
      </Tabs>

    </div>
  );
}
