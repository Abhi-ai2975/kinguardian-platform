/**
 * EditPractitionerRoleForm — field layout shell for the Edit PractitionerRole Sheet.
 *
 * Layer: client / telemedicine / admin / forms
 * Resource: PractitionerRole
 *
 * Pattern: this component does NOT own its form instance. It reads the form
 * via useFormContext() injected by the parent modal's <FormProvider>. All
 * submission logic and server action wiring live in EditPractitionerRoleModal.
 *
 * Only scalar fields patchable per the fhir-gql PATCH contract are exposed
 * (see PractitionerRolePatchDtoSchema) — child arrays and references (code,
 * specialty, location, healthcare_service, contact, availability, endpoint,
 * practitioner, organization) are not editable here; delete and re-create
 * the role to change those.
 */

"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SheetFooter } from "@/components/ui/sheet";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { FormInput, FormSwitch } from "@/modules/client/shared/components/CustomFormFields";
import type { TEditPractitionerRoleFormSchema } from "@/modules/entities/schemas/practitioner-role";

interface EditPractitionerRoleFormProps {
  /**
   * Called by form.handleSubmit — receives validated TEditPractitionerRoleFormSchema values.
   * The modal maps these to the PATCH API payload.
   */
  onSubmit: (values: TEditPractitionerRoleFormSchema) => Promise<void>;
  /** Closes the modal when the user cancels. */
  onCancel: () => void;
  /** True while the server action is executing — disables the submit button. */
  isPending: boolean;
}

/**
 * Dumb form shell for editing a practitioner role.
 * Reads the form instance from FormProvider; renders field layout only.
 */
export function EditPractitionerRoleForm({
  onSubmit,
  onCancel,
  isPending,
}: EditPractitionerRoleFormProps) {
  const form = useFormContext<TEditPractitionerRoleFormSchema>();

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col flex-1 min-h-0 gap-4 overflow-y-auto px-4 pt-4"
    >
      <FieldGroup className="flex flex-col gap-4 pb-2">
        <FormSwitch control={form.control} name="active" label="Active" />

        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel>Period Start</FieldLabel>
            <Controller
              control={form.control}
              name="period_start"
              render={({ field }) => (
                <Input {...field} value={field.value ?? ""} type="date" />
              )}
            />
          </Field>
          <Field>
            <FieldLabel>Period End</FieldLabel>
            <Controller
              control={form.control}
              name="period_end"
              render={({ field }) => (
                <Input {...field} value={field.value ?? ""} type="date" />
              )}
            />
          </Field>
        </div>

        <FormInput
          control={form.control}
          name="availability_exceptions"
          label="Availability Exceptions"
          placeholder="e.g. Unavailable during conference week"
        />
      </FieldGroup>

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
