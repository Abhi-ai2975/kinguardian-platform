/**
 * ServiceRequestFields — drawer body for one ServiceRequest (order) entry.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / entries
 *
 * Same field set as the review page's ServiceRequestItem, regrouped into Order /
 * Classification / Scheduling / Instructions.
 *
 * Note that results can only be attached to an order that has been published —
 * a DiagnosticReport must reference a real ServiceRequest. The Orders tab shows
 * that state; nothing here depends on it.
 */

"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/modules/client/shared/components/DateTimePicker";
import { ConceptSelect } from "../../../appointment-review/shared/ConceptSelect";
import { TerminologyCombobox } from "../../../appointment-review/shared/TerminologyCombobox";
import {
  SERVICE_REQUEST_INTENT,
  SERVICE_REQUEST_PRIORITY,
  SERVICE_REQUEST_STATUS,
  TERMINOLOGY_SYSTEM_URL,
  type ServiceRequestFormItem,
} from "../../../appointment-review/types";
import { FieldCell, FieldGroup, FieldRow } from "./FieldGroup";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ServiceRequestFieldsProps {
  /** The order entry being edited. */
  item: ServiceRequestFormItem;
  /** Called with the full updated entry on any field change. */
  onChange: (item: ServiceRequestFormItem) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Full editor for a single test or investigation order.
 *
 * @param item - Service request entry.
 * @param onChange - Setter receiving the updated entry.
 */
export function ServiceRequestFields({
  item,
  onChange,
}: ServiceRequestFieldsProps) {
  const system =
    TERMINOLOGY_SYSTEM_URL[item.terminologySystem] ?? item.terminologySystem;
  const isPublished = item.fhirId != null;

  return (
    <>
      <FieldGroup
        title="Order"
        description="Name the test or investigation, then resolve it to a coded concept."
      >
        <FieldCell label="Name">
          <Input
            value={item.display}
            onChange={(e) => onChange({ ...item, display: e.target.value })}
            placeholder="e.g. Full blood count"
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

      <FieldGroup title="Classification">
        <FieldRow>
          <FieldCell label="Status">
            <ConceptSelect
              resource="ServiceRequest"
              field="status"
              value={item.status}
              onChange={(code) => onChange({ ...item, status: code })}
              placeholder="Select status"
              fallback={SERVICE_REQUEST_STATUS}
            />
          </FieldCell>
          <FieldCell label="Intent">
            <ConceptSelect
              resource="ServiceRequest"
              field="intent"
              value={item.intent}
              onChange={(code) => onChange({ ...item, intent: code })}
              placeholder="Select intent"
              fallback={SERVICE_REQUEST_INTENT}
            />
          </FieldCell>
        </FieldRow>

        <FieldRow>
          <FieldCell label="Priority">
            <ConceptSelect
              resource="ServiceRequest"
              field="priority"
              value={item.priority}
              onChange={(code) => onChange({ ...item, priority: code })}
              placeholder="Routine / Urgent / STAT"
              fallback={SERVICE_REQUEST_PRIORITY}
            />
          </FieldCell>
          <FieldCell label="Category" createOnly isPublished={isPublished}>
            <ConceptSelect
              resource="ServiceRequest"
              field="category"
              value={item.category}
              onChange={(code) => onChange({ ...item, category: code })}
              placeholder="e.g. Laboratory"
            />
          </FieldCell>
        </FieldRow>

        <FieldCell label="Reason / indication" createOnly isPublished={isPublished}>
          <Input
            value={item.reasonCode ?? ""}
            onChange={(e) =>
              onChange({ ...item, reasonCode: e.target.value || undefined })
            }
            placeholder="e.g. Rule out bacterial infection"
            className="h-9 text-sm"
          />
        </FieldCell>
      </FieldGroup>

      <FieldGroup title="Scheduling">
        <FieldRow>
          <FieldCell label="Perform on">
            <DateTimePicker
              value={item.occurrenceDatetime ?? ""}
              onChange={(value) => onChange({ ...item, occurrenceDatetime: value })}
              placeholder="Pick date & time…"
            />
          </FieldCell>
          <FieldCell label="As needed (PRN)">
            <div className="flex h-9 items-center gap-2">
              <Switch
                checked={item.asNeeded ?? false}
                onCheckedChange={(checked) =>
                  onChange({ ...item, asNeeded: checked })
                }
              />
              <span className="text-sm text-muted-foreground">
                {item.asNeeded ? "Only when required" : "Scheduled"}
              </span>
            </div>
          </FieldCell>
        </FieldRow>
      </FieldGroup>

      <FieldGroup title="Instructions">
        <FieldCell label="Patient instructions">
          <Textarea
            value={item.patientInstruction ?? ""}
            onChange={(e) =>
              onChange({
                ...item,
                patientInstruction: e.target.value || undefined,
              })
            }
            placeholder="e.g. Fast for 8 hours before the test"
            className="min-h-16 text-sm"
          />
        </FieldCell>

        <FieldCell label="Note" createOnly isPublished={isPublished}>
          <Textarea
            value={item.note ?? ""}
            onChange={(e) =>
              onChange({ ...item, note: e.target.value || undefined })
            }
            placeholder="Anything else worth recording about this order"
            className="min-h-16 text-sm"
          />
        </FieldCell>
      </FieldGroup>
    </>
  );
}
