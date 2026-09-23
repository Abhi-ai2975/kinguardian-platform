/**
 * ClinicalExtractionPanel — tabbed panel for reviewing AI-extracted FHIR resources.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review / clinical
 *
 * Shows four tabs: Conditions, Observations, Medications, Orders (ServiceRequests).
 * Each tab badge shows the item count.
 *
 * The "Re-extract" trigger lives on the SOAP Note header in AppointmentReview,
 * not here — a doctor reads re-extraction as an action on the note they just
 * edited, not on the list it produces, and both need the current `soap` state
 * AppointmentReview already owns. This panel only renders what re-extraction
 * (or manual editing) produced.
 *
 * This is the right-hand column of AppointmentReview.
 */

"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConditionList } from "./conditions/ConditionList";
import { ObservationList } from "./observations/ObservationList";
import { MedicationList } from "./medications/MedicationList";
import { ServiceRequestList } from "./service-requests/ServiceRequestList";
import type {
  ConditionFormItem,
  ObservationFormItem,
  MedicationFormItem,
  ServiceRequestFormItem,
} from "../types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClinicalExtractionPanelProps {
  /** Controlled condition list. */
  conditions: ConditionFormItem[];
  /** Controlled observation list. */
  observations: ObservationFormItem[];
  /** Controlled medication list. */
  medications: MedicationFormItem[];
  /** Controlled service request list. */
  serviceRequests: ServiceRequestFormItem[];
  onConditionsChange: (items: ConditionFormItem[]) => void;
  onObservationsChange: (items: ObservationFormItem[]) => void;
  onMedicationsChange: (items: MedicationFormItem[]) => void;
  onServiceRequestsChange: (items: ServiceRequestFormItem[]) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Tabbed panel for reviewing and editing AI-extracted FHIR clinical resources.
 *
 * @param conditions - Controlled condition items.
 * @param observations - Controlled observation items.
 * @param medications - Controlled medication items.
 * @param serviceRequests - Controlled service request items.
 */
export function ClinicalExtractionPanel({
  conditions,
  observations,
  medications,
  serviceRequests,
  onConditionsChange,
  onObservationsChange,
  onMedicationsChange,
  onServiceRequestsChange,
}: ClinicalExtractionPanelProps) {
  return (
    <Tabs defaultValue="conditions" className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-2 shrink-0">
        <TabsList className="flex-1 grid grid-cols-4">
          <TabsTrigger value="conditions" className="text-xs">
            Conditions
            {conditions.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-primary/10 text-primary rounded-full px-1.5 py-0.5 leading-none">
                {conditions.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="observations" className="text-xs">
            Observations
            {observations.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-primary/10 text-primary rounded-full px-1.5 py-0.5 leading-none">
                {observations.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="medications" className="text-xs">
            Medications
            {medications.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-primary/10 text-primary rounded-full px-1.5 py-0.5 leading-none">
                {medications.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="orders" className="text-xs">
            Orders
            {serviceRequests.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-primary/10 text-primary rounded-full px-1.5 py-0.5 leading-none">
                {serviceRequests.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Tab content panels — native overflow, not shadcn's ScrollArea; see
          EditableList.tsx for why that component is being moved away from
          across this feature. */}
      <div className="flex-1 min-h-0 mt-3">
        <TabsContent value="conditions" className="h-full m-0 overflow-y-auto pr-1">
          <ConditionList items={conditions} onChange={onConditionsChange} />
        </TabsContent>

        <TabsContent value="observations" className="h-full m-0 overflow-y-auto pr-1">
          <ObservationList items={observations} onChange={onObservationsChange} />
        </TabsContent>

        <TabsContent value="medications" className="h-full m-0 overflow-y-auto pr-1">
          <MedicationList items={medications} onChange={onMedicationsChange} />
        </TabsContent>

        <TabsContent value="orders" className="h-full m-0 overflow-y-auto pr-1">
          <ServiceRequestList
            items={serviceRequests}
            onChange={onServiceRequestsChange}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}
