/**
 * CreateSlotForm — tabbed shell for the "New Slot" Sheet (manual one-off slot).
 *
 * Layer: client / telemedicine / admin / forms
 * Resource: Slot (FHIR R4)
 *
 * This component is the thin orchestration layer:
 *   - Renders the Tabs list with count badges derived from useWatch
 *   - Mounts each tab as a self-contained component (each owns its own hooks)
 *   - Renders the SheetFooter with submit / cancel actions
 *
 * Pattern: dumb shell — reads form instance from parent's <FormProvider> via
 * useFormContext(). Submission and action wiring live in CreateSlotModal.
 * For bulk generation, see GenerateSlotsForm instead.
 */

"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Loader2Icon } from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SheetFooter } from "@/components/ui/sheet";
import type { TCreateSlotFormSchema } from "@/modules/entities/schemas/slot";

import type { CreateSlotFormProps } from "./types";
import { BasicTab } from "./tabs/BasicTab";
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
 * Full tabbed form shell for creating a manual one-off slot.
 * Each tab is self-contained — this component only manages the tab chrome
 * and footer.
 *
 * @param onSubmit  - handleSubmit callback from the parent modal.
 * @param onCancel  - Close callback.
 * @param isPending - Server action in-flight state.
 */
export function CreateSlotForm({ onSubmit, onCancel, isPending }: CreateSlotFormProps) {
  const form = useFormContext<TCreateSlotFormSchema>();

  const [identifier, specialty, serviceType, serviceCategory] = useWatch({
    control: form.control,
    name: ["identifier", "specialty", "service_type", "service_category"],
  });

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
          Create Slot
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </SheetFooter>
    </form>
  );
}
