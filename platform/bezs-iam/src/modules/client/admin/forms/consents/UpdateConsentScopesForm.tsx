"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash } from "lucide-react";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { TUpdateConsentScopesFormSchema } from "@/modules/entities/schemas/admin/consents/consents.schema";
import { FormInput } from "@/modules/client/shared/custom-form-fields";

interface UpdateConsentScopesFormProps {
  onSubmit: (data: TUpdateConsentScopesFormSchema) => Promise<void>;
  onCancel: () => void;
}

export function UpdateConsentScopesForm({
  onSubmit,
  onCancel,
}: UpdateConsentScopesFormProps) {
  const form = useFormContext<TUpdateConsentScopesFormSchema>();

  const {
    formState: { isSubmitting, errors },
    control,
  } = form;

  const scopes = useFieldArray({
    control: control as never,
    name: "scopes",
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FieldGroup>
        <FieldSet>
          <FieldLegend>Granted Scopes</FieldLegend>
          <Field>
            <FieldLabel>Scopes</FieldLabel>
            <FieldDescription>
              OAuth scopes this user has consented to. Remove scopes to restrict
              access or add new ones to expand permissions.
            </FieldDescription>
            <div className="space-y-2">
              {scopes.fields.map((item, index) => (
                <div key={item.id} className="flex gap-2 items-center">
                  <FormInput
                    control={control}
                    name={`scopes.${index}`}
                    placeholder="openid"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => scopes.remove(index)}
                    className="self-end"
                  >
                    <Trash size={16} />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => scopes.append("" as never)}
                className="flex items-center gap-2"
              >
                <Plus size={16} />
                Add Scope
              </Button>
            </div>
            <FieldError errors={[errors.scopes]} />
          </Field>
        </FieldSet>
      </FieldGroup>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </DialogClose>
        <Button disabled={isSubmitting} size="sm" type="submit">
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" /> Saving...
            </>
          ) : (
            "Save Scopes"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
