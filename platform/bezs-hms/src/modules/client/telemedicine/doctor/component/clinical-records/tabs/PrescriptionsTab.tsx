/**
 * PrescriptionsTab — MedicationRequest entries plus a printable Rx sheet.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / tabs
 *
 * Two modes over the same list:
 *   Edit    — compact entry rows with a detail drawer per prescription
 *   Preview — a clean, print-friendly sheet the doctor can hand to the patient
 *
 * Preview reads the same state, so what prints is exactly what will publish. It
 * deliberately shows only the fields a pharmacist needs.
 */

"use client";

import { useState } from "react";
import { Pencil, Pill, Printer, ScrollText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ClinicalEntryList } from "../entries/ClinicalEntryList";
import { MedicationFields } from "../entries/fields/MedicationFields";
import { medicationSummary } from "../entries/summaries";
import type { MedicationFormItem } from "../../appointment-review/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolves a dosage field, preferring the doctor's edit over the AI original.
 *
 * @param edited - Doctor-edited value, if any.
 * @param original - Original value.
 * @returns The value to display, or null when neither is set.
 */
function effective(
  edited: string | undefined,
  original: string | null | undefined,
): string | null {
  return edited ?? original ?? null;
}

/**
 * Builds the one-line "Sig" a pharmacist reads.
 *
 * @param item - The medication entry.
 * @returns Assembled sig, or a placeholder when nothing is recorded.
 */
function buildSig(item: MedicationFormItem): string {
  const parts = [
    effective(item.editedDose, item.dose),
    effective(item.editedRoute, item.route),
    effective(item.editedFrequency, item.frequency),
    effective(item.editedDuration, item.duration),
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "No dosage recorded";
}

/** Creates a blank prescription. RxNorm is the default system for drugs. */
function emptyMedication(): MedicationFormItem {
  return {
    id: crypto.randomUUID(),
    display: "",
    terminologySystem: "RXNORM",
    dose: null,
    frequency: null,
    duration: null,
    route: null,
    status: "active",
    intent: "order",
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface PrescriptionsTabProps {
  /** Current medication items. */
  medications: MedicationFormItem[];
  /** Called with the full updated list on any add/edit/remove. */
  onMedicationsChange: (items: MedicationFormItem[]) => void;
  /** Writes one medication to the EMR, resolving to its FHIR id. */
  onPersistMedication: (item: MedicationFormItem) => Promise<number>;
  /** Removes one medication from the EMR. */
  onDeleteMedication: (item: MedicationFormItem) => Promise<void>;
  /** Patient display name for the printable sheet. */
  patientName: string;
  /** Prescriber display name for the printable sheet. */
  doctorName: string;
  /** Formatted appointment date for the printable sheet. */
  appointmentDate: string | null;
}

// ── Preview ───────────────────────────────────────────────────────────────────

/**
 * Print-friendly prescription sheet.
 *
 * @param medications - Medications to list.
 * @param patientName - Patient the Rx is for.
 * @param doctorName - Prescriber.
 * @param appointmentDate - Date of the visit.
 */
function RxPreview({
  medications,
  patientName,
  doctorName,
  appointmentDate,
}: {
  medications: MedicationFormItem[];
  patientName: string;
  doctorName: string;
  appointmentDate: string | null;
}) {
  if (medications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
        <ScrollText className="size-8 opacity-40" />
        <p className="text-sm">No prescriptions to preview.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-md border bg-background p-6 print:border-0 print:p-0">
      {/* Letterhead */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-lg font-semibold tracking-tight">Prescription</p>
          <p className="text-xs text-muted-foreground">
            Patient: <span className="text-foreground">{patientName}</span>
          </p>
          {appointmentDate && (
            <p className="text-xs text-muted-foreground">
              Date: <span className="text-foreground">{appointmentDate}</span>
            </p>
          )}
        </div>
        <div className="space-y-0.5 text-right">
          <p className="text-sm font-medium">{doctorName}</p>
          <p className="text-xs text-muted-foreground">Prescriber</p>
        </div>
      </div>

      <Separator />

      <ol className="space-y-4">
        {medications.map((m, i) => (
          <li key={m.id} className="flex gap-3">
            <span className="pt-0.5 font-mono text-sm text-muted-foreground">
              {i + 1}.
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium">
                {m.display || "Unnamed medication"}
              </p>
              <p className="text-sm text-muted-foreground">{buildSig(m)}</p>

              {m.patientInstruction && (
                <p className="text-xs italic text-muted-foreground">
                  {m.patientInstruction}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {m.dispenseQuantityValue && (
                  <span>
                    Qty: {m.dispenseQuantityValue}
                    {m.dispenseQuantityUnit ? ` ${m.dispenseQuantityUnit}` : ""}
                  </span>
                )}
                {m.dispenseRepeatsAllowed != null && (
                  <span>Refills: {m.dispenseRepeatsAllowed}</span>
                )}
                {m.substitutionAllowed === false && (
                  <span className="font-medium">Do not substitute</span>
                )}
                {m.reasonCode && <span>Indication: {m.reasonCode}</span>}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <Separator />

      <p className="text-[11px] text-muted-foreground">
        Generated from the electronic medical record. Verify all dosages before
        dispensing.
      </p>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Prescription management with an edit/preview toggle.
 *
 * @param props - See PrescriptionsTabProps.
 */
export function PrescriptionsTab({
  medications,
  onMedicationsChange,
  onPersistMedication,
  onDeleteMedication,
  patientName,
  doctorName,
  appointmentDate,
}: PrescriptionsTabProps) {
  /** False = edit the list, true = show the printable sheet. */
  const [previewing, setPreviewing] = useState(false);

  if (!previewing) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setPreviewing(true)}
          >
            <ScrollText className="size-3.5" />
            Preview prescription
          </Button>
        </div>

        <ClinicalEntryList
          items={medications}
          onChange={onMedicationsChange}
          icon={Pill}
          title="Prescriptions"
          addLabel="Add medication"
          emptyLabel="No prescriptions for this visit."
          createItem={emptyMedication}
          summary={medicationSummary}
          onPersistItem={onPersistMedication}
          onDeleteItem={onDeleteMedication}
          renderFields={(item, onItemChange) => (
            <MedicationFields item={item} onChange={onItemChange} />
          )}
        />
      </div>
    );
  }

  return (
    <Card className="print:border-0 print:shadow-none">
      <CardContent className="space-y-3 px-4 py-3.5">
        <div className="flex items-center gap-2 print:hidden">
          <Pill className="size-4 text-primary" />
          <p className="text-sm font-semibold">Prescription preview</p>

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setPreviewing(false)}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => window.print()}
            >
              <Printer className="size-3.5" />
              Print
            </Button>
          </div>
        </div>

        <Separator className="print:hidden" />

        <RxPreview
          medications={medications}
          patientName={patientName}
          doctorName={doctorName}
          appointmentDate={appointmentDate}
        />
      </CardContent>
    </Card>
  );
}
