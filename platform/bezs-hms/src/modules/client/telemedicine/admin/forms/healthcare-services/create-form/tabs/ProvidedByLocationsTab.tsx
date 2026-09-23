/**
 * ProvidedByLocationsTab — the providing Organization plus the Location(s)
 * where the service is offered and its coverage area.
 *
 * References (`provided_by`, `location[].reference`, `coverage_area[].reference`)
 * are searched live via ReferenceSelect against the tenant's organizations
 * and locations — no self-exclude needed here since this is the create form
 * (the record doesn't exist yet).
 */

"use client";

import { useFormContext, useFieldArray, useWatch, Controller } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { FormInput } from "@/modules/client/shared/components/CustomFormFields";
import { ReferenceSelect } from "@/modules/client/shared/components/ReferenceSelect";
import { searchOrganizationOptions } from "../../../../queries/organization.queries";
import { searchLocationOptions } from "../../../../queries/location.queries";
import { useAdminStore } from "../../../../stores/admin.store";
import type { TCreateHealthcareServiceFormSchema } from "@/modules/entities/schemas/healthcare-service";

/** @see CreateHealthcareServiceForm */
export function ProvidedByLocationsTab() {
  const form = useFormContext<TCreateHealthcareServiceFormSchema>();
  const locations = useFieldArray({ control: form.control, name: "location" });
  const coverageAreas = useFieldArray({ control: form.control, name: "coverage_area" });
  const orgId = useAdminStore((s) => s.data?.orgId ?? null);
  const providedBy = useWatch({ control: form.control, name: "provided_by" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = form.formState.errors as any;

  return (
    <FieldGroup className="flex flex-col gap-4 p-1 pr-3">
      <p className="text-sm text-muted-foreground">Organisation providing this service.</p>
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel>Provided By</FieldLabel>
          <Controller
            control={form.control}
            name="provided_by"
            render={({ field }) => {
              const id = providedBy ? Number(providedBy.split("/")[1]) : undefined;
              return (
                <ReferenceSelect
                  fetchOptions={(q) => searchOrganizationOptions(q, orgId)}
                  queryKey={["organizations", "picker", orgId]}
                  value={
                    id ? { id, label: form.getValues("provided_by_display") ?? "" } : null
                  }
                  onChange={(opt) => {
                    field.onChange(opt ? `Organization/${opt.id}` : "");
                    form.setValue("provided_by_display", opt?.label ?? "");
                  }}
                  placeholder="Search organizations…"
                />
              );
            }}
          />
        </Field>
        <FormInput
          control={form.control}
          name="provided_by_display"
          label="Provided By Display"
          placeholder="General Hospital"
          description="Auto-filled from your selection — you can still edit it."
        />
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Locations where this service is provided.</p>
        <Button type="button" size="sm" variant="outline" onClick={() => locations.append({ reference: "" })}>
          <PlusIcon data-icon="inline-start" />
          Add Location
        </Button>
      </div>
      {locations.fields.map((loc, i) => (
        <Card key={loc.id}>
          <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
            <CardTitle className="text-sm">Location {i + 1}</CardTitle>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7 text-destructive"
              onClick={() => locations.remove(i)}
            >
              <Trash2Icon data-icon />
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 pb-4">
            <Field data-invalid={!!e?.location?.[i]?.reference || undefined}>
              <FieldLabel>Reference</FieldLabel>
              <Controller
                control={form.control}
                name={`location.${i}.reference`}
                render={({ field }) => {
                  const currentRef = form.watch(`location.${i}.reference`);
                  const id = currentRef ? Number(currentRef.split("/")[1]) : undefined;
                  return (
                    <ReferenceSelect
                      fetchOptions={(q) => searchLocationOptions(q, orgId)}
                      queryKey={["locations", "picker", orgId]}
                      value={
                        id
                          ? { id, label: form.getValues(`location.${i}.reference_display`) ?? "" }
                          : null
                      }
                      onChange={(opt) => {
                        field.onChange(opt ? `Location/${opt.id}` : "");
                        form.setValue(`location.${i}.reference_display`, opt?.label ?? "");
                      }}
                      placeholder="Search locations…"
                    />
                  );
                }}
              />
              {e?.location?.[i]?.reference && (
                <FieldError>{e.location[i].reference.message}</FieldError>
              )}
            </Field>
            <Field>
              <FieldLabel>Display</FieldLabel>
              <Controller
                control={form.control}
                name={`location.${i}.reference_display`}
                render={({ field }) => (
                  <Input {...field} value={field.value ?? ""} placeholder="Main Building" />
                )}
              />
            </Field>
          </CardContent>
        </Card>
      ))}
      {locations.fields.length === 0 && (
        <p className="text-sm text-muted-foreground">No locations added.</p>
      )}

      <Separator />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Coverage area — locations defining the geographic area this service covers.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => coverageAreas.append({ reference: "" })}
        >
          <PlusIcon data-icon="inline-start" />
          Add Coverage Area
        </Button>
      </div>
      {coverageAreas.fields.map((ca, i) => (
        <Card key={ca.id}>
          <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
            <CardTitle className="text-sm">Coverage Area {i + 1}</CardTitle>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7 text-destructive"
              onClick={() => coverageAreas.remove(i)}
            >
              <Trash2Icon data-icon />
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 pb-4">
            <Field data-invalid={!!e?.coverage_area?.[i]?.reference || undefined}>
              <FieldLabel>Reference</FieldLabel>
              <Controller
                control={form.control}
                name={`coverage_area.${i}.reference`}
                render={({ field }) => {
                  const currentRef = form.watch(`coverage_area.${i}.reference`);
                  const id = currentRef ? Number(currentRef.split("/")[1]) : undefined;
                  return (
                    <ReferenceSelect
                      fetchOptions={(q) => searchLocationOptions(q, orgId)}
                      queryKey={["locations", "picker", orgId]}
                      value={
                        id
                          ? { id, label: form.getValues(`coverage_area.${i}.reference_display`) ?? "" }
                          : null
                      }
                      onChange={(opt) => {
                        field.onChange(opt ? `Location/${opt.id}` : "");
                        form.setValue(`coverage_area.${i}.reference_display`, opt?.label ?? "");
                      }}
                      placeholder="Search locations…"
                    />
                  );
                }}
              />
              {e?.coverage_area?.[i]?.reference && (
                <FieldError>{e.coverage_area[i].reference.message}</FieldError>
              )}
            </Field>
            <Field>
              <FieldLabel>Display</FieldLabel>
              <Controller
                control={form.control}
                name={`coverage_area.${i}.reference_display`}
                render={({ field }) => (
                  <Input {...field} value={field.value ?? ""} placeholder="North Region" />
                )}
              />
            </Field>
          </CardContent>
        </Card>
      ))}
      {coverageAreas.fields.length === 0 && (
        <p className="text-sm text-muted-foreground">No coverage areas added.</p>
      )}
    </FieldGroup>
  );
}
