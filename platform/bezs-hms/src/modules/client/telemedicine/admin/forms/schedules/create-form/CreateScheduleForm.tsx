/**
 * CreateScheduleForm — tabbed shell for the Create Schedule Sheet.
 *
 * Layer: client / telemedicine / admin / forms
 * Resource: Schedule (FHIR R4)
 *
 * This component is the thin orchestration layer:
 *   - Renders the Tabs list with count badges derived from useWatch
 *   - Mounts each tab as a self-contained component (each owns its own hooks)
 *   - Renders the SheetFooter with submit / cancel actions
 *
 * All field rendering and field arrays live in the individual tab components
 * under `./tabs/`.
 *
 * Pattern: dumb shell — reads form instance from parent's <FormProvider> via
 * useFormContext(). Submission and action wiring live in CreateScheduleModal.
 */

"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Loader2Icon } from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SheetFooter } from "@/components/ui/sheet";
import type { TCreateScheduleFormSchema } from "@/modules/entities/schemas/schedule";

import type { CreateScheduleFormProps } from "./types";
import { BasicTab } from "./tabs/BasicTab";
import { ActorsTab } from "./tabs/ActorsTab";
import { ClassificationTab } from "./tabs/ClassificationTab";
import { IdentifiersTab } from "./tabs/IdentifiersTab";

/**
 * Renders a count badge next to a tab trigger label when items exist.
 * Returns null when count is 0 so inactive tabs stay clean.
 */
function TabCount({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Badge variant="secondary" className="ml-1.5 tabular-nums">
      {count}
    </Badge>
  );
}

/**
 * Full tabbed form shell for creating a schedule.
 * Each tab is self-contained — this component only manages the tab chrome
 * and footer.
 *
 * @param onSubmit  - handleSubmit callback from the parent modal.
 * @param onCancel  - Close callback.
 * @param isPending - Server action in-flight state.
 */
export function CreateScheduleForm({
  onSubmit,
  onCancel,
  isPending,
}: CreateScheduleFormProps) {
  const form = useFormContext<TCreateScheduleFormSchema>();

  const [identifier, specialty, serviceType, serviceCategory, practitionerRoles, locations, healthcareServices] =
    useWatch({
      control: form.control,
      name: [
        "identifier",
        "specialty",
        "service_type",
        "service_category",
        "practitioner_roles",
        "locations",
        "healthcare_services",
      ],
    });

  const actorsCount =
    (practitionerRoles?.length ?? 0) + (locations?.length ?? 0) + (healthcareServices?.length ?? 0);
  const classificationCount =
    (specialty?.length ?? 0) + (serviceType?.length ?? 0) + (serviceCategory?.length ?? 0);

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
            <TabsTrigger value="actors">
              Actors <TabCount count={actorsCount} />
            </TabsTrigger>
            <TabsTrigger value="classification">
              Classification <TabCount count={classificationCount} />
            </TabsTrigger>
            <TabsTrigger value="identifiers">
              Identifiers <TabCount count={identifier?.length ?? 0} />
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="basic" className="flex-1 min-h-0 overflow-y-auto">
          <BasicTab />
        </TabsContent>
        <TabsContent value="actors" className="flex-1 min-h-0 overflow-y-auto">
          <ActorsTab />
        </TabsContent>
        <TabsContent value="classification" className="flex-1 min-h-0 overflow-y-auto">
          <ClassificationTab />
        </TabsContent>
        <TabsContent value="identifiers" className="flex-1 min-h-0 overflow-y-auto">
          <IdentifiersTab />
        </TabsContent>
      </Tabs>

      <SheetFooter className="shrink-0 px-0">
        <Button type="submit" disabled={isPending}>
          {isPending && (
            <Loader2Icon data-icon="inline-start" className="animate-spin" />
          )}
          Create Schedule
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </SheetFooter>
    </form>
  );
}
