/**
 * CreatePractitionerRoleModal — self-contained Sheet for creating a PractitionerRole.
 *
 * Layer: client / telemedicine / admin / modals
 * Resource: PractitionerRole
 *
 * Pattern: the modal owns the form instance (useForm + FormProvider) and the
 * server action (useServerAction). The form component is a dumb shell that
 * reads from FormProvider via useFormContext() and renders field layout only.
 *
 * handleSubmit responsibilities:
 *  - user_id/org_id are optional for PractitionerRole (matches Organization/
 *    Schedule's pattern) — stamped from the session when present.
 *  - Split each contact's names[].given/prefix/suffix (comma string) → string[].
 *  - Wrap each contact's address_line (single string) → [string].
 *  - Split each availability's available_times[].days_of_week (comma string) → string[].
 *  - Pass identifier[], code[], specialty[], location[], healthcare_service[],
 *    characteristic[], communication[], endpoint[] directly (already arrays,
 *    no form-specific transformation needed).
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
  CreatePractitionerRoleFormSchema,
  type TCreatePractitionerRoleFormSchema,
} from "@/modules/entities/schemas/practitioner-role";
import { createPractitionerRoleAction } from "@/modules/server/presentation/actions/practitioner-role";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

import { useAdminStore } from "../../stores/admin.store";
import { practitionerRoleKeys } from "../../queries/practitioner-role.queries";
import { CreatePractitionerRoleForm } from "../../forms/practitioner-roles/create-form";

/** Splits a comma-separated string into a trimmed, non-empty string array. */
function splitCsv(s?: string): string[] | undefined {
  if (!s?.trim()) return undefined;
  const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

/**
 * Self-contained create Sheet.
 * Owns the form instance and server action; delegates all field rendering to
 * CreatePractitionerRoleForm via FormProvider.
 */
export function CreatePractitionerRoleModal() {
  const isOpen = useAdminStore((s) => s.isOpen);
  const type = useAdminStore((s) => s.type);
  const data = useAdminStore((s) => s.data);
  const onClose = useAdminStore((s) => s.onClose);
  const queryClient = useQueryClient();

  const open = isOpen && type === "createPractitionerRole";

  const form = useForm<TCreatePractitionerRoleFormSchema>({
    resolver: zodResolver(CreatePractitionerRoleFormSchema),
    defaultValues: { active: true },
  });

  function handleCloseModal() {
    form.reset();
    onClose();
  }

  const { execute, isPending } = useServerAction(createPractitionerRoleAction, {
    onSuccess: () => {
      toast.success("Practitioner role created successfully");
      void queryClient.invalidateQueries({ queryKey: practitionerRoleKeys.all });
      form.reset();
      handleCloseModal();
    },
    onError: ({ err }) => {
      handleZSAError({ err, form, fallbackMessage: "Failed to create practitioner role" });
    },
  });

  /**
   * Transforms the flat form values into the nested API payload expected by
   * CreatePractitionerRoleValidationSchema, then executes the create action.
   *
   * @param values - Validated form values from CreatePractitionerRoleFormSchema.
   */
  async function handleSubmit(values: TCreatePractitionerRoleFormSchema) {
    await execute({
      payload: {
        user_id: data?.userId,
        org_id: data?.orgId,
        practitioner: values.practitioner,
        practitioner_display: values.practitioner_display,
        organization: values.organization,
        organization_display: values.organization_display,
        active: values.active,
        period_start: values.period_start,
        period_end: values.period_end,
        availability_exceptions: values.availability_exceptions,
        identifier: values.identifier,
        code: values.code,
        specialty: values.specialty,
        location: values.location,
        healthcare_service: values.healthcare_service,
        characteristic: values.characteristic,
        communication: values.communication,
        endpoint: values.endpoint,
        contact: values.contact?.map((c) => ({
          ...c,
          address_line: c.address_line ? [c.address_line] : undefined,
          names: c.names?.map((n) => ({
            ...n,
            given: splitCsv(n.given),
            prefix: splitCsv(n.prefix),
            suffix: splitCsv(n.suffix),
          })),
        })),
        availability: values.availability?.map((a) => ({
          ...a,
          available_times: a.available_times?.map((t) => ({
            ...t,
            days_of_week: splitCsv(t.days_of_week),
          })),
        })),
      },
      transportOptions: {
        shouldRevalidate: true,
        url: "/telemedicine/admin/practitioner-roles",
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
          <SheetTitle>New Practitioner Role</SheetTitle>
          <SheetDescription>
            Create a new practitioner role in the FHIR server. All fields are
            optional except the tenant context stamped automatically from
            your session.
          </SheetDescription>
        </SheetHeader>

        <FormProvider {...form}>
          <CreatePractitionerRoleForm
            onSubmit={handleSubmit}
            onCancel={handleCloseModal}
            isPending={isPending}
          />
        </FormProvider>
      </SheetContent>
    </Sheet>
  );
}
