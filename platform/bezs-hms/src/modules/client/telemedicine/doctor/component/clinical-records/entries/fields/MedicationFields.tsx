/**
 * MedicationFields — drawer body for one MedicationRequest entry.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / entries
 *
 * Same field set as the review page's MedicationItem, regrouped into Code /
 * Dosage / Classification / Dispensing / Notes rather than one flat run of
 * fifteen controls. The controls themselves are the existing shared components
 * (TerminologyCombobox, ConceptSelect) — only the arrangement is new.
 *
 * Dosage edits write to the `edited*` fields rather than overwriting the AI's
 * originals, matching the form-item contract the publish diff expects.
 */

"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ConceptSelect } from "../../../appointment-review/shared/ConceptSelect";
import { TerminologyCombobox } from "../../../appointment-review/shared/TerminologyCombobox";
import {
  MEDICATION_REQUEST_INTENT,
  MEDICATION_REQUEST_STATUS,
  TERMINOLOGY_SYSTEM_URL,
  type MedicationFormItem,
} from "../../../appointment-review/types";
import { FieldCell, FieldGroup, FieldRow } from "./FieldGroup";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MedicationFieldsProps {
  /** The medication entry being edited. */
  item: MedicationFormItem;
  /** Called with the full updated entry on any field change. */
  onChange: (item: MedicationFormItem) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Full editor for a single prescription.
 *
 * @param item - Medication entry.
 * @param onChange - Setter receiving the updated entry.
 */
export function MedicationFields({ item, onChange }: MedicationFieldsProps) {
  const system =
    TERMINOLOGY_SYSTEM_URL[item.terminologySystem] ?? item.terminologySystem;
  const isPublished = item.fhirId != null;

  return (
    <>
      <FieldGroup
        title="Medication"
        description="Name the drug, then resolve it to a coded concept."
      >
        <FieldCell label="Name">
          <Input
            value={item.display}
            onChange={(e) => onChange({ ...item, display: e.target.value })}
            placeholder="e.g. Amoxicillin 500 mg"
            className="h-9 text-sm"
          />
        </FieldCell>

        <FieldCell label={`Terminology code (${item.terminologySystem})`}>
          <TerminologyCombobox
            system={system}
            initialQuery={item.display}
            value={item.resolved ?? null}
            onChange={(concept) =>
              onChange({ ...item, resolved: concept ?? undefined })
            }
            placeholder={`Search ${item.terminologySystem}…`}
          />
        </FieldCell>
      </FieldGroup>

      <FieldGroup title="Dosage">
        <FieldRow>
          <FieldCell label="Dose">
            <Input
              value={item.editedDose ?? item.dose ?? ""}
              onChange={(e) => onChange({ ...item, editedDose: e.target.value })}
              placeholder="e.g. 500 mg"
              className="h-9 text-sm"
            />
          </FieldCell>
          <FieldCell label="Route">
            <Input
              value={item.editedRoute ?? item.route ?? ""}
              onChange={(e) => onChange({ ...item, editedRoute: e.target.value })}
              placeholder="e.g. Oral"
              className="h-9 text-sm"
            />
          </FieldCell>
        </FieldRow>

        <FieldRow>
          <FieldCell label="Frequency">
            <Input
              value={item.editedFrequency ?? item.frequency ?? ""}
              onChange={(e) =>
                onChange({ ...item, editedFrequency: e.target.value })
              }
              placeholder="e.g. Three times daily"
              className="h-9 text-sm"
            />
          </FieldCell>
          <FieldCell label="Duration">
            <Input
              value={item.editedDuration ?? item.duration ?? ""}
              onChange={(e) =>
                onChange({ ...item, editedDuration: e.target.value })
              }
              placeholder="e.g. 7 days"
              className="h-9 text-sm"
            />
          </FieldCell>
        </FieldRow>

        <FieldCell
          label="Patient instructions"
          createOnly
          isPublished={isPublished}
        >
          <Textarea
            value={item.patientInstruction ?? ""}
            onChange={(e) =>
              onChange({ ...item, patientInstruction: e.target.value || undefined })
            }
            placeholder="e.g. Take after food with a full glass of water"
            className="min-h-16 text-sm"
          />
        </FieldCell>
      </FieldGroup>

      <FieldGroup title="Classification">
        <FieldRow>
          <FieldCell label="Status">
            <ConceptSelect
              resource="MedicationRequest"
              field="status"
              value={item.status}
              onChange={(code) => onChange({ ...item, status: code })}
              placeholder="Select status"
              fallback={MEDICATION_REQUEST_STATUS}
            />
          </FieldCell>
          <FieldCell label="Intent">
            <ConceptSelect
              resource="MedicationRequest"
              field="intent"
              value={item.intent}
              onChange={(code) => onChange({ ...item, intent: code })}
              placeholder="Select intent"
              fallback={MEDICATION_REQUEST_INTENT}
            />
          </FieldCell>
        </FieldRow>

        <FieldRow>
          <FieldCell label="Priority">
            <ConceptSelect
              resource="MedicationRequest"
              field="priority"
              value={item.priority}
              onChange={(code) => onChange({ ...item, priority: code })}
              placeholder="Select priority"
            />
          </FieldCell>
          <FieldCell label="Course of therapy">
            <ConceptSelect
              resource="MedicationRequest"
              field="courseOfTherapyType"
              value={item.courseOfTherapyType}
              onChange={(code) => onChange({ ...item, courseOfTherapyType: code })}
              placeholder="Acute / Chronic…"
            />
          </FieldCell>
        </FieldRow>

        <FieldCell label="Indication" createOnly isPublished={isPublished}>
          <Input
            value={item.reasonCode ?? ""}
            onChange={(e) =>
              onChange({ ...item, reasonCode: e.target.value || undefined })
            }
            placeholder="e.g. Acute bacterial pharyngitis"
            className="h-9 text-sm"
          />
        </FieldCell>
      </FieldGroup>

      <FieldGroup title="Dispensing">
        <FieldRow>
          <FieldCell label="Quantity">
            <Input
              value={item.dispenseQuantityValue ?? ""}
              onChange={(e) =>
                onChange({
                  ...item,
                  dispenseQuantityValue: e.target.value || undefined,
                })
              }
              placeholder="e.g. 21"
              inputMode="decimal"
              className="h-9 text-sm"
            />
          </FieldCell>
          <FieldCell label="Quantity unit">
            <Input
              value={item.dispenseQuantityUnit ?? ""}
              onChange={(e) =>
                onChange({
                  ...item,
                  dispenseQuantityUnit: e.target.value || undefined,
                })
              }
              placeholder="e.g. tablets"
              className="h-9 text-sm"
            />
          </FieldCell>
        </FieldRow>

        <FieldRow>
          <FieldCell label="Refills allowed">
            <Input
              value={
                item.dispenseRepeatsAllowed != null
                  ? String(item.dispenseRepeatsAllowed)
                  : ""
              }
              onChange={(e) => {
                const parsed = parseInt(e.target.value, 10);
                onChange({
                  ...item,
                  dispenseRepeatsAllowed: isNaN(parsed) ? undefined : parsed,
                });
              }}
              placeholder="e.g. 0"
              inputMode="numeric"
              className="h-9 text-sm"
            />
          </FieldCell>
          <FieldCell label="Generic substitution">
            <div className="flex h-9 items-center gap-2">
              <Switch
                checked={item.substitutionAllowed ?? false}
                onCheckedChange={(checked) =>
                  onChange({ ...item, substitutionAllowed: checked })
                }
              />
              <span className="text-sm text-muted-foreground">
                {item.substitutionAllowed ? "Allowed" : "Do not substitute"}
              </span>
            </div>
          </FieldCell>
        </FieldRow>
      </FieldGroup>

      <FieldGroup title="Notes">
        <FieldCell label="Note" createOnly isPublished={isPublished}>
          <Textarea
            value={item.note ?? ""}
            onChange={(e) =>
              onChange({ ...item, note: e.target.value || undefined })
            }
            placeholder="Anything else worth recording about this prescription"
            className="min-h-16 text-sm"
          />
        </FieldCell>
      </FieldGroup>
    </>
  );
}
