/**
 * EditPractitionerRoleModal — self-contained Sheet for editing a PractitionerRole.
 *
 * Layer: client / telemedicine / admin / modals
 * Resource: PractitionerRole
 *
 * Pattern: the modal owns the form instance (useForm + FormProvider) and the
 * server action (useServerAction). The form component is a dumb shell that
 * reads from FormProvider via useFormContext() and renders field layout only.
 *
 * Opens when the Zustand admin store's type === "editPractitionerRole".
 * The store's `data.practitionerRole` field carries the full record used to
 * pre-populate the form. No props required.
 * Mounted once inside PractitionerRoleModalProvider.
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
  EditPractitionerRoleFormSchema,
  type TEditPractitionerRoleFormSchema,
  type TPractitionerRoleResponse,
} from "@/modules/entities/schemas/practitioner-role";
import { updatePractitionerRoleAction } from "@/modules/server/presentation/actions/practitioner-role";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

import { useAdminStore } from "../../stores/admin.store";
import { practitionerRoleKeys } from "../../queries/practitioner-role.queries";
import { EditPractitionerRoleForm } from "../../forms/practitioner-roles/EditPractitionerRoleForm";

/** Maps a practitioner role record onto the flat edit form's default values. */
function toFormValues(
  role: TPractitionerRoleResponse | undefined,
): TEditPractitionerRoleFormSchema {
  return {
    active: role?.active ?? undefined,
    period_start: role?.period_start ?? "",
    period_end: role?.period_end ?? "",
    availability_exceptions: role?.availability_exceptions ?? "",
  };
}

/**
 * Self-contained edit Sheet.
 * Owns the form instance and server action; delegates field rendering to
 * EditPractitionerRoleForm via FormProvider.
 */
export function EditPractitionerRoleModal() {
  const isOpen = useAdminStore((s) => s.isOpen);
  const type = useAdminStore((s) => s.type);
  const data = useAdminStore((s) => s.data);
  const onClose = useAdminStore((s) => s.onClose);
  const queryClient = useQueryClient();

  const open = isOpen && type === "editPractitionerRole";
  const practitionerRole = data?.practitionerRole;

  const form = useForm<TEditPractitionerRoleFormSchema>({
    resolver: zodResolver(EditPractitionerRoleFormSchema),
    defaultValues: toFormValues(practitionerRole),
  });

  /**
   * Re-populate the form whenever a different role is opened for editing.
   * Without this reset, stale values from a previously edited record would
   * remain in the form when the user opens another role.
   */
  useEffect(() => {
    if (open && practitionerRole) {
      form.reset(toFormValues(practitionerRole));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, practitionerRole?.id]);

  const { execute, isPending } = useServerAction(updatePractitionerRoleAction, {
    onSuccess: () => {
      toast.success("Practitioner role updated successfully");
      void queryClient.invalidateQueries({ queryKey: practitionerRoleKeys.all });
      onClose();
    },
    onError: ({ err }) => {
      handleZSAError({ err, form, fallbackMessage: "Failed to update practitioner role" });
    },
  });

  /**
   * Maps the flat form values to the API PATCH payload and executes the action.
   *
   * @param values - Validated form values from EditPractitionerRoleFormSchema.
   */
  async function handleSubmit(values: TEditPractitionerRoleFormSchema) {
    if (!practitionerRole?.id) return;
    await execute({
      payload: {
        id: practitionerRole.id,
        active: values.active,
        period_start: values.period_start || undefined,
        period_end: values.period_end || undefined,
        availability_exceptions: values.availability_exceptions || undefined,
      },
      transportOptions: {
        shouldRevalidate: true,
        url: "/telemedicine/admin/practitioner-roles",
      },
    });
  }

  if (!open || !practitionerRole) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        resizable
        maxWidth={1200}
        className="w-full sm:max-w-lg overflow-hidden flex flex-col gap-0 p-0"
      >
        <SheetHeader className="border-b">
          <SheetTitle>Edit Practitioner Role</SheetTitle>
          <SheetDescription>
            Update scalar fields. Sub-resource arrays (codes, specialties,
            locations, healthcare services, characteristics, communication,
            contacts, availability, endpoints, identifiers) and the
            practitioner/organization references require delete and re-create.
          </SheetDescription>
        </SheetHeader>

        <FormProvider {...form}>
          <EditPractitionerRoleForm
            onSubmit={handleSubmit}
            onCancel={onClose}
            isPending={isPending}
          />
        </FormProvider>
      </SheetContent>
    </Sheet>
  );
}
