/**
 * EditOrganizationForm — field layout shell for the Edit Organization modal.
 *
 * Layer: client / telemedicine / admin / forms
 * Resource: Organization
 *
 * Pattern (nextjs-iam): this component does NOT own its form instance.
 * It reads the form via useFormContext() injected by the parent modal's
 * <FormProvider>. All submission logic and server action wiring live in
 * EditOrganizationModal.
 *
 * Only the three patchable scalar fields are exposed per the fhir-gql PATCH
 * contract: name, active, partof_display. Child arrays are not editable here.
 */

"use client";

import { useFormContext } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SheetFooter } from "@/components/ui/sheet";
import {
  FormInput,
  FormSwitch,
} from "@/modules/client/shared/components/CustomFormFields";
import type { TEditOrgFormSchema } from "@/modules/entities/schemas/organization";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EditOrganizationFormProps {
  /**
   * Called by form.handleSubmit — receives validated TEditOrgFormSchema values.
   * The modal maps these to the PATCH API payload.
   */
  onSubmit: (values: TEditOrgFormSchema) => Promise<void>;
  /** Closes the modal when the user cancels. */
  onCancel: () => void;
  /** True while the server action is executing — disables the submit button. */
  isPending: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Dumb form shell for editing an organization.
 * Reads the form instance from FormProvider; renders field layout only.
 *
 * @param onSubmit  - handleSubmit callback from the parent modal.
 * @param onCancel  - Close callback.
 * @param isPending - Server action in-flight state.
 */
export function EditOrganizationForm({
  onSubmit,
  onCancel,
  isPending,
}: EditOrganizationFormProps) {
  /** Form instance injected by parent modal's <FormProvider> */
  const form = useFormContext<TEditOrgFormSchema>();

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col flex-1 min-h-0 gap-4 overflow-y-auto px-4 pt-4"
    >
      {/* Name */}
      <FormInput
        control={form.control}
        name="name"
        label="Name *"
      />

      {/* Active toggle */}
      <FormSwitch
        control={form.control}
        name="active"
        label="Active"
        description="Inactive organizations are hidden from clinical workflows."
        descriptionPlace="bottom"
      />

      {/* Parent organization display name */}
      <FormInput
        control={form.control}
        name="partof_display"
        label="Parent Organization"
        placeholder="e.g. City Health System"
        description="Display name of the parent organization in the hierarchy."
      />

      {/* Footer actions */}
      <SheetFooter className="shrink-0 px-0">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </SheetFooter>
    </form>
  );
}
