/**
 * AppointmentReportTabs — two-tab layout for the appointment detail page.
 *
 * Layer: client / telemedicine / shared / components / appointment
 *
 * Tabs:
 *   "Intake Report"  — AI pre-intake assessment (IntakeReportSection)
 *   "Doctor Report"  — Post-consultation SOAP note + confirmed FHIR records
 *                      (DoctorReportSection)
 *
 * Used on both the doctor and patient appointment detail pages.
 * This is a client component because shadcn Tabs requires React state.
 * All data is received as props from the server page.
 */

"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Stethoscope } from "lucide-react";
import { IntakeReportSection } from "./IntakeReportSection";
import { DoctorReportSection, type DoctorReportSectionProps } from "./DoctorReportSection";
import type { TIntakeResponse } from "@/modules/entities/schemas/intake";
import type { TServiceRequestResponse } from "@/modules/entities/schemas/service-request";
import { patientStore } from "@/modules/client/telemedicine/patient/stores/patient.store";

// ── Props ─────────────────────────────────────────────────────────────────────

/** Combined props for the two-tab report layout. */
interface AppointmentReportTabsProps {
  /**
   * Full intake record for the Intake Report tab.
   * Passed directly to IntakeReportSection which handles its own empty state.
   */
  intake: TIntakeResponse | null | undefined;
  /**
   * Doctor report data for the Doctor Report tab.
   * Passed directly to DoctorReportSection which handles its own empty state.
   */
  doctorReport: DoctorReportSectionProps;
  /**
   * When true, renders an "Upload Result" button on each ServiceRequest card.
   * Pass from the patient appointment detail page only — the doctor view omits this.
   */
  isPatientView?: boolean;
  /**
   * Whether the doctor approved this consultation's report
   * (`Consultation.published_at != null`).
   *
   * Drives who sees the SOAP note: the doctor always does, tagged when it is
   * still a draft; the patient only once it is approved. Defaults to true so a
   * caller that has no consultation to check behaves as before.
   */
  reviewed?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Two-tab card layout showing the AI intake report and the doctor's
 * post-consultation report side by side.
 *
 * @param intake        - Intake record (AI pre-intake assessment + conversation).
 * @param doctorReport  - Doctor report data (SOAP + FHIR records).
 * @param isPatientView - When true, adds an "Upload Result" button to ServiceRequest cards.
 */
export function AppointmentReportTabs({
  intake,
  doctorReport,
  isPatientView = false,
  reviewed = true,
}: AppointmentReportTabsProps) {
  /**
   * Opens the upload-result modal for the given ServiceRequest.
   * Only wired on the patient view — undefined on the doctor view.
   */
  const onUploadResult = isPatientView
    ? (sr: TServiceRequestResponse) =>
        patientStore.getState().onOpen({
          type: "uploadResult",
          data: {
            serviceRequestId: sr.id,
            serviceRequestCode: sr.code_display ?? sr.code_text ?? undefined,
            patientFhirId: sr.subject_id ?? undefined,
          },
        })
    : undefined;
  return (
    <Tabs defaultValue="intake" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="intake" className="flex items-center gap-1.5">
          <Brain className="size-3.5" />
          Intake Report
        </TabsTrigger>
        <TabsTrigger value="doctor" className="flex items-center gap-1.5">
          <Stethoscope className="size-3.5" />
          Doctor Report
        </TabsTrigger>
      </TabsList>

      {/* Intake Report tab */}
      <TabsContent value="intake" className="mt-4">
        <IntakeReportSection intake={intake} />
      </TabsContent>

      {/* Doctor Report tab */}
      <TabsContent value="doctor" className="mt-4">
        <DoctorReportSection
          {...doctorReport}
          onUploadResult={onUploadResult}
          reviewed={reviewed}
          isPatientView={isPatientView}
        />
      </TabsContent>
    </Tabs>
  );
}
