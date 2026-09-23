/**
 * CreateOrganizationForm — tabbed shell for the Create Organization modal.
 *
 * Layer: client / telemedicine / admin / forms
 * Resource: Organization (FHIR R4)
 *
 * This component is the thin orchestration layer:
 *   - Renders the Tabs list with count badges derived from useWatch
 *   - Mounts each tab as a self-contained component (each owns its own hooks)
 *   - Renders the DialogFooter with submit / cancel actions
 *
 * All field rendering, field arrays, and terminology fetching live in the
 * individual tab components under `./tabs/`. Shared constants in `./constants.ts`.
 *
 * Pattern: dumb shell — reads form instance from parent's <FormProvider> via
 * useFormContext(). Submission and action wiring live in CreateOrganizationModal.
 */

"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Loader2Icon } from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SheetFooter } from "@/components/ui/sheet";
import type { TCreateOrgFormSchema } from "@/modules/entities/schemas/organization";

import type { CreateOrganizationFormProps } from "./types";
import { BasicTab } from "./tabs/BasicTab";
import { AliasesTab } from "./tabs/AliasesTab";
import { IdentifiersTab } from "./tabs/IdentifiersTab";
import { TelecomTab } from "./tabs/TelecomTab";
import { AddressTab } from "./tabs/AddressTab";
import { ContactsTab } from "./tabs/ContactsTab";
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
 * Full tabbed form shell for creating an organization.
 * Each tab is self-contained — this component only manages the tab chrome
 * and footer.
 *
 * @param onSubmit  - handleSubmit callback from the parent modal.
 * @param onCancel  - Close callback.
 * @param isPending - Server action in-flight state.
 */
export function CreateOrganizationForm({
  onSubmit,
  onCancel,
  isPending,
}: CreateOrganizationFormProps) {
  const form = useFormContext<TCreateOrgFormSchema>();

  /**
   * Watch all array fields just for badge counts.
   * Individual tabs own their own useFieldArray subscriptions for mutations.
   */
  const [aliases, identifiers, telecom, address, contacts, endpoints] =
    useWatch({
      control: form.control,
      name: [
        "alias",
        "identifier",
        "telecom",
        "address",
        "contact",
        "endpoint",
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
        {/* Tab triggers — horizontally scrollable on narrow viewports */}
        <div className="shrink-0 overflow-x-auto pb-1">
          <TabsList className="w-max">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="aliases">
              Aliases <TabCount count={aliases?.length ?? 0} />
            </TabsTrigger>
            <TabsTrigger value="identifiers">
              Identifiers <TabCount count={identifiers?.length ?? 0} />
            </TabsTrigger>
            <TabsTrigger value="telecom">
              Telecom <TabCount count={telecom?.length ?? 0} />
            </TabsTrigger>
            <TabsTrigger value="address">
              Address <TabCount count={address?.length ?? 0} />
            </TabsTrigger>
            <TabsTrigger value="contacts">
              Contacts <TabCount count={contacts?.length ?? 0} />
            </TabsTrigger>
            <TabsTrigger value="endpoints">
              Endpoints <TabCount count={endpoints?.length ?? 0} />
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="basic" className="flex-1 min-h-0 overflow-y-auto">
          <BasicTab />
        </TabsContent>
        <TabsContent value="aliases" className="flex-1 min-h-0 overflow-y-auto">
          <AliasesTab />
        </TabsContent>
        <TabsContent
          value="identifiers"
          className="flex-1 min-h-0 overflow-y-auto"
        >
          <IdentifiersTab />
        </TabsContent>
        <TabsContent value="telecom" className="flex-1 min-h-0 overflow-y-auto">
          <TelecomTab />
        </TabsContent>
        <TabsContent value="address" className="flex-1 min-h-0 overflow-y-auto">
          <AddressTab />
        </TabsContent>
        <TabsContent
          value="contacts"
          className="flex-1 min-h-0 overflow-y-auto"
        >
          <ContactsTab />
        </TabsContent>
        <TabsContent
          value="endpoints"
          className="flex-1 min-h-0 overflow-y-auto"
        >
          <EndpointsTab />
        </TabsContent>
      </Tabs>

      <SheetFooter className="shrink-0 px-0">
        <Button type="submit" disabled={isPending}>
          {isPending && (
            <Loader2Icon data-icon="inline-start" className="animate-spin" />
          )}
          Create Organization
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </SheetFooter>
    </form>
  );
}
