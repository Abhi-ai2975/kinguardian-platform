/**
 * EditPractitionerModal — self-contained Sheet for editing a Practitioner.
 *
 * Layer: client / telemedicine / admin / modals
 * Resource: Practitioner
 *
 * Pattern: the modal owns the form instance (useForm + FormProvider) and the
 * server action (useServerAction). The form component is a dumb shell that
 * reads from FormProvider via useFormContext() and renders field layout only.
 *
 * Opens when the Zustand admin store's type === "editPractitioner".
 * The store's `data.practitioner` field carries the full record used to
 * pre-populate the form. No props required.
 * Mounted once inside PractitionerModalProvider.
 *
 * Wrapped in a <FileNestProvider> so the Photo tab's DoctorProfilePhotoUpload
 * can call useUpload() to replace the practitioner's photo.
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
  EditPractitionerFormSchema,
  type TEditPractitionerFormSchema,
  type TPractitionerResponse,
} from "@/modules/entities/schemas/practitioner";
import { updatePractitionerFullAction } from "@/modules/server/presentation/actions/practitioner";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { useFileNestTokenFetcher } from "@/modules/client/shared/hooks/useFileNestTokenFetcher";

import { useAdminStore } from "../../stores/admin.store";
import { practitionerKeys } from "../../queries/practitioner.queries";
import { EditPractitionerForm } from "../../forms/practitioners/edit-form/EditPractitionerForm";

/** Splits a comma-separated string into a trimmed, non-empty string array. */
function splitCsv(s?: string): string[] | undefined {
  if (!s?.trim()) return undefined;
  const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

/**
 * Converts a blank date-input string to undefined.
 * fhir-gql's period_start/period_end are Optional[datetime] — an empty
 * string is not a valid datetime and fails Pydantic validation with a 422,
 * unlike an omitted key which is treated as null.
 */
function orUndef(s?: string): string | undefined {
  return s ? s : undefined;
}

/** Maps a practitioner record onto the tabbed edit form's default values. */
function toFormValues(
  practitioner: TPractitionerResponse | undefined,
): TEditPractitionerFormSchema {
  return {
    active: practitioner?.active ?? undefined,
    gender: (practitioner?.gender as TEditPractitionerFormSchema["gender"]) ?? undefined,
    birth_date: practitioner?.birth_date ?? "",
    deceased_boolean: practitioner?.deceased_boolean ?? undefined,
    deceased_datetime: practitioner?.deceased_datetime ?? "",
    names: practitioner?.name?.map((n) => ({
      use: n.use as never,
      text: n.text ?? "",
      family: n.family ?? "",
      given: n.given?.join(", ") ?? "",
      prefix: n.prefix?.join(", ") ?? "",
      suffix: n.suffix?.join(", ") ?? "",
      period_start: n.period_start ?? "",
      period_end: n.period_end ?? "",
    })),
    telecom: practitioner?.telecom?.map((t) => ({
      system: t.system as never,
      value: t.value ?? "",
      use: t.use as never,
      rank: t.rank ?? undefined,
      period_start: t.period_start ?? "",
      period_end: t.period_end ?? "",
    })),
    addresses: practitioner?.address?.map((a) => ({
      use: a.use as never,
      type: a.type as never,
      text: a.text ?? "",
      line: a.line?.[0] ?? "",
      city: a.city ?? "",
      district: a.district ?? "",
      state: a.state ?? "",
      postal_code: a.postal_code ?? "",
      country: a.country ?? "",
      period_start: a.period_start ?? "",
      period_end: a.period_end ?? "",
    })),
    communications: practitioner?.communication?.map((c) => ({
      language_system: c.language_system ?? "",
      language_code: c.language_code ?? "",
      language_display: c.language_display ?? "",
      language_text: c.language_text ?? "",
      preferred: c.preferred ?? undefined,
    })),
  };
}

/**
 * Self-contained edit Sheet.
 * Owns the form instance and server action; delegates field rendering to
 * EditPractitionerForm via FormProvider.
 */
export function EditPractitionerModal() {
  const isOpen = useAdminStore((s) => s.isOpen);
  const type = useAdminStore((s) => s.type);
  const data = useAdminStore((s) => s.data);
  const onClose = useAdminStore((s) => s.onClose);
  const queryClient = useQueryClient();

  const open = isOpen && type === "editPractitioner";
  const practitioner = data?.practitioner;

  const form = useForm<TEditPractitionerFormSchema>({
    resolver: zodResolver(EditPractitionerFormSchema),
    defaultValues: toFormValues(practitioner),
  });

  /** Uploads land under practitioners/photos/{id}, matching the doctor self-service scoping. */
  const tokenFetcher = useFileNestTokenFetcher({
    filePath: practitioner?.id
      ? `practitioners/photos/${practitioner.id}`
      : "practitioners/photos",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxSizeMb: 5,
    maxFiles: 1,
  });

  /**
   * Re-populate the form whenever a different practitioner is opened for
   * editing. Without this reset, stale values from a previously edited
   * record would remain in the form when the user opens another record.
   */
  useEffect(() => {
    if (open && practitioner) {
      form.reset(toFormValues(practitioner));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, practitioner?.id]);

  const { execute, isPending } = useServerAction(updatePractitionerFullAction, {
    onSuccess: () => {
      toast.success("Practitioner updated successfully");
      void queryClient.invalidateQueries({ queryKey: practitionerKeys.all });
      onClose();
    },
    onError: ({ err }) => {
      handleZSAError({ err, form, fallbackMessage: "Failed to update practitioner" });
    },
  });

  /**
   * Maps the flat form values to the `/full` PATCH payload and executes the
   * action. Omitted arrays (undefined) are left untouched by fhir-gql;
   * arrays present in the form (even empty) fully replace the existing ones.
   *
   * @param values - Validated form values from EditPractitionerFormSchema.
   */
  async function handleSubmit(values: TEditPractitionerFormSchema) {
    if (!practitioner?.id) return;
    await execute({
      payload: {
        id: practitioner.id,
        active: values.active,
        gender: values.gender,
        birth_date: values.birth_date || undefined,
        deceased_boolean: values.deceased_boolean,
        deceased_datetime: values.deceased_datetime || undefined,
        names: values.names?.map((n) => ({
          ...n,
          given: splitCsv(n.given),
          prefix: splitCsv(n.prefix),
          suffix: splitCsv(n.suffix),
          period_start: orUndef(n.period_start),
          period_end: orUndef(n.period_end),
        })),
        telecom: values.telecom?.map((t) => ({
          ...t,
          period_start: orUndef(t.period_start),
          period_end: orUndef(t.period_end),
        })),
        addresses: values.addresses?.map((a) => ({
          ...a,
          line: a.line ? [a.line] : undefined,
          period_start: orUndef(a.period_start),
          period_end: orUndef(a.period_end),
        })),
        communications: values.communications,
      },
      transportOptions: {
        shouldRevalidate: true,
        url: "/telemedicine/admin/practitioners",
      },
    });
  }

  if (!open || !practitioner) return null;

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
          className="w-full sm:max-w-2xl overflow-hidden flex flex-col gap-0 p-0"
        >
          <SheetHeader className="border-b">
            <SheetTitle>Edit Practitioner</SheetTitle>
            <SheetDescription>
              Update scalars and the names/contact/addresses/languages
              arrays (full replace on save). Identifiers, qualifications,
              and photo save immediately from their own tabs.
            </SheetDescription>
          </SheetHeader>

          <FormProvider {...form}>
            <EditPractitionerForm
              onSubmit={handleSubmit}
              onCancel={onClose}
              isPending={isPending}
              practitioner={practitioner}
            />
          </FormProvider>
        </SheetContent>
      </Sheet>
    </FileNestProvider>
  );
}
