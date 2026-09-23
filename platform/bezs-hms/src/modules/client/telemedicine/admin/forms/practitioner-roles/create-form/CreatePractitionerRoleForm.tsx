/**
 * CreatePractitionerRoleForm — tabbed shell for the Create PractitionerRole Sheet.
 *
 * Layer: client / telemedicine / admin / forms
 * Resource: PractitionerRole (FHIR R4)
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
 * useFormContext(). Submission and action wiring live in CreatePractitionerRoleModal.
 */

"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Loader2Icon } from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SheetFooter } from "@/components/ui/sheet";
import type { TCreatePractitionerRoleFormSchema } from "@/modules/entities/schemas/practitioner-role";

import type { CreatePractitionerRoleFormProps } from "./types";
import { BasicTab } from "./tabs/BasicTab";
import { ClassificationTab } from "./tabs/ClassificationTab";
import { LocationsServicesTab } from "./tabs/LocationsServicesTab";
import { AvailabilityTab } from "./tabs/AvailabilityTab";
import { ContactsTab } from "./tabs/ContactsTab";
import { IdentifiersTab } from "./tabs/IdentifiersTab";
import { EndpointsTab } from "./tabs/EndpointsTab";

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
 * Full tabbed form shell for creating a practitioner role.
 * Each tab is self-contained — this component only manages the tab chrome
 * and footer.
 *
 * @param onSubmit  - handleSubmit callback from the parent modal.
 * @param onCancel  - Close callback.
 * @param isPending - Server action in-flight state.
 */
export function CreatePractitionerRoleForm({
  onSubmit,
  onCancel,
  isPending,
}: CreatePractitionerRoleFormProps) {
  const form = useFormContext<TCreatePractitionerRoleFormSchema>();

  const [
    code,
    specialty,
    characteristic,
    communication,
    location,
    healthcareService,
    availability,
    contact,
    identifier,
    endpoint,
  ] = useWatch({
    control: form.control,
    name: [
      "code",
      "specialty",
      "characteristic",
      "communication",
      "location",
      "healthcare_service",
      "availability",
      "contact",
      "identifier",
      "endpoint",
    ],
  });

  const classificationCount =
    (code?.length ?? 0) +
    (specialty?.length ?? 0) +
    (characteristic?.length ?? 0) +
    (communication?.length ?? 0);
  const locationsServicesCount = (location?.length ?? 0) + (healthcareService?.length ?? 0);

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
            <TabsTrigger value="classification">
              Classification <TabCount count={classificationCount} />
            </TabsTrigger>
            <TabsTrigger value="locations-services">
              Locations & Services <TabCount count={locationsServicesCount} />
            </TabsTrigger>
            <TabsTrigger value="availability">
              Availability <TabCount count={availability?.length ?? 0} />
            </TabsTrigger>
            <TabsTrigger value="contacts">
              Contacts <TabCount count={contact?.length ?? 0} />
            </TabsTrigger>
            <TabsTrigger value="identifiers">
              Identifiers <TabCount count={identifier?.length ?? 0} />
            </TabsTrigger>
            <TabsTrigger value="endpoints">
              Endpoints <TabCount count={endpoint?.length ?? 0} />
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="basic" className="flex-1 min-h-0 overflow-y-auto">
          <BasicTab />
        </TabsContent>
        <TabsContent value="classification" className="flex-1 min-h-0 overflow-y-auto">
          <ClassificationTab />
        </TabsContent>
        <TabsContent value="locations-services" className="flex-1 min-h-0 overflow-y-auto">
          <LocationsServicesTab />
        </TabsContent>
        <TabsContent value="availability" className="flex-1 min-h-0 overflow-y-auto">
          <AvailabilityTab />
        </TabsContent>
        <TabsContent value="contacts" className="flex-1 min-h-0 overflow-y-auto">
          <ContactsTab />
        </TabsContent>
        <TabsContent value="identifiers" className="flex-1 min-h-0 overflow-y-auto">
          <IdentifiersTab />
        </TabsContent>
        <TabsContent value="endpoints" className="flex-1 min-h-0 overflow-y-auto">
          <EndpointsTab />
        </TabsContent>
      </Tabs>

      <SheetFooter className="shrink-0 px-0">
        <Button type="submit" disabled={isPending}>
          {isPending && (
            <Loader2Icon data-icon="inline-start" className="animate-spin" />
          )}
          Create Practitioner Role
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </SheetFooter>
    </form>
  );
}
