/**
 * EditHealthcareServiceForm — field layout shell for the Edit Healthcare
 * Service Sheet.
 *
 * Layer: client / telemedicine / admin / forms
 * Resource: HealthcareService
 *
 * Pattern: this component does NOT own its form instance. It reads the form
 * via useFormContext() injected by the parent modal's <FormProvider>. All
 * submission logic and server action wiring live in
 * EditHealthcareServiceModal.
 *
 * Only scalar fields patchable per the fhir-gql PATCH contract are exposed
 * (see PatchHealthcareServiceDtoSchema) — array sub-resources are not
 * editable here, matching Organization's harder PATCH limit (not Location's
 * partial one) — confirmed via fhir-gql's HealthcareServicePatchSchema,
 * extra="forbid", no array fields at all.
 *
 * Photo fields are patchable too — HealthcareServicePhotoUpload (FileNest)
 * lets the user replace the photo without deleting/recreating the resource.
 * Requires the parent modal to wrap this form in a <FileNestProvider>.
 */

"use client";

import { useFormContext } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SheetFooter } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { FieldGroup } from "@/components/ui/field";
import {
  FormInput,
  FormSwitch,
  FormTextarea,
} from "@/modules/client/shared/components/CustomFormFields";
import type { TEditHealthcareServiceFormSchema } from "@/modules/entities/schemas/healthcare-service";
import { HealthcareServicePhotoUpload } from "./HealthcareServicePhotoUpload";

interface EditHealthcareServiceFormProps {
  /**
   * Called by form.handleSubmit — receives validated TEditHealthcareServiceFormSchema values.
   * The modal maps these to the PATCH API payload.
   */
  onSubmit: (values: TEditHealthcareServiceFormSchema) => Promise<void>;
  /** Closes the modal when the user cancels. */
  onCancel: () => void;
  /** True while the server action is executing — disables the submit button. */
  isPending: boolean;
}

/**
 * Dumb form shell for editing a healthcare service.
 * Reads the form instance from FormProvider; renders field layout only.
 */
export function EditHealthcareServiceForm({
  onSubmit,
  onCancel,
  isPending,
}: EditHealthcareServiceFormProps) {
  const form = useFormContext<TEditHealthcareServiceFormSchema>();

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col flex-1 min-h-0 gap-4 overflow-y-auto px-4 pt-4"
    >
      <FieldGroup className="flex flex-col gap-4 pb-2">
        <div className="grid grid-cols-[1fr_auto] items-center gap-3">
          <FormInput control={form.control} name="name" label="Service Name" />
          <FormSwitch control={form.control} name="active" label="Active" />
        </div>

        <FormSwitch
          control={form.control}
          name="appointment_required"
          label="Appointment Required"
        />

        <Separator />

        <FormTextarea control={form.control} name="comment" label="Comment" />
        <FormTextarea control={form.control} name="extra_details" label="Extra Details" />
        <FormInput
          control={form.control}
          name="availability_exceptions"
          label="Availability Exceptions"
        />

        <Separator />

        <p className="text-sm text-muted-foreground">Service photo</p>
        <HealthcareServicePhotoUpload />
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
