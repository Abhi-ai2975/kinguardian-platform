/**
 * CreateHealthcareServiceForm — tabbed shell for the Create Healthcare
 * Service Sheet.
 *
 * Layer: client / telemedicine / admin / forms
 * Resource: HealthcareService (FHIR R4)
 *
 * This component is the thin orchestration layer:
 *   - Renders the Tabs list with count badges derived from useWatch
 *   - Mounts each tab as a self-contained component (each owns its own hooks)
 *   - Renders the SheetFooter with submit / cancel actions
 *
 * All field rendering and field arrays live in the individual tab components
 * under `./tabs/`. The 8 CodeableConcept array fields share one component
 * (`../CodeableConceptRepeatableField`) rather than duplicating the same
 * TerminologySelect-per-row pattern 8 times.
 *
 * Pattern: dumb shell — reads form instance from parent's <FormProvider> via
 * useFormContext(). Submission and action wiring live in
 * CreateHealthcareServiceModal. Uses SheetFooter (not DialogFooter) since
 * this is a right-side Sheet, matching Organization/Location.
 *
 * Photo tab uses HealthcareServicePhotoUpload (FileNest integration) —
 * requires the parent modal to wrap this form in a <FileNestProvider>.
 */

"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Loader2Icon } from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SheetFooter } from "@/components/ui/sheet";
import type { TCreateHealthcareServiceFormSchema } from "@/modules/entities/schemas/healthcare-service";

import type { CreateHealthcareServiceFormProps } from "./types";
import { BasicTab } from "./tabs/BasicTab";
import { PhotoTab } from "./tabs/PhotoTab";
import { ProvidedByLocationsTab } from "./tabs/ProvidedByLocationsTab";
import { ClassificationTab } from "./tabs/ClassificationTab";
import { IdentifiersTab } from "./tabs/IdentifiersTab";
import { TelecomsTab } from "./tabs/TelecomsTab";
import { ProgramsLanguagesTab } from "./tabs/ProgramsLanguagesTab";
import { CharacteristicsReferralTab } from "./tabs/CharacteristicsReferralTab";
import { EligibilityTab } from "./tabs/EligibilityTab";
import { AvailabilityTab } from "./tabs/AvailabilityTab";

/** Renders a count badge next to a tab trigger label when items exist. */
function TabCount({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Badge variant="secondary" className="ml-1.5 tabular-nums">
      {count}
    </Badge>
  );
}

/** Sums the lengths of several possibly-undefined arrays — used for combined tab badges. */
function sumLengths(...arrays: (unknown[] | undefined)[]): number {
  return arrays.reduce((total, arr) => total + (arr?.length ?? 0), 0);
}

/**
 * Full tabbed form shell for creating a healthcare service.
 * Each tab is self-contained — this component only manages the tab chrome
 * and footer.
 */
export function CreateHealthcareServiceForm({
  onSubmit,
  onCancel,
  isPending,
}: CreateHealthcareServiceFormProps) {
  const form = useFormContext<TCreateHealthcareServiceFormSchema>();

  const [
    location,
    coverageArea,
    category,
    type,
    specialty,
    serviceProvisionCode,
    identifier,
    telecom,
    program,
    communication,
    characteristic,
    referralMethod,
    availableTime,
    notAvailable,
  ] = useWatch({
    control: form.control,
    name: [
      "location",
      "coverage_area",
      "category",
      "type",
      "specialty",
      "service_provision_code",
      "identifier",
      "telecom",
      "program",
      "communication",
      "characteristic",
      "referral_method",
      "available_time",
      "not_available",
    ],
  });

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col flex-1 min-h-0 gap-4 overflow-hidden px-4 pt-4"
    >
      <Tabs
        defaultValue="basic"
        className="flex flex-col flex-1 min-h-0 overflow-hidden"
      >
        <div className="shrink-0 overflow-x-auto pb-1">
          <TabsList className="w-max">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="photo">Photo</TabsTrigger>
            <TabsTrigger value="links">
              Provided By &amp; Locations <TabCount count={sumLengths(location, coverageArea)} />
            </TabsTrigger>
            <TabsTrigger value="classification">
              Classification <TabCount count={sumLengths(category, type, specialty, serviceProvisionCode)} />
            </TabsTrigger>
            <TabsTrigger value="identifiers">
              Identifiers <TabCount count={identifier?.length ?? 0} />
            </TabsTrigger>
            <TabsTrigger value="telecoms">
              Telecoms <TabCount count={telecom?.length ?? 0} />
            </TabsTrigger>
            <TabsTrigger value="programs">
              Programs &amp; Languages <TabCount count={sumLengths(program, communication)} />
            </TabsTrigger>
            <TabsTrigger value="characteristics">
              Characteristics &amp; Referral <TabCount count={sumLengths(characteristic, referralMethod)} />
            </TabsTrigger>
            <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
            <TabsTrigger value="availability">
              Availability <TabCount count={sumLengths(availableTime, notAvailable)} />
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="basic" className="flex-1 min-h-0 overflow-y-auto">
          <BasicTab />
        </TabsContent>
        <TabsContent value="photo" className="flex-1 min-h-0 overflow-y-auto">
          <PhotoTab />
        </TabsContent>
        <TabsContent value="links" className="flex-1 min-h-0 overflow-y-auto">
          <ProvidedByLocationsTab />
        </TabsContent>
        <TabsContent value="classification" className="flex-1 min-h-0 overflow-y-auto">
          <ClassificationTab />
        </TabsContent>
        <TabsContent value="identifiers" className="flex-1 min-h-0 overflow-y-auto">
          <IdentifiersTab />
        </TabsContent>
        <TabsContent value="telecoms" className="flex-1 min-h-0 overflow-y-auto">
          <TelecomsTab />
        </TabsContent>
        <TabsContent value="programs" className="flex-1 min-h-0 overflow-y-auto">
          <ProgramsLanguagesTab />
        </TabsContent>
        <TabsContent value="characteristics" className="flex-1 min-h-0 overflow-y-auto">
          <CharacteristicsReferralTab />
        </TabsContent>
        <TabsContent value="eligibility" className="flex-1 min-h-0 overflow-y-auto">
          <EligibilityTab />
        </TabsContent>
        <TabsContent value="availability" className="flex-1 min-h-0 overflow-y-auto">
          <AvailabilityTab />
        </TabsContent>
      </Tabs>

      <SheetFooter className="shrink-0 px-0">
        <Button type="submit" disabled={isPending}>
          {isPending && (
            <Loader2Icon data-icon="inline-start" className="animate-spin" />
          )}
          Create Service
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </SheetFooter>
    </form>
  );
}
