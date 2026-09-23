/**
 * EditPractitionerForm — tabbed shell for the Edit Practitioner Sheet.
 *
 * Layer: client / telemedicine / admin / forms
 * Resource: Practitioner (FHIR R4)
 *
 * A genuine departure from every other resource's scalar-only edit form:
 * fhir-gql's PATCH /practitioners/{id}/full endpoint supports replacing
 * names/telecom/addresses/communications, so those 4 tabs are real form
 * fields submitted together with the scalars via the Save Changes button.
 * Identifiers, Qualifications, and Photo are true sub-resource routes with
 * their own lifecycle — those 3 tabs render immediate-mutation sections
 * that save on their own actions, independent of this form's submit.
 */

"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Loader2Icon } from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SheetFooter } from "@/components/ui/sheet";
import type {
  TEditPractitionerFormSchema,
  TPractitionerResponse,
} from "@/modules/entities/schemas/practitioner";

import { BasicTab } from "./tabs/BasicTab";
import { NamesTab } from "./tabs/NamesTab";
import { ContactTab } from "./tabs/ContactTab";
import { AddressesTab } from "./tabs/AddressesTab";
import { LanguagesTab } from "./tabs/LanguagesTab";
import { IdentifiersSection } from "./IdentifiersSection";
import { QualificationsSection } from "./QualificationsSection";
import { PhotoSection } from "./PhotoSection";

interface EditPractitionerFormProps {
  /** Called by form.handleSubmit — receives validated TEditPractitionerFormSchema values. */
  onSubmit: (values: TEditPractitionerFormSchema) => Promise<void>;
  /** Closes the modal when the user cancels. */
  onCancel: () => void;
  /** True while the server action is executing — disables the submit button. */
  isPending: boolean;
  /** Full practitioner record — needed by the immediate-mutation sections. */
  practitioner: TPractitionerResponse;
}

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
 * Full tabbed form shell for editing a practitioner.
 *
 * @param onSubmit      - handleSubmit callback from the parent modal.
 * @param onCancel      - Close callback.
 * @param isPending     - Server action in-flight state (for the /full submit only).
 * @param practitioner  - Full record, needed by the immediate-mutation tabs.
 */
export function EditPractitionerForm({
  onSubmit,
  onCancel,
  isPending,
  practitioner,
}: EditPractitionerFormProps) {
  const form = useFormContext<TEditPractitionerFormSchema>();

  const [names, telecom, addresses, communications] = useWatch({
    control: form.control,
    name: ["names", "telecom", "addresses", "communications"],
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
            <TabsTrigger value="identifiers">Identifiers</TabsTrigger>
            <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
            <TabsTrigger value="photo">Photo</TabsTrigger>
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
          <IdentifiersSection practitionerId={practitioner.id} />
        </TabsContent>
        <TabsContent value="qualifications" className="flex-1 min-h-0 overflow-y-auto">
          <QualificationsSection practitionerId={practitioner.id} />
        </TabsContent>
        <TabsContent value="photo" className="flex-1 min-h-0 overflow-y-auto">
          <PhotoSection practitioner={practitioner} />
        </TabsContent>
      </Tabs>

      <SheetFooter className="shrink-0 px-0">
        <Button type="submit" disabled={isPending}>
          {isPending && (
            <Loader2Icon data-icon="inline-start" className="animate-spin" />
          )}
          Save Changes
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </SheetFooter>
    </form>
  );
}
