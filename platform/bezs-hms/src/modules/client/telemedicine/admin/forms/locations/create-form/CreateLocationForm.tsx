/**
 * CreateLocationForm — tabbed shell for the Create Location Sheet.
 *
 * Layer: client / telemedicine / admin / forms
 * Resource: Location (FHIR R4)
 *
 * This component is the thin orchestration layer:
 *   - Renders the Tabs list with count badges derived from useWatch
 *   - Mounts each tab as a self-contained component (each owns its own hooks)
 *   - Renders the SheetFooter with submit / cancel actions
 *
 * All field rendering and field arrays live in the individual tab components
 * under `./tabs/`. Shared constants in `./constants.ts`.
 *
 * Pattern: dumb shell — reads form instance from parent's <FormProvider> via
 * useFormContext(). Submission and action wiring live in CreateLocationModal.
 * Uses SheetFooter (not DialogFooter) since the Create/Edit Location modal is
 * a right-side Sheet, not a centered Dialog — see CreateLocationModal.
 */

"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Loader2Icon } from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SheetFooter } from "@/components/ui/sheet";
import type { TCreateLocationFormSchema } from "@/modules/entities/schemas/location";

import type { CreateLocationFormProps } from "./types";
import { BasicTab } from "./tabs/BasicTab";
import { AddressTab } from "./tabs/AddressTab";
import { PhysicalRelationshipsTab } from "./tabs/PhysicalRelationshipsTab";
import { IdentifiersTab } from "./tabs/IdentifiersTab";
import { TelecomsTab } from "./tabs/TelecomsTab";
import { HoursAvailabilityTab } from "./tabs/HoursAvailabilityTab";
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
 * Full tabbed form shell for creating a location.
 * Each tab is self-contained — this component only manages the tab chrome
 * and footer.
 *
 * @param onSubmit  - handleSubmit callback from the parent modal.
 * @param onCancel  - Close callback.
 * @param isPending - Server action in-flight state.
 */
export function CreateLocationForm({
  onSubmit,
  onCancel,
  isPending,
}: CreateLocationFormProps) {
  const form = useFormContext<TCreateLocationFormSchema>();

  /**
   * Watch all array fields just for badge counts.
   * Individual tabs own their own useFieldArray subscriptions for mutations.
   */
  const [types, identifiers, telecoms, hoursOfOperation, endpoints] = useWatch({
    control: form.control,
    name: ["types", "identifiers", "telecoms", "hours_of_operation", "endpoints"],
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
            <TabsTrigger value="basic">
              Basic <TabCount count={types?.length ?? 0} />
            </TabsTrigger>
            <TabsTrigger value="address">Address</TabsTrigger>
            <TabsTrigger value="physical">Physical &amp; Relationships</TabsTrigger>
            <TabsTrigger value="identifiers">
              Identifiers <TabCount count={identifiers?.length ?? 0} />
            </TabsTrigger>
            <TabsTrigger value="telecoms">
              Telecoms <TabCount count={telecoms?.length ?? 0} />
            </TabsTrigger>
            <TabsTrigger value="hours">
              Hours &amp; Availability <TabCount count={hoursOfOperation?.length ?? 0} />
            </TabsTrigger>
            <TabsTrigger value="endpoints">
              Endpoints <TabCount count={endpoints?.length ?? 0} />
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="basic" className="flex-1 min-h-0 overflow-y-auto">
          <BasicTab />
        </TabsContent>
        <TabsContent value="address" className="flex-1 min-h-0 overflow-y-auto">
          <AddressTab />
        </TabsContent>
        <TabsContent value="physical" className="flex-1 min-h-0 overflow-y-auto">
          <PhysicalRelationshipsTab />
        </TabsContent>
        <TabsContent value="identifiers" className="flex-1 min-h-0 overflow-y-auto">
          <IdentifiersTab />
        </TabsContent>
        <TabsContent value="telecoms" className="flex-1 min-h-0 overflow-y-auto">
          <TelecomsTab />
        </TabsContent>
        <TabsContent value="hours" className="flex-1 min-h-0 overflow-y-auto">
          <HoursAvailabilityTab />
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
          Create Location
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </SheetFooter>
    </form>
  );
}
