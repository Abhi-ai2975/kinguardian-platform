/**
 * CreateLocationModal — self-contained Sheet for creating a Location.
 *
 * Layer: client / telemedicine / admin / modals
 * Resource: Location
 *
 * Pattern: the modal owns the form instance (useForm + FormProvider) and the
 * server action (useServerAction). The form component is a dumb shell that
 * reads from FormProvider via useFormContext() and renders field layout only.
 *
 * Uses a right-side Sheet instead of a centered Dialog — Location's form has
 * more sub-sections than Organization's, and the team already found Dialog
 * cramped for Organization's tabbed form. See CreateLocationForm for the
 * Sheet chrome details.
 *
 * Opens when the Zustand admin store's type === "createLocation".
 * No props required — subscribes to the store directly.
 * Mounted once inside LocationModalProvider.
 *
 * handleSubmit responsibilities:
 *  - Guard: user_id/org_id are REQUIRED by fhir-gql for Location (unlike
 *    Organization, where they're optional) — block submit with a toast if
 *    the session is missing either.
 *  - Split aliases (comma string) → string[]
 *  - Wrap address_line (single string) → [string]
 *  - Split each hours_of_operation[].days_of_week (comma string) → string[]
 *  - Pass identifiers[], types[], telecoms[], endpoints[] directly (already arrays)
 */

"use client";

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
  CreateLocationFormSchema,
  type TCreateLocationFormSchema,
} from "@/modules/entities/schemas/location";
import { createLocationAction } from "@/modules/server/presentation/actions/location";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

import { useAdminStore } from "../../stores/admin.store";
import { locationKeys } from "../../queries/location.queries";
import { CreateLocationForm } from "../../forms/locations/create-form";

/** Splits a comma-separated string into a trimmed, non-empty string array. */
function splitCsv(s?: string): string[] | undefined {
  if (!s?.trim()) return undefined;
  const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

/**
 * Self-contained create Sheet.
 * Owns the form instance and server action; delegates all field rendering to
 * CreateLocationForm via FormProvider.
 */
export function CreateLocationModal() {
  const isOpen = useAdminStore((s) => s.isOpen);
  const type = useAdminStore((s) => s.type);
  const data = useAdminStore((s) => s.data);
  const onClose = useAdminStore((s) => s.onClose);
  const queryClient = useQueryClient();

  const open = isOpen && type === "createLocation";

  const form = useForm<TCreateLocationFormSchema>({
    resolver: zodResolver(CreateLocationFormSchema),
    defaultValues: { status: "active" },
  });

  function handleCloseModal() {
    form.reset();
    onClose();
  }

  const { execute, isPending } = useServerAction(createLocationAction, {
    onSuccess: () => {
      toast.success("Location created successfully");
      void queryClient.invalidateQueries({ queryKey: locationKeys.all });
      form.reset();
      handleCloseModal();
    },
    onError: ({ err }) => {
      handleZSAError({ err, form, fallbackMessage: "Failed to create location" });
    },
  });

  /**
   * Transforms the flat form values into the nested API payload expected by
   * CreateLocationValidationSchema, then executes the create action.
   *
   * @param values - Validated form values from CreateLocationFormSchema.
   */
  async function handleSubmit(values: TCreateLocationFormSchema) {
    // fhir-gql requires user_id/org_id for Location — unlike Organization,
    // there is no server-side fallback if these are missing from the session.
    if (!data?.userId || !data?.orgId) {
      toast.error(
        "Missing user or organization context — please sign in again before creating a location.",
      );
      return;
    }

    await execute({
      payload: {
        user_id: data.userId,
        org_id: data.orgId,
        status: values.status,
        operational_status_system: values.operational_status_system,
        operational_status_code: values.operational_status_code,
        operational_status_display: values.operational_status_display,
        name: values.name,
        description: values.description,
        mode: values.mode,
        identifiers: values.identifiers,
        aliases: splitCsv(values.aliases),
        types: values.types,
        telecoms: values.telecoms,
        address_use: values.address_use,
        address_type: values.address_type,
        address_text: values.address_text,
        address_line: values.address_line ? [values.address_line] : undefined,
        address_city: values.address_city,
        address_district: values.address_district,
        address_state: values.address_state,
        address_postal_code: values.address_postal_code,
        address_country: values.address_country,
        physical_type_system: values.physical_type_system,
        physical_type_code: values.physical_type_code,
        physical_type_display: values.physical_type_display,
        physical_type_text: values.physical_type_text,
        managing_organization: values.managing_organization,
        managing_organization_display: values.managing_organization_display,
        part_of: values.part_of,
        part_of_display: values.part_of_display,
        availability_exceptions: values.availability_exceptions,
        hours_of_operation: values.hours_of_operation?.map((h) => ({
          days_of_week: splitCsv(h.days_of_week),
          all_day: h.all_day,
          opening_time: h.opening_time,
          closing_time: h.closing_time,
        })),
        position_longitude: values.position_longitude,
        position_latitude: values.position_latitude,
        position_altitude: values.position_altitude,
        endpoints: values.endpoints,
      },
      transportOptions: {
        shouldRevalidate: true,
        url: "/telemedicine/admin/locations",
      },
    });
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleCloseModal()}>
      <SheetContent
        side="right"
        resizable
        maxWidth={1200}
        className="w-full sm:max-w-2xl overflow-hidden flex flex-col gap-0 p-0"
      >
        <SheetHeader className="border-b">
          <SheetTitle>New Location</SheetTitle>
          <SheetDescription>
            Create a new location in the FHIR server. All fields are optional
            except the tenant context stamped automatically from your session.
          </SheetDescription>
        </SheetHeader>

        <FormProvider {...form}>
          <CreateLocationForm
            onSubmit={handleSubmit}
            onCancel={handleCloseModal}
            isPending={isPending}
          />
        </FormProvider>
      </SheetContent>
    </Sheet>
  );
}
