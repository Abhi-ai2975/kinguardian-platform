/**
 * EditSlotForm — field layout shell for the Edit Slot Sheet.
 *
 * Layer: client / telemedicine / admin / forms
 * Resource: Slot
 *
 * Pattern: this component does NOT own its form instance. It reads the form
 * via useFormContext() injected by the parent modal's <FormProvider>. All
 * submission logic and server action wiring live in EditSlotModal.
 *
 * Only scalar fields patchable per the fhir-gql PATCH contract are exposed
 * (see SlotPatchDtoSchema) — child arrays and the schedule reference are not
 * editable here; delete and re-create the slot to change those.
 *
 * `status` is a plain hardcoded Select, matching create-form/tabs/BasicTab.tsx
 * — see that file's header comment for why it's not TerminologySelect-backed.
 */

"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/modules/client/shared/components/DateTimePicker";
import { SheetFooter } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormInput,
  FormSwitch,
  FormTextarea,
} from "@/modules/client/shared/components/CustomFormFields";
import {
  TerminologySelect,
  type TCodeableConcept,
} from "@/modules/client/shared/components/TerminologySelect";
import { SLOT_STATUS_OPTIONS } from "../../components/slots/SlotsTableColumn";
import type { TEditSlotFormSchema } from "@/modules/entities/schemas/slot";

interface EditSlotFormProps {
  /**
   * Called by form.handleSubmit — receives validated TEditSlotFormSchema values.
   * The modal maps these to the PATCH API payload.
   */
  onSubmit: (values: TEditSlotFormSchema) => Promise<void>;
  /** Closes the modal when the user cancels. */
  onCancel: () => void;
  /** True while the server action is executing — disables the submit button. */
  isPending: boolean;
}

/**
 * Dumb form shell for editing a slot.
 * Reads the form instance from FormProvider; renders field layout only.
 */
export function EditSlotForm({ onSubmit, onCancel, isPending }: EditSlotFormProps) {
  const form = useFormContext<TEditSlotFormSchema>();

  /** Decomposes the selected appointmentType CodeableConcept into its flat scalar fields. */
  function handleAppointmentTypeChange(value: string | TCodeableConcept | null) {
    if (!value || typeof value !== "object") return;
    form.setValue("appointment_type_system", value.system);
    form.setValue("appointment_type_code", value.code);
    form.setValue("appointment_type_display", value.display);
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col flex-1 min-h-0 gap-4 overflow-y-auto px-4 pt-4"
    >
      <FieldGroup className="flex flex-col gap-4 pb-2">
        <Field>
          <FieldLabel>Status</FieldLabel>
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {SLOT_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel>Start</FieldLabel>
            <Controller
              control={form.control}
              name="start"
              render={({ field }) => (
                <DateTimePicker
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Pick start date & time…"
                />
              )}
            />
          </Field>
          <Field>
            <FieldLabel>End</FieldLabel>
            <Controller
              control={form.control}
              name="end"
              render={({ field }) => (
                <DateTimePicker
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Pick end date & time…"
                />
              )}
            />
          </Field>
        </div>

        <FormSwitch control={form.control} name="overbooked" label="Overbooked" />

        <FormTextarea
          control={form.control}
          name="comment"
          label="Comment"
          placeholder="Optional free-text comment"
        />

        <Separator />

        <Field>
          <FieldLabel>Appointment Type</FieldLabel>
          <Controller
            control={form.control}
            name="appointment_type_code"
            render={({ field }) => (
              <TerminologySelect
                resource="Slot"
                field="appointmentType"
                valueType="codeable_concept"
                value={
                  field.value
                    ? {
                        code: field.value,
                        system: form.getValues("appointment_type_system") ?? "",
                        display: form.getValues("appointment_type_display") ?? "",
                      }
                    : null
                }
                onChange={handleAppointmentTypeChange}
                placeholder="Search appointment type…"
              />
            )}
          />
        </Field>
        <FormInput
          control={form.control}
          name="appointment_type_text"
          label="Appointment Type — Free Text"
          placeholder="Optional plain-text description"
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
