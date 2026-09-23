/**
 * ConditionFields — drawer body for one Condition entry.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / entries
 *
 * Same field set as the review page's ConditionItem, regrouped into Diagnosis /
 * Clinical detail / Timing / Notes. Controls are the existing shared components;
 * only the arrangement is new.
 *
 * Datetime fields use DateTimePicker so they are stored as absolute instants —
 * see that component's header for why naive wall-clock strings break.
 */

"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/modules/client/shared/components/DateTimePicker";
import { ConceptSelect } from "../../../appointment-review/shared/ConceptSelect";
import { TerminologyCombobox } from "../../../appointment-review/shared/TerminologyCombobox";
import {
  CONDITION_CLINICAL_STATUS,
  CONDITION_VERIFICATION_STATUS,
  TERMINOLOGY_SYSTEM_URL,
  type ConditionFormItem,
} from "../../../appointment-review/types";
import { FieldCell, FieldGroup, FieldRow } from "./FieldGroup";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConditionFieldsProps {
  /** The condition entry being edited. */
  item: ConditionFormItem;
  /** Called with the full updated entry on any field change. */
  onChange: (item: ConditionFormItem) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Full editor for a single diagnosis.
 *
 * @param item - Condition entry.
 * @param onChange - Setter receiving the updated entry.
 */
export function ConditionFields({ item, onChange }: ConditionFieldsProps) {
  const system =
    TERMINOLOGY_SYSTEM_URL[item.terminologySystem] ?? item.terminologySystem;
  const isPublished = item.fhirId != null;

  return (
    <>
      <FieldGroup
        title="Diagnosis"
        description="Name the condition, then resolve it to a coded concept."
      >
        <FieldCell label="Name">
          <Input
            value={item.display}
            onChange={(e) => onChange({ ...item, display: e.target.value })}
            placeholder="e.g. Acute streptococcal pharyngitis"
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

      <FieldGroup title="Clinical detail">
        <FieldRow>
          <FieldCell label="Clinical status">
            <ConceptSelect
              resource="Condition"
              field="clinicalStatus"
              value={item.clinicalStatus}
              onChange={(code) => onChange({ ...item, clinicalStatus: code })}
              placeholder="Select status"
              fallback={CONDITION_CLINICAL_STATUS}
            />
          </FieldCell>
          <FieldCell label="Verification">
            <ConceptSelect
              resource="Condition"
              field="verificationStatus"
              value={item.verificationStatus}
              onChange={(code) => onChange({ ...item, verificationStatus: code })}
              placeholder="Select verification"
              fallback={CONDITION_VERIFICATION_STATUS}
            />
          </FieldCell>
        </FieldRow>

        <FieldRow>
          <FieldCell label="Severity">
            <ConceptSelect
              resource="Condition"
              field="severity"
              value={item.severity}
              onChange={(code) => onChange({ ...item, severity: code })}
              placeholder="Mild / Moderate / Severe"
            />
          </FieldCell>
          <FieldCell label="Category" createOnly isPublished={isPublished}>
            <ConceptSelect
              resource="Condition"
              field="category"
              value={item.category}
              onChange={(code) => onChange({ ...item, category: code })}
              placeholder="e.g. Encounter diagnosis"
            />
          </FieldCell>
        </FieldRow>
      </FieldGroup>

      <FieldGroup
        title="Timing"
        description="When the condition began and, if applicable, resolved."
      >
        <FieldRow>
          <FieldCell label="Onset">
            <DateTimePicker
              value={item.onsetDatetime ?? ""}
              onChange={(value) => onChange({ ...item, onsetDatetime: value })}
              placeholder="Pick onset date & time…"
            />
          </FieldCell>
          <FieldCell label="Abatement">
            <DateTimePicker
              value={item.abatementDatetime ?? ""}
              onChange={(value) => onChange({ ...item, abatementDatetime: value })}
              placeholder="Pick resolution date & time…"
            />
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
            placeholder="Anything else worth recording about this diagnosis"
            className="min-h-16 text-sm"
          />
        </FieldCell>
      </FieldGroup>
    </>
  );
}
