/**
 * CreatePractitionerModal — self-contained Sheet for creating a Practitioner.
 *
 * Layer: client / telemedicine / admin / modals
 * Resource: Practitioner
 *
 * Pattern: the modal owns the form instance (useForm + FormProvider) and the
 * server action (useServerAction). The form component is a dumb shell that
 * reads from FormProvider via useFormContext() and renders field layout only.
 *
 * handleSubmit responsibilities:
 *  - `user_id` comes from the form itself (required, visible input — see
 *    BasicTab); `org_id` is stamped from the session, matching every other
 *    resource.
 *  - Split each name's given/prefix/suffix (comma string) → string[].
 *  - Wrap each address's line (single string) → [string].
 *  - Call createPractitionerFullAction first (core + names/telecom/
 *    addresses/communications, atomically). Only if that succeeds, loop any
 *    entered identifier/qualification rows through the dedicated
 *    addPractitionerIdentifierAction/addPractitionerQualificationAction —
 *    those aren't part of the `/full` endpoint. A partial-failure toast
 *    (mirroring Slot's generate-slots pattern) reports if the core record
 *    saved but some sub-items failed, rather than a misleading flat
 *    success/fail.
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
  CreatePractitionerFormSchema,
  type TCreatePractitionerFormSchema,
} from "@/modules/entities/schemas/practitioner";
import {
  createPractitionerFullAction,
  addPractitionerIdentifierAction,
  addPractitionerQualificationAction,
} from "@/modules/server/presentation/actions/practitioner";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

import { useAdminStore } from "../../stores/admin.store";
import { practitionerKeys } from "../../queries/practitioner.queries";
import { CreatePractitionerForm } from "../../forms/practitioners/create-form";

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

/**
 * Self-contained create Sheet.
 * Owns the form instance and server action; delegates all field rendering to
 * CreatePractitionerForm via FormProvider.
 */
export function CreatePractitionerModal() {
  const isOpen = useAdminStore((s) => s.isOpen);
  const type = useAdminStore((s) => s.type);
  const data = useAdminStore((s) => s.data);
  const onClose = useAdminStore((s) => s.onClose);
  const queryClient = useQueryClient();

  const open = isOpen && type === "createPractitioner";

  const form = useForm<TCreatePractitionerFormSchema>({
    resolver: zodResolver(CreatePractitionerFormSchema),
    defaultValues: { active: true },
  });

  function handleCloseModal() {
    form.reset();
    onClose();
  }

  const { execute, isPending } = useServerAction(createPractitionerFullAction, {
    onSuccess: async ({ data: created }) => {
      void queryClient.invalidateQueries({ queryKey: practitionerKeys.all });

      const values = form.getValues();
      const identifierRows = values.identifier ?? [];
      const qualificationRows = values.qualification ?? [];
      let failedCount = 0;

      for (const row of identifierRows) {
        const [, err] = await addPractitionerIdentifierAction({
          payload: { practitionerId: created.id, ...row },
        });
        if (err) failedCount += 1;
      }
      for (const row of qualificationRows) {
        const [, err] = await addPractitionerQualificationAction({
          payload: { practitionerId: created.id, ...row },
        });
        if (err) failedCount += 1;
      }

      if (failedCount > 0) {
        toast.warning(
          `Practitioner created, but ${failedCount} identifier/qualification row${failedCount === 1 ? "" : "s"} failed to save`,
          { description: "You can add them again from the Edit sheet." },
        );
      } else {
        toast.success("Practitioner created successfully");
      }

      form.reset();
      handleCloseModal();
    },
    onError: ({ err }) => {
      handleZSAError({ err, form, fallbackMessage: "Failed to create practitioner" });
    },
  });

  /**
   * Transforms the flat form values into the nested API payload expected by
   * CreatePractitionerFullValidationSchema, then executes the create action.
   * Identifier/qualification rows are handled separately in onSuccess.
   *
   * @param values - Validated form values from CreatePractitionerFormSchema.
   */
  async function handleSubmit(values: TCreatePractitionerFormSchema) {
    await execute({
      payload: {
        user_id: values.user_id,
        org_id: data?.orgId,
        active: values.active,
        gender: values.gender,
        birth_date: values.birth_date,
        deceased_boolean: values.deceased_boolean,
        deceased_datetime: values.deceased_datetime,
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

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleCloseModal()}>
      <SheetContent
        side="right"
        resizable
        maxWidth={1200}
        className="w-full sm:max-w-2xl overflow-hidden flex flex-col gap-0 p-0"
      >
        <SheetHeader className="border-b">
          <SheetTitle>New Practitioner</SheetTitle>
          <SheetDescription>
            Create a new practitioner in the FHIR server and link it to a
            user account. Photo upload becomes available after saving.
          </SheetDescription>
        </SheetHeader>

        <FormProvider {...form}>
          <CreatePractitionerForm
            onSubmit={handleSubmit}
            onCancel={handleCloseModal}
            isPending={isPending}
          />
        </FormProvider>
      </SheetContent>
    </Sheet>
  );
}
