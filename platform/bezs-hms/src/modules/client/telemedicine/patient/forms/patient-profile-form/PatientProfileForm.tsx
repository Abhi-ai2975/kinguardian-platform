/**
 * PatientProfileForm — unified create/edit shell for the patient FHIR profile.
 *
 * Layer: client / telemedicine / patient / forms
 *
 * Thin orchestration layer — owns:
 *   - Form instance setup (react-hook-form + zod resolver)
 *   - Sequential upsert submit pipeline (patient → name → telecoms → address)
 *   - Page layout and sticky submit bar
 *
 * All field rendering lives in the section components under ./sections/.
 * Schema and default derivation live in ./schema.ts.
 *
 * Submit pipeline (create mode):
 *   1. createPatientFullAction — single atomic call that creates the patient
 *      + name + telecoms + address in one DB transaction (POST /patients/full).
 *
 * Submit pipeline (edit mode):
 *   1. updatePatientFullAction — single atomic call that updates scalar fields
 *      + replaces name / telecom / address arrays in one DB transaction
 *      (PATCH /patients/{id}/full).
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { CircleAlert, Loader2 } from "lucide-react";
import { FileNestProvider } from "@filenest-fs/react";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";

import {
  createPatientFullAction,
  updatePatientFullAction,
} from "@/modules/server/presentation/actions/patient";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { useFileNestTokenFetcher } from "@/modules/client/shared/hooks/useFileNestTokenFetcher";
import { ProfilePhotoUpload } from "@/modules/client/telemedicine/patient/component/profile/ProfilePhotoUpload";

import { ProfileFormSchema, deriveDefaults, type TProfileForm } from "./schema";
import { PersonalDetailsSection } from "./sections/PersonalDetailsSection";
import { ContactSection } from "./sections/ContactSection";
import { AddressSection } from "./sections/AddressSection";
import type { PatientProfileFormProps } from "./types";

/**
 * Single-page patient profile form for both initial setup and ongoing edits.
 *
 * @param initialPatient - Existing patient data or null (create mode).
 * @param userId         - The signed-in user's ID.
 * @param orgId          - The active organisation ID.
 */
export function PatientProfileForm({
  initialPatient,
  userId,
  orgId,
}: PatientProfileFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isCreateMode = initialPatient === null;
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<TProfileForm>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: deriveDefaults(initialPatient),
  });

  // ── Submit handler ────────────────────────────────────────────────────────────

  /**
   * Sequential upsert pipeline. Returns early on the first error — errors are
   * surfaced via handleZSAError (toast) rather than thrown.
   *
   * @param values - Validated flat form values.
   */
  async function onSubmit(values: TProfileForm) {
    setIsSaving(true);

    try {
      const birthDateStr = values.birth_date
        ? format(values.birth_date, "yyyy-MM-dd")
        : undefined;

      if (isCreateMode) {
        // ── Create mode: single atomic request ─────────────────────────────────
        // POST /patients/full creates the patient and all sub-resources in one
        // DB transaction, replacing the previous 7-step sequential pipeline.

        const telecoms = [
          values.phone
            ? { system: "phone" as const, value: values.phone, rank: 1 }
            : null,
          values.alt_phone
            ? { system: "phone" as const, value: values.alt_phone, rank: 2 }
            : null,
          values.email
            ? { system: "email" as const, value: values.email, rank: 1 }
            : null,
          values.alt_email
            ? { system: "email" as const, value: values.alt_email, rank: 2 }
            : null,
        ].filter((t): t is NonNullable<typeof t> => t !== null);

        const hasAddress = !!(
          values.address_line ||
          values.address_city ||
          values.address_state ||
          values.address_postal_code
        );

        const [, err] = await createPatientFullAction({
          payload: {
            user_id: userId,
            org_id: orgId,
            active: true,
            gender: values.gender || undefined,
            birth_date: birthDateStr,
            names:
              values.family_name || values.given_name
                ? [
                    {
                      family: values.family_name || undefined,
                      given: values.given_name
                        ? [values.given_name]
                        : undefined,
                    },
                  ]
                : undefined,
            telecom: telecoms.length ? telecoms : undefined,
            addresses: hasAddress
              ? [
                  {
                    line: values.address_line
                      ? [values.address_line]
                      : undefined,
                    city: values.address_city || undefined,
                    state: values.address_state || undefined,
                    postal_code: values.address_postal_code || undefined,
                  },
                ]
              : undefined,
          },
        });
        if (err) {
          handleZSAError({ err });
          return;
        }
      } else {
        // ── Edit mode: single atomic PATCH /patients/{id}/full ─────────────────

        const telecoms = [
          values.phone
            ? { system: "phone" as const, value: values.phone, rank: 1 }
            : null,
          values.alt_phone
            ? { system: "phone" as const, value: values.alt_phone, rank: 2 }
            : null,
          values.email
            ? { system: "email" as const, value: values.email, rank: 1 }
            : null,
          values.alt_email
            ? { system: "email" as const, value: values.alt_email, rank: 2 }
            : null,
        ].filter((t): t is NonNullable<typeof t> => t !== null);

        const hasAddress = !!(
          values.address_line ||
          values.address_city ||
          values.address_state ||
          values.address_postal_code
        );

        const [, err] = await updatePatientFullAction({
          payload: {
            id: initialPatient.id,
            gender: values.gender || undefined,
            birth_date: birthDateStr,
            names:
              values.family_name || values.given_name
                ? [
                    {
                      family: values.family_name || undefined,
                      given: values.given_name
                        ? [values.given_name]
                        : undefined,
                    },
                  ]
                : undefined,
            telecom: telecoms.length ? telecoms : undefined,
            addresses: hasAddress
              ? [
                  {
                    line: values.address_line
                      ? [values.address_line]
                      : undefined,
                    city: values.address_city || undefined,
                    state: values.address_state || undefined,
                    postal_code: values.address_postal_code || undefined,
                  },
                ]
              : undefined,
          },
        });
        if (err) {
          handleZSAError({ err });
          return;
        }
      }

      toast.success(isCreateMode ? "Profile created." : "Profile updated.");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  // Folder path is "{patientFhirId}/profile". Undefined in create mode —
  // upload is disabled until the patient record exists (see ProfilePhotoUpload).
  const folderPath = initialPatient?.id
    ? `${initialPatient.id}/profile`
    : undefined;

  const tokenFetcher = useFileNestTokenFetcher({
    filePath: folderPath,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxSizeMb: 5,
    maxFiles: 1,
    metadata: initialPatient?.id ? { patientFhirId: initialPatient.id } : {},
    userId,
    orgId,
  });

  // Derive photo state from the FHIR patient.photo[] array (first entry = profile photo).
  const existingPhoto = initialPatient?.photo?.[0] ?? null;
  /** FileNest file ID stored in the FHIR photo url field — used to fetch presigned URLs. */
  const initialFileId = existingPhoto?.url ?? undefined;
  /** FHIR Patient.id — required to call addPatientPhotoAction / patchPatientPhotoAction. */
  const patientId = initialPatient?.id ?? undefined;
  /** FHIR photo sub-resource item id — used by patchPatientPhotoAction when updating. */
  const existingPhotoItemId = existingPhoto?.id ?? undefined;

  // Derive a display name for the avatar fallback letter from the patient's
  // given name if available, otherwise fall back to the userId initial.
  const displayName = initialPatient?.name?.[0]?.given?.[0] ?? undefined;

  return (
    <FileNestProvider
      tokenFetcher={tokenFetcher}
      projectId={process.env.NEXT_PUBLIC_FILENEST_PROJECT_ID!}
      baseUrl={process.env.NEXT_PUBLIC_FILENEST_API_URL}
      queryClient={queryClient}
    >
      <div>
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            Patient Profile
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isCreateMode
              ? "Complete your medical profile to get started."
              : "Your health information on file."}
          </p>
        </div>

        {/* Incomplete profile banner */}
        {isCreateMode && (
          <div className="flex items-center gap-2 bg-warning/20 text-warning px-4 py-2 rounded-full mb-6 text-sm font-medium">
            <CircleAlert className="size-4 shrink-0" />
            <span>Complete your profile first!</span>
          </div>
        )}

        {/* Profile photo — independent of the form submit; uploads immediately on selection */}
        <div className="mb-8">
          <ProfilePhotoUpload
            initialFileId={initialFileId}
            patientId={patientId}
            existingPhotoItemId={existingPhotoItemId}
            displayName={displayName}
          />
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col min-h-[calc(100dvh-10rem)] -mb-6"
          >
            <div className="flex flex-col gap-10 flex-1 mb-4">
              <PersonalDetailsSection />
              <ContactSection />
              <AddressSection />
            </div>

            {/* Sticky submit bar. -mb-6 bleeds through the parent <main>'s pb-6 —
                position:sticky can't cover an ancestor's own padding, so without
                this the bar stops short of the screen edge and leaves a visible
                gap below the button. */}
            <div className="sticky bottom-0 z-10 -mx-4 -mb-6 px-4 py-3 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 border-t flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="w-full md:w-fit min-w-32"
              >
                {isSaving && <Loader2 className="size-4 mr-2 animate-spin" />}
                {isCreateMode ? "Set up profile" : "Save changes"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </FileNestProvider>
  );
}
