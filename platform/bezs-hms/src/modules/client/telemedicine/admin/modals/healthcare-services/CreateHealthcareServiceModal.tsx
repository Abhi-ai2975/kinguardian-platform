/**
 * CreateHealthcareServiceModal — self-contained Sheet for creating a HealthcareService.
 *
 * Layer: client / telemedicine / admin / modals
 * Resource: HealthcareService
 *
 * Pattern: the modal owns the form instance (useForm + FormProvider) and the
 * server action (useServerAction). The form component is a dumb shell that
 * reads from FormProvider via useFormContext() and renders field layout only.
 * Right-side Sheet, matching Organization/Location.
 *
 * Opens when the Zustand admin store's type === "createHealthcareService".
 * No props required — subscribes to the store directly.
 * Mounted once inside HealthcareServiceModalProvider.
 *
 * handleSubmit responsibilities:
 *  - Split available_time[].days_of_week (comma string) → string[]
 *  - Pass every other array field through as-is (already shaped correctly
 *    by the form schema — no comma-string or line-wrapping transforms needed
 *    for HealthcareService, unlike Organization's address/contact fields)
 *
 * Wrapped in a <FileNestProvider> (same pattern as DoctorProfileForm.tsx) so
 * the Photo tab's HealthcareServicePhotoUpload can call useUpload().
 */

"use client";

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
  CreateHealthcareServiceFormSchema,
  type TCreateHealthcareServiceFormSchema,
} from "@/modules/entities/schemas/healthcare-service";
import { createHealthcareServiceAction } from "@/modules/server/presentation/actions/healthcare-service";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { useFileNestTokenFetcher } from "@/modules/client/shared/hooks/useFileNestTokenFetcher";

import { useAdminStore } from "../../stores/admin.store";
import { healthcareServiceKeys } from "../../queries/healthcare-service.queries";
import { CreateHealthcareServiceForm } from "../../forms/healthcare-services/create-form";

/** Splits a comma-separated string into a trimmed, non-empty string array. */
function splitCsv(s?: string): string[] | undefined {
  if (!s?.trim()) return undefined;
  const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

/**
 * Self-contained create Sheet.
 * Owns the form instance and server action; delegates all field rendering to
 * CreateHealthcareServiceForm via FormProvider.
 */
export function CreateHealthcareServiceModal() {
  const isOpen = useAdminStore((s) => s.isOpen);
  const type = useAdminStore((s) => s.type);
  const data = useAdminStore((s) => s.data);
  const onClose = useAdminStore((s) => s.onClose);
  const queryClient = useQueryClient();

  const open = isOpen && type === "createHealthcareService";

  const form = useForm<TCreateHealthcareServiceFormSchema>({
    resolver: zodResolver(CreateHealthcareServiceFormSchema),
    defaultValues: { active: true },
  });

  /** Uploads land under healthcare-services/photos, matching the A2UI reference form's filePath. */
  const tokenFetcher = useFileNestTokenFetcher({
    filePath: "healthcare-services/photos",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeMb: 5,
    maxFiles: 1,
    userId: data?.userId,
    orgId: data?.orgId,
  });

  function handleCloseModal() {
    form.reset();
    onClose();
  }

  const { execute, isPending } = useServerAction(createHealthcareServiceAction, {
    onSuccess: () => {
      toast.success("Healthcare service created successfully");
      void queryClient.invalidateQueries({ queryKey: healthcareServiceKeys.all });
      form.reset();
      handleCloseModal();
    },
    onError: ({ err }) => {
      handleZSAError({ err, form, fallbackMessage: "Failed to create healthcare service" });
    },
  });

  /**
   * Transforms the flat form values into the nested API payload expected by
   * CreateHealthcareServiceValidationSchema, then executes the create action.
   *
   * @param values - Validated form values from CreateHealthcareServiceFormSchema.
   */
  async function handleSubmit(values: TCreateHealthcareServiceFormSchema) {
    await execute({
      payload: {
        user_id: data?.userId,
        org_id: data?.orgId,
        provided_by: values.provided_by,
        provided_by_display: values.provided_by_display,
        active: values.active,
        name: values.name,
        comment: values.comment,
        extra_details: values.extra_details,
        appointment_required: values.appointment_required,
        availability_exceptions: values.availability_exceptions,
        photo_content_type: values.photo_content_type,
        photo_language: values.photo_language,
        photo_data: values.photo_data,
        photo_url: values.photo_url,
        photo_size: values.photo_size,
        photo_hash: values.photo_hash,
        photo_title: values.photo_title,
        photo_creation: values.photo_creation,
        identifier: values.identifier,
        category: values.category,
        type: values.type,
        specialty: values.specialty,
        location: values.location,
        telecom: values.telecom,
        coverage_area: values.coverage_area,
        service_provision_code: values.service_provision_code,
        eligibility: values.eligibility,
        program: values.program,
        characteristic: values.characteristic,
        communication: values.communication,
        referral_method: values.referral_method,
        available_time: values.available_time?.map((a) => ({
          days_of_week: splitCsv(a.days_of_week),
          all_day: a.all_day,
          available_start_time: a.available_start_time,
          available_end_time: a.available_end_time,
        })),
        not_available: values.not_available,
        endpoint: values.endpoint,
      },
      transportOptions: {
        shouldRevalidate: true,
        url: "/telemedicine/admin/healthcare-services",
      },
    });
  }

  return (
    <FileNestProvider
      tokenFetcher={tokenFetcher}
      projectId={process.env.NEXT_PUBLIC_FILENEST_PROJECT_ID!}
      baseUrl={process.env.NEXT_PUBLIC_FILENEST_API_URL}
      queryClient={queryClient}
    >
      <Sheet open={open} onOpenChange={(o) => !o && handleCloseModal()}>
        <SheetContent
          side="right"
          resizable
          maxWidth={1200}
          className="w-full sm:max-w-2xl overflow-hidden flex flex-col gap-0 p-0"
        >
          <SheetHeader className="border-b">
            <SheetTitle>New Healthcare Service</SheetTitle>
            <SheetDescription>
              Register a clinical service — classification, locations, contact
              details, and availability.
            </SheetDescription>
          </SheetHeader>

          <FormProvider {...form}>
            <CreateHealthcareServiceForm
              onSubmit={handleSubmit}
              onCancel={handleCloseModal}
              isPending={isPending}
            />
          </FormProvider>
        </SheetContent>
      </Sheet>
    </FileNestProvider>
  );
}
