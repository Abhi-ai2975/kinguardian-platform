/**
 * ObservationFields — drawer body for one Observation entry.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / entries
 *
 * Same field set as the review page's ObservationItem, regrouped into Finding /
 * Value / Clinical detail / Reference range / Notes.
 *
 * Value handling mirrors the publish logic: a numeric value is written as a FHIR
 * quantity (value + unit), anything else as a plain string. The unit field is
 * therefore only meaningful for numeric values, which the helper text says.
 */

"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/modules/client/shared/components/DateTimePicker";
import { ConceptSelect } from "../../../appointment-review/shared/ConceptSelect";
import { TerminologyCombobox } from "../../../appointment-review/shared/TerminologyCombobox";
import {
  OBSERVATION_STATUS,
  TERMINOLOGY_SYSTEM_URL,
  type ObservationFormItem,
} from "../../../appointment-review/types";
import { FieldCell, FieldGroup, FieldRow } from "./FieldGroup";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ObservationFieldsProps {
  /** The observation entry being edited. */
  item: ObservationFormItem;
  /** Called with the full updated entry on any field change. */
  onChange: (item: ObservationFormItem) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Full editor for a single finding or vital sign.
 *
 * @param item - Observation entry.
 * @param onChange - Setter receiving the updated entry.
 */
export function ObservationFields({ item, onChange }: ObservationFieldsProps) {
  const system =
    TERMINOLOGY_SYSTEM_URL[item.terminologySystem] ?? item.terminologySystem;
  const isPublished = item.fhirId != null;

  /* Mirrors the publish rule: numeric → FHIR quantity, otherwise → string. */
  const rawValue = item.editedValue ?? item.value ?? "";
  const isNumeric = rawValue !== "" && !isNaN(parseFloat(rawValue));

  return (
    <>
      <FieldGroup
        title="Finding"
        description="Name the observation, then resolve it to a coded concept."
      >
        <FieldCell label="Name">
          <Input
            value={item.display}
            onChange={(e) => onChange({ ...item, display: e.target.value })}
            placeholder="e.g. Body temperature"
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

      <FieldGroup
        title="Value"
        description={
          isNumeric
            ? "Numeric — stored as a quantity with its unit."
            : "Non-numeric — stored as text; the unit is ignored."
        }
      >
        <FieldRow>
          <FieldCell label="Measured value">
            <Input
              value={rawValue}
              onChange={(e) => onChange({ ...item, editedValue: e.target.value })}
              placeholder="e.g. 38.4"
              className="h-9 text-sm"
            />
          </FieldCell>
          <FieldCell label="Unit">
            <Input
              value={item.editedUnit ?? item.unit ?? ""}
              onChange={(e) => onChange({ ...item, editedUnit: e.target.value })}
              placeholder="e.g. Cel"
              disabled={!isNumeric}
              className="h-9 text-sm"
            />
          </FieldCell>
        </FieldRow>
      </FieldGroup>

      <FieldGroup title="Clinical detail">
        <FieldRow>
          <FieldCell label="Status">
            <ConceptSelect
              resource="Observation"
              field="status"
              value={item.status}
              onChange={(code) => onChange({ ...item, status: code })}
              placeholder="Select status"
              fallback={OBSERVATION_STATUS}
            />
          </FieldCell>
          <FieldCell label="Interpretation" createOnly isPublished={isPublished}>
            <ConceptSelect
              resource="Observation"
              field="interpretation"
              value={item.interpretation}
              onChange={(code) => onChange({ ...item, interpretation: code })}
              placeholder="Normal / High / Low"
            />
          </FieldCell>
        </FieldRow>

        <FieldRow>
          <FieldCell label="Category" createOnly isPublished={isPublished}>
            <ConceptSelect
              resource="Observation"
              field="category"
              value={item.category}
              onChange={(code) => onChange({ ...item, category: code })}
              placeholder="e.g. Vital signs"
            />
          </FieldCell>
          <FieldCell label="Effective">
            <DateTimePicker
              value={item.effectiveDatetime ?? ""}
              onChange={(value) => onChange({ ...item, effectiveDatetime: value })}
              placeholder="Pick date & time…"
            />
          </FieldCell>
        </FieldRow>
      </FieldGroup>

      <FieldGroup
        title="Reference range"
        description="Optional normal bounds for this measurement."
      >
        <FieldRow>
          <FieldCell label="Low" createOnly isPublished={isPublished}>
            <Input
              value={item.refRangeLow ?? ""}
              onChange={(e) =>
                onChange({ ...item, refRangeLow: e.target.value || undefined })
              }
              placeholder="e.g. 36.1"
              inputMode="decimal"
              className="h-9 text-sm"
            />
          </FieldCell>
          <FieldCell label="High" createOnly isPublished={isPublished}>
            <Input
              value={item.refRangeHigh ?? ""}
              onChange={(e) =>
                onChange({ ...item, refRangeHigh: e.target.value || undefined })
              }
              placeholder="e.g. 37.2"
              inputMode="decimal"
              className="h-9 text-sm"
            />
          </FieldCell>
        </FieldRow>

        <FieldCell label="Range unit" createOnly isPublished={isPublished}>
          <Input
            value={item.refRangeUnit ?? ""}
            onChange={(e) =>
              onChange({ ...item, refRangeUnit: e.target.value || undefined })
            }
            placeholder="e.g. Cel"
            className="h-9 text-sm"
          />
        </FieldCell>
      </FieldGroup>

      <FieldGroup title="Notes">
        <FieldCell label="Note" createOnly isPublished={isPublished}>
          <Textarea
            value={item.note ?? ""}
            onChange={(e) =>
              onChange({ ...item, note: e.target.value || undefined })
            }
            placeholder="Anything else worth recording about this finding"
            className="min-h-16 text-sm"
          />
        </FieldCell>
      </FieldGroup>
    </>
  );
}
