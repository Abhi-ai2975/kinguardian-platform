/**
 * CreateOrganizationModal — self-contained Sheet for creating an Organization.
 *
 * Layer: client / telemedicine / admin / modals
 * Resource: Organization
 *
 * Pattern (nextjs-iam): the modal owns the form instance (useForm + FormProvider)
 * and the server action (useServerAction). The form component is a dumb shell
 * that reads from FormProvider via useFormContext() and renders field layout only.
 *
 * Uses a right-side Sheet instead of a centered Dialog — matches the Location
 * create/edit pattern, giving the tabbed multi-section form more usable
 * height than the Dialog + max-h-[90vh] workaround this screen used before.
 *
 * Opens when the Zustand admin store's type === "createOrganization".
 * No props required — subscribes to the store directly.
 * Mounted once inside OrganizationModalProvider.
 *
 * handleSubmit responsibilities:
 *  - Transform OrgAddressFormItemSchema.line (string) → string[] (wrap in array)
 *  - Transform OrgContactFormItemSchema comma-separated strings → string[]
 *    (name_given, name_prefix, name_suffix, address_line)
 *  - Pass type[], alias[], identifier[], telecom[], endpoint[] directly (already arrays)
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
  CreateOrgFormSchema,
  type TCreateOrgFormSchema,
} from "@/modules/entities/schemas/organization";
import { registerOrganizationAction } from "@/modules/server/presentation/actions/organization";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

import { useAdminStore } from "../../stores/admin.store";
import { organizationKeys } from "../../queries/organization.queries";
import { CreateOrganizationForm } from "../../forms/organizations/create-form";

/**
 * Self-contained create dialog.
 * Owns the form instance and server action; delegates all field rendering to
 * CreateOrganizationForm via FormProvider.
 *
 * Terminology fetching is handled inside CreateOrganizationForm — no longer
 * lives in the modal so the form can own the type array field completely.
 */
export function CreateOrganizationModal() {
  const isOpen = useAdminStore((s) => s.isOpen);
  const type = useAdminStore((s) => s.type);
  const data = useAdminStore((s) => s.data);
  const onClose = useAdminStore((s) => s.onClose);
  const queryClient = useQueryClient();

  /** Only open when this specific modal type is active. */
  const open = isOpen && type === "createOrganization";

  // ── Form instance ──────────────────────────────────────────────────────────
  const form = useForm<TCreateOrgFormSchema>({
    resolver: zodResolver(CreateOrgFormSchema),
    defaultValues: { active: true, type: [] },
  });

  function handleCloseModal() {
    form.reset();
    onClose();
  }

  // ── Server action ──────────────────────────────────────────────────────────
  const { execute, isPending } = useServerAction(registerOrganizationAction, {
    onSuccess: () => {
      toast.success("Organization created successfully");
      /** Invalidate all org list queries so the table refetches the latest data. */
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      form.reset();
      handleCloseModal();
    },
    onError: ({ err }) => {
      /** handleZSAError maps INPUT_PARSE_ERROR fieldErrors → form.setError() */
      handleZSAError({
        err,
        form,
        fallbackMessage: "Failed to create organization",
      });
    },
  });

  /**
   * Transforms the flat form values (with comma-strings for string[] fields)
   * into the fully nested API payload expected by RegisterOrgValidationSchema,
   * then executes the register action.
   *
   * Transformation rules:
   *  - address[i].line (string) → [string]         (single line wrapped in array)
   *  - contact[i].name_given   (csv) → string[]    (split + trim, filter empty)
   *  - contact[i].name_prefix  (csv) → string[]
   *  - contact[i].name_suffix  (csv) → string[]
   *  - contact[i].address_line (csv) → string[]
   *
   * @param values - Validated form values from CreateOrgFormSchema.
   */
  async function handleSubmit(values: TCreateOrgFormSchema) {
    /** Splits a comma-separated string into a trimmed, non-empty string array. */
    function splitCsv(s?: string): string[] | undefined {
      if (!s?.trim()) return undefined;
      const parts = s
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      return parts.length > 0 ? parts : undefined;
    }

    await execute({
      payload: {
        name: values.name,
        active: values.active,
        type: values.type,
        partof: values.partof,
        partof_display: values.partof_display,
        identifier: values.identifier,
        alias: values.alias,
        telecom: values.telecom,
        // Wrap the single street-line string in an array for each address entry.
        address: values.address?.map((addr) => ({
          ...addr,
          line: addr.line ? [addr.line] : undefined,
        })),
        // Expand comma-separated string fields back to string[] for each contact.
        contact: values.contact?.map((c) => ({
          purpose_system: c.purpose_system,
          purpose_code: c.purpose_code,
          purpose_display: c.purpose_display,
          purpose_text: c.purpose_text,
          name_use: c.name_use,
          name_text: c.name_text,
          name_family: c.name_family,
          name_given: splitCsv(c.name_given),
          name_prefix: splitCsv(c.name_prefix),
          name_suffix: splitCsv(c.name_suffix),
          address_use: c.address_use,
          address_type: c.address_type,
          address_text: c.address_text,
          address_line: splitCsv(c.address_line),
          address_city: c.address_city,
          address_district: c.address_district,
          address_state: c.address_state,
          address_postal_code: c.address_postal_code,
          address_country: c.address_country,
          telecom: c.telecom,
        })),
        endpoint: values.endpoint,
        // Stamp the creator and tenant on the resource from the session context.
        user_id: data?.userId,
        org_id: data?.orgId,
      },
      transportOptions: {
        shouldRevalidate: true,
        url: "/telemedicine/admin/organizations",
      },
    });
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleCloseModal()}>
      {/* Right-side Sheet — matches the Location create/edit pattern, gives
          the tabbed multi-section form more usable height than a centered Dialog */}
      <SheetContent
        side="right"
        resizable
        maxWidth={1200}
        className="w-full sm:max-w-2xl overflow-hidden flex flex-col gap-0 p-0"
      >
        <SheetHeader className="border-b">
          <SheetTitle>New Organization</SheetTitle>
          <SheetDescription>
            Register a new organization in the FHIR server. Fill in the Basic
            tab at minimum — name and type are required.
          </SheetDescription>
        </SheetHeader>

        {/* FormProvider injects the form instance into CreateOrganizationForm */}
        <FormProvider {...form}>
          <CreateOrganizationForm
            onSubmit={handleSubmit}
            onCancel={handleCloseModal}
            isPending={isPending}
          />
        </FormProvider>
      </SheetContent>
    </Sheet>
  );
}
