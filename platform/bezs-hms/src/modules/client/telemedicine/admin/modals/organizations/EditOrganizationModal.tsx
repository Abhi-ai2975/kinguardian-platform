/**
 * EditOrganizationModal — self-contained Sheet for editing an Organization.
 *
 * Layer: client / telemedicine / admin / modals
 * Resource: Organization
 *
 * Pattern (nextjs-iam): the modal owns the form instance (useForm + FormProvider)
 * and the server action (useServerAction). The form component is a dumb shell
 * that reads from FormProvider via useFormContext() and renders field layout only.
 *
 * Uses a right-side Sheet instead of a centered Dialog — matches the Location
 * create/edit pattern.
 *
 * Opens when the Zustand admin store's type === "editOrganization".
 * The store's `data.organization` field carries the full org record used to
 * pre-populate the form. No props required.
 * Mounted once inside OrganizationModalProvider.
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
  EditOrgFormSchema,
  type TEditOrgFormSchema,
} from "@/modules/entities/schemas/organization";
import { updateOrganizationAction } from "@/modules/server/presentation/actions/organization";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

import { useAdminStore } from "../../stores/admin.store";
import { organizationKeys } from "../../queries/organization.queries";
import { EditOrganizationForm } from "../../forms/organizations/EditOrganizationForm";

/**
 * Self-contained edit dialog.
 * Owns the form instance and server action; delegates field rendering to
 * EditOrganizationForm via FormProvider.
 */
export function EditOrganizationModal() {
  const isOpen  = useAdminStore((s) => s.isOpen);
  const type    = useAdminStore((s) => s.type);
  const data    = useAdminStore((s) => s.data);
  const onClose = useAdminStore((s) => s.onClose);
  const queryClient = useQueryClient();

  /** Only open when this specific modal type is active. */
  const open = isOpen && type === "editOrganization";
  const org  = data?.organization;

  // ── Form instance ──────────────────────────────────────────────────────────
  const form = useForm<TEditOrgFormSchema>({
    resolver: zodResolver(EditOrgFormSchema),
    defaultValues: {
      name: org?.name ?? "",
      active: org?.active ?? true,
      partof_display: org?.partof_display ?? "",
    },
  });

  /**
   * Re-populate the form whenever a different org is opened for editing.
   * Without this reset, stale values from a previously edited record would
   * remain in the form when the user opens another org.
   */
  useEffect(() => {
    if (open && org) {
      form.reset({
        name: org.name ?? "",
        active: org.active ?? true,
        partof_display: org.partof_display ?? "",
      });
    }
  }, [open, org, form]);

  // ── Server action ──────────────────────────────────────────────────────────
  const { execute, isPending } = useServerAction(updateOrganizationAction, {
    onSuccess: () => {
      toast.success("Organization updated successfully");
      /** Invalidate all org list queries so the table reflects the updated record. */
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      onClose();
    },
    onError: ({ err }) => {
      /** handleZSAError maps INPUT_PARSE_ERROR fieldErrors → form.setError() */
      handleZSAError({ err, form, fallbackMessage: "Failed to update organization" });
    },
  });

  /**
   * Maps the flat form values to the API PATCH payload and executes the action.
   *
   * @param values - Validated form values from EditOrgFormSchema.
   */
  async function handleSubmit(values: TEditOrgFormSchema) {
    if (!org?.id) return;
    await execute({
      payload: {
        id: org.id,
        name: values.name,
        active: values.active,
        /** Only send partof_display if non-empty — avoids overwriting with "" */
        partof_display: values.partof_display || undefined,
      },
      transportOptions: {
        shouldRevalidate: true,
        url: "/telemedicine/admin/organizations",
      },
    });
  }

  /** Guard: skip rendering if no org record is available. */
  if (!open || !org) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        resizable
        maxWidth={1200}
        className="w-full sm:max-w-lg overflow-hidden flex flex-col gap-0 p-0"
      >
        <SheetHeader className="border-b">
          <SheetTitle>Edit Organization</SheetTitle>
          <SheetDescription>
            Update the name, status, or parent organization. Child arrays
            (types, telecoms, addresses) require delete and recreate.
          </SheetDescription>
        </SheetHeader>

        {/* FormProvider injects the form instance into EditOrganizationForm */}
        <FormProvider {...form}>
          <EditOrganizationForm
            onSubmit={handleSubmit}
            onCancel={onClose}
            isPending={isPending}
          />
        </FormProvider>
      </SheetContent>
    </Sheet>
  );
}
