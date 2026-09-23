/**
 * EditLocationModal — self-contained Sheet for editing a Location.
 *
 * Layer: client / telemedicine / admin / modals
 * Resource: Location
 *
 * Pattern: the modal owns the form instance (useForm + FormProvider) and the
 * server action (useServerAction). The form component is a dumb shell that
 * reads from FormProvider via useFormContext() and renders field layout only.
 *
 * Opens when the Zustand admin store's type === "editLocation".
 * The store's `data.location` field carries the full location record used to
 * pre-populate the form. No props required.
 * Mounted once inside LocationModalProvider.
 */

"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider } from "react-hook-form";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import { useQueryClient } from "@tanstack/react-query";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  EditLocationFormSchema,
  type TEditLocationFormSchema,
  type TLocationResponse,
} from "@/modules/entities/schemas/location";
import { updateLocationAction } from "@/modules/server/presentation/actions/location";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

import { useAdminStore } from "../../stores/admin.store";
import { locationKeys } from "../../queries/location.queries";
import { EditLocationForm } from "../../forms/locations/EditLocationForm";

/** Maps a location record onto the flat edit form's default values. */
function toFormValues(location: TLocationResponse | undefined): TEditLocationFormSchema {
  return {
    status: (location?.status as TEditLocationFormSchema["status"]) ?? undefined,
    operational_status_system: location?.operational_status_system ?? "",
    operational_status_code: location?.operational_status_code ?? "",
    operational_status_display: location?.operational_status_display ?? "",
    name: location?.name ?? "",
    description: location?.description ?? "",
    mode: (location?.mode as TEditLocationFormSchema["mode"]) ?? undefined,
    address_use: (location?.address_use as TEditLocationFormSchema["address_use"]) ?? undefined,
    address_type: (location?.address_type as TEditLocationFormSchema["address_type"]) ?? undefined,
    address_text: location?.address_text ?? "",
    /** Only the first line is editable here — matches the create form's single-line convention. */
    address_line: location?.address_line?.[0] ?? "",
    address_city: location?.address_city ?? "",
    address_district: location?.address_district ?? "",
    address_state: location?.address_state ?? "",
    address_postal_code: location?.address_postal_code ?? "",
    address_country: location?.address_country ?? "",
    address_period_start: location?.address_period_start ?? "",
    address_period_end: location?.address_period_end ?? "",
    physical_type_system: location?.physical_type_system ?? "",
    physical_type_code: location?.physical_type_code ?? "",
    physical_type_display: location?.physical_type_display ?? "",
    physical_type_text: location?.physical_type_text ?? "",
    managing_organization: location?.managing_organization_id
      ? `Organization/${location.managing_organization_id}`
      : "",
    managing_organization_display: location?.managing_organization_display ?? "",
    part_of: location?.part_of_id ? `Location/${location.part_of_id}` : "",
    part_of_display: location?.part_of_display ?? "",
    availability_exceptions: location?.availability_exceptions ?? "",
    position_longitude: location?.position_longitude ?? undefined,
    position_latitude: location?.position_latitude ?? undefined,
    position_altitude: location?.position_altitude ?? undefined,
  };
}

/**
 * Self-contained edit Sheet.
 * Owns the form instance and server action; delegates field rendering to
 * EditLocationForm via FormProvider.
 */
export function EditLocationModal() {
  const isOpen = useAdminStore((s) => s.isOpen);
  const type = useAdminStore((s) => s.type);
  const data = useAdminStore((s) => s.data);
  const onClose = useAdminStore((s) => s.onClose);
  const queryClient = useQueryClient();

  const open = isOpen && type === "editLocation";
  const location = data?.location;

  const form = useForm<TEditLocationFormSchema>({
    resolver: zodResolver(EditLocationFormSchema),
    defaultValues: toFormValues(location),
  });

  /**
   * Re-populate the form whenever a different location is opened for editing.
   * Without this reset, stale values from a previously edited record would
   * remain in the form when the user opens another location.
   */
  useEffect(() => {
    if (open && location) {
      form.reset(toFormValues(location));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, location?.id]);

  const { execute, isPending } = useServerAction(updateLocationAction, {
    onSuccess: () => {
      toast.success("Location updated successfully");
      void queryClient.invalidateQueries({ queryKey: locationKeys.all });
      onClose();
    },
    onError: ({ err }) => {
      handleZSAError({ err, form, fallbackMessage: "Failed to update location" });
    },
  });

  /**
   * Maps the flat form values to the API PATCH payload and executes the action.
   * Empty-string fields are sent as undefined so they don't overwrite existing
   * values with blanks.
   *
   * @param values - Validated form values from EditLocationFormSchema.
   */
  async function handleSubmit(values: TEditLocationFormSchema) {
    if (!location?.id) return;
    await execute({
      payload: {
        id: location.id,
        status: values.status,
        operational_status_system: values.operational_status_system || undefined,
        operational_status_code: values.operational_status_code || undefined,
        operational_status_display: values.operational_status_display || undefined,
        name: values.name || undefined,
        description: values.description || undefined,
        mode: values.mode,
        address_use: values.address_use,
        address_type: values.address_type,
        address_text: values.address_text || undefined,
        address_line: values.address_line ? [values.address_line] : undefined,
        address_city: values.address_city || undefined,
        address_district: values.address_district || undefined,
        address_state: values.address_state || undefined,
        address_postal_code: values.address_postal_code || undefined,
        address_country: values.address_country || undefined,
        address_period_start: values.address_period_start || undefined,
        address_period_end: values.address_period_end || undefined,
        physical_type_system: values.physical_type_system || undefined,
        physical_type_code: values.physical_type_code || undefined,
        physical_type_display: values.physical_type_display || undefined,
        physical_type_text: values.physical_type_text || undefined,
        managing_organization: values.managing_organization || undefined,
        managing_organization_display: values.managing_organization_display || undefined,
        part_of: values.part_of || undefined,
        part_of_display: values.part_of_display || undefined,
        availability_exceptions: values.availability_exceptions || undefined,
        position_longitude: values.position_longitude,
        position_latitude: values.position_latitude,
        position_altitude: values.position_altitude,
      },
      transportOptions: {
        shouldRevalidate: true,
        url: "/telemedicine/admin/locations",
      },
    });
  }

  if (!open || !location) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        resizable
        maxWidth={1200}
        className="w-full sm:max-w-2xl overflow-hidden flex flex-col gap-0 p-0"
      >
        <SheetHeader className="border-b">
          <SheetTitle>Edit Location</SheetTitle>
          <SheetDescription>
            Update scalar fields. Sub-resource arrays (identifiers, types,
            telecoms, hours of operation, endpoints) require delete and
            re-create.
          </SheetDescription>
        </SheetHeader>

        <FormProvider {...form}>
          <EditLocationForm
            onSubmit={handleSubmit}
            onCancel={onClose}
            isPending={isPending}
            orgId={location.org_id ?? null}
            excludeId={location.id}
          />
        </FormProvider>
      </SheetContent>
    </Sheet>
  );
}
