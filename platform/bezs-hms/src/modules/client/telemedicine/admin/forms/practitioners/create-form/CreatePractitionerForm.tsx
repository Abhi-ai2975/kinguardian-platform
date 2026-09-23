/**
 * CreatePractitionerForm — tabbed shell for the Create Practitioner Sheet.
 *
 * Layer: client / telemedicine / admin / forms
 * Resource: Practitioner (FHIR R4)
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
 * useFormContext(). Submission and action wiring live in CreatePractitionerModal.
 */

"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Loader2Icon } from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SheetFooter } from "@/components/ui/sheet";
import type { TCreatePractitionerFormSchema } from "@/modules/entities/schemas/practitioner";

import type { CreatePractitionerFormProps } from "./types";
import { BasicTab } from "./tabs/BasicTab";
import { NamesTab } from "./tabs/NamesTab";
import { ContactTab } from "./tabs/ContactTab";
import { AddressesTab } from "./tabs/AddressesTab";
import { LanguagesTab } from "./tabs/LanguagesTab";
import { IdentifiersTab } from "./tabs/IdentifiersTab";
import { QualificationsTab } from "./tabs/QualificationsTab";

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
 * Full tabbed form shell for creating a practitioner.
 * Each tab is self-contained — this component only manages the tab chrome
 * and footer.
 *
 * @param onSubmit  - handleSubmit callback from the parent modal.
 * @param onCancel  - Close callback.
 * @param isPending - Server action in-flight state.
 */
export function CreatePractitionerForm({
  onSubmit,
  onCancel,
  isPending,
}: CreatePractitionerFormProps) {
  const form = useFormContext<TCreatePractitionerFormSchema>();

  const [names, telecom, addresses, communications, identifier, qualification] = useWatch({
    control: form.control,
    name: ["names", "telecom", "addresses", "communications", "identifier", "qualification"],
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
            <TabsTrigger value="names">
              Names <TabCount count={names?.length ?? 0} />
            </TabsTrigger>
            <TabsTrigger value="contact">
              Contact <TabCount count={telecom?.length ?? 0} />
            </TabsTrigger>
            <TabsTrigger value="addresses">
              Addresses <TabCount count={addresses?.length ?? 0} />
            </TabsTrigger>
            <TabsTrigger value="languages">
              Languages <TabCount count={communications?.length ?? 0} />
            </TabsTrigger>
            <TabsTrigger value="identifiers">
              Identifiers <TabCount count={identifier?.length ?? 0} />
            </TabsTrigger>
            <TabsTrigger value="qualifications">
              Qualifications <TabCount count={qualification?.length ?? 0} />
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="basic" className="flex-1 min-h-0 overflow-y-auto">
          <BasicTab />
        </TabsContent>
        <TabsContent value="names" className="flex-1 min-h-0 overflow-y-auto">
          <NamesTab />
        </TabsContent>
        <TabsContent value="contact" className="flex-1 min-h-0 overflow-y-auto">
          <ContactTab />
        </TabsContent>
        <TabsContent value="addresses" className="flex-1 min-h-0 overflow-y-auto">
          <AddressesTab />
        </TabsContent>
        <TabsContent value="languages" className="flex-1 min-h-0 overflow-y-auto">
          <LanguagesTab />
        </TabsContent>
        <TabsContent value="identifiers" className="flex-1 min-h-0 overflow-y-auto">
          <IdentifiersTab />
        </TabsContent>
        <TabsContent value="qualifications" className="flex-1 min-h-0 overflow-y-auto">
          <QualificationsTab />
        </TabsContent>
      </Tabs>

      <SheetFooter className="shrink-0 px-0">
        <Button type="submit" disabled={isPending}>
          {isPending && (
            <Loader2Icon data-icon="inline-start" className="animate-spin" />
          )}
          Create Practitioner
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </SheetFooter>
    </form>
  );
}
