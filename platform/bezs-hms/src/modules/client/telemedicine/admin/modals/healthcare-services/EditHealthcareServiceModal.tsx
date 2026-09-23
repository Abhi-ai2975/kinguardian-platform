/**
 * EditHealthcareServiceModal — self-contained Sheet for editing a HealthcareService.
 *
 * Layer: client / telemedicine / admin / modals
 * Resource: HealthcareService
 *
 * Pattern: the modal owns the form instance (useForm + FormProvider) and the
 * server action (useServerAction). The form component is a dumb shell that
 * reads from FormProvider via useFormContext() and renders field layout only.
 *
 * Opens when the Zustand admin store's type === "editHealthcareService".
 * The store's `data.healthcareService` field carries the full record used to
 * pre-populate the form. No props required.
 * Mounted once inside HealthcareServiceModalProvider.
 *
 * Wrapped in a <FileNestProvider> so the photo section's
 * HealthcareServicePhotoUpload can call useUpload() to replace the photo.
 */

"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider } from "react-hook-form";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import { useQueryClient } from "@tanstack/react-query";
import { FileNestProvider } from "@filenest-fs/react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  EditHealthcareServiceFormSchema,
  type TEditHealthcareServiceFormSchema,
  type THealthcareServiceResponse,
} from "@/modules/entities/schemas/healthcare-service";
import { updateHealthcareServiceAction } from "@/modules/server/presentation/actions/healthcare-service";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { useFileNestTokenFetcher } from "@/modules/client/shared/hooks/useFileNestTokenFetcher";

import { useAdminStore } from "../../stores/admin.store";
import { healthcareServiceKeys } from "../../queries/healthcare-service.queries";
import { EditHealthcareServiceForm } from "../../forms/healthcare-services/EditHealthcareServiceForm";

/** Maps a healthcare service record onto the flat edit form's default values. */
function toFormValues(
  hcs: THealthcareServiceResponse | undefined,
): TEditHealthcareServiceFormSchema {
  return {
    active: hcs?.active ?? true,
    name: hcs?.name ?? "",
    comment: hcs?.comment ?? "",
    extra_details: hcs?.extra_details ?? "",
    appointment_required: hcs?.appointment_required ?? false,
    availability_exceptions: hcs?.availability_exceptions ?? "",
    photo_content_type: hcs?.photo_content_type ?? "",
    photo_language: hcs?.photo_language ?? "",
    photo_data: hcs?.photo_data ?? "",
    photo_url: hcs?.photo_url ?? "",
    photo_size: hcs?.photo_size ?? undefined,
    photo_hash: hcs?.photo_hash ?? "",
    photo_title: hcs?.photo_title ?? "",
    photo_creation: hcs?.photo_creation ?? "",
  };
}

/**
 * Self-contained edit Sheet.
 * Owns the form instance and server action; delegates field rendering to
 * EditHealthcareServiceForm via FormProvider.
 */
export function EditHealthcareServiceModal() {
  const isOpen = useAdminStore((s) => s.isOpen);
  const type = useAdminStore((s) => s.type);
  const data = useAdminStore((s) => s.data);
  const onClose = useAdminStore((s) => s.onClose);
  const queryClient = useQueryClient();

  const open = isOpen && type === "editHealthcareService";
  const healthcareService = data?.healthcareService;

  const form = useForm<TEditHealthcareServiceFormSchema>({
    resolver: zodResolver(EditHealthcareServiceFormSchema),
    defaultValues: toFormValues(healthcareService),
  });

  /** Uploads land under healthcare-services/photos/{id}, matching Doctor's per-record scoping. */
  const tokenFetcher = useFileNestTokenFetcher({
    filePath: healthcareService?.id
      ? `healthcare-services/photos/${healthcareService.id}`
      : "healthcare-services/photos",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeMb: 5,
    maxFiles: 1,
  });

  /**
   * Re-populate the form whenever a different healthcare service is opened
   * for editing. Without this reset, stale values from a previously edited
   * record would remain in the form when the user opens another record.
   */
  useEffect(() => {
    if (open && healthcareService) {
      form.reset(toFormValues(healthcareService));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, healthcareService?.id]);

  const { execute, isPending } = useServerAction(updateHealthcareServiceAction, {
    onSuccess: () => {
      toast.success("Healthcare service updated successfully");
      void queryClient.invalidateQueries({ queryKey: healthcareServiceKeys.all });
      onClose();
    },
    onError: ({ err }) => {
      handleZSAError({ err, form, fallbackMessage: "Failed to update healthcare service" });
    },
  });

  /**
   * Maps the flat form values to the API PATCH payload and executes the action.
   *
   * @param values - Validated form values from EditHealthcareServiceFormSchema.
   */
  async function handleSubmit(values: TEditHealthcareServiceFormSchema) {
    if (!healthcareService?.id) return;
    await execute({
      payload: {
        id: healthcareService.id,
        active: values.active,
        name: values.name || undefined,
        comment: values.comment || undefined,
        extra_details: values.extra_details || undefined,
        appointment_required: values.appointment_required,
        availability_exceptions: values.availability_exceptions || undefined,
        photo_content_type: values.photo_content_type || undefined,
        photo_language: values.photo_language || undefined,
        photo_data: values.photo_data || undefined,
        photo_url: values.photo_url || undefined,
        photo_size: values.photo_size,
        photo_hash: values.photo_hash || undefined,
        photo_title: values.photo_title || undefined,
        photo_creation: values.photo_creation || undefined,
      },
      transportOptions: {
        shouldRevalidate: true,
        url: "/telemedicine/admin/healthcare-services",
      },
    });
  }

  if (!open || !healthcareService) return null;

  return (
    <FileNestProvider
      tokenFetcher={tokenFetcher}
      projectId={process.env.NEXT_PUBLIC_FILENEST_PROJECT_ID!}
      baseUrl={process.env.NEXT_PUBLIC_FILENEST_API_URL}
      queryClient={queryClient}
    >
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent
          side="right"
          resizable
          maxWidth={1200}
          className="w-full sm:max-w-lg overflow-hidden flex flex-col gap-0 p-0"
        >
          <SheetHeader className="border-b">
            <SheetTitle>Edit Healthcare Service</SheetTitle>
            <SheetDescription>
              Update scalar fields. Sub-resource arrays (identifiers,
              categories, types, telecoms, locations, etc.) require delete and
              re-create.
            </SheetDescription>
          </SheetHeader>

          <FormProvider {...form}>
            <EditHealthcareServiceForm
              onSubmit={handleSubmit}
              onCancel={onClose}
              isPending={isPending}
            />
          </FormProvider>
        </SheetContent>
      </Sheet>
    </FileNestProvider>
  );
}
