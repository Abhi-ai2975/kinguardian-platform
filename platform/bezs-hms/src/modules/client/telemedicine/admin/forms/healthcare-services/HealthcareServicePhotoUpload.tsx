/**
 * HealthcareServicePhotoUpload — file picker + preview for the HealthcareService photo tab.
 *
 * Layer: client / telemedicine / admin / forms / healthcare-services
 *
 * Reuses the FileNest upload pattern already proven in
 * DoctorProfilePhotoUpload.tsx, but simpler: HealthcareService's photo is a
 * flat FHIR Attachment stored directly on the resource
 * (photo_content_type/_data/_url/_size/_hash/_title/_creation), not a
 * separate sub-resource array with its own add/patch server actions like
 * Practitioner's photo[]. So on `useUpload`'s `onComplete`, this component
 * just writes the 8 flat fields via `form.setValue(...)` — no immediate
 * server round-trip. The values are submitted as part of the normal
 * create/update payload when the surrounding form is saved.
 *
 * Must be rendered inside a <FileNestProvider> (set up in the Create/Edit
 * modal, matching how DoctorProfileForm.tsx wraps its own photo upload).
 */

"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { useUpload, type FileRecord } from "@filenest-fs/react";
import { Loader2, ImageIcon, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type {
  TCreateHealthcareServiceFormSchema,
  TEditHealthcareServiceFormSchema,
} from "@/modules/entities/schemas/healthcare-service";

/** Works against either the Create or Edit form schema — both share the same photo_* fields. */
type TPhotoFormSchema = TCreateHealthcareServiceFormSchema | TEditHealthcareServiceFormSchema;

/**
 * File picker with a live preview, backed by FileNest.
 * No props — reads/writes the surrounding form via useFormContext, so the
 * same component works unmodified inside both Create and Edit.
 */
export function HealthcareServicePhotoUpload() {
  const form = useFormContext<TPhotoFormSchema>();
  const inputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  const currentFileId = form.watch("photo_url");
  const currentTitle = form.watch("photo_title");

  /** Fetches a short-lived presigned download URL for the given FileNest file ID. */
  const fetchDownloadUrl = useCallback(async (fileId: string) => {
    setIsFetchingUrl(true);
    try {
      const res = await fetch(`/api/filenest-download-url?fileId=${encodeURIComponent(fileId)}`);
      if (!res.ok) return;
      const data = (await res.json()) as { url: string };
      setPreviewUrl(data.url);
    } catch {
      // Network error — preview stays blank, the field values are still intact.
    } finally {
      setIsFetchingUrl(false);
    }
  }, []);

  /** Load the existing photo preview on mount (edit mode with an existing photo_url). */
  useEffect(() => {
    if (currentFileId) fetchDownloadUrl(currentFileId);
    // Only run on mount — currentFileId is a stable initial value from defaultValues.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Called by useUpload when an upload completes successfully.
   * Writes the flat photo_* form fields — no server round-trip here, the
   * surrounding create/update submit carries these values.
   */
  const handleComplete = useCallback(
    async (fileRecord: FileRecord) => {
      // The SDK's final file-record fetch uses raw `fetch` (not the camelizing
      // HTTP client), so runtime keys are snake_case despite the TS type saying
      // camelCase. Read camelCase first and fall back to snake_case.
      const raw = fileRecord as unknown as Record<string, unknown>;
      const contentType = (fileRecord.contentType ?? raw["content_type"] ?? "") as string;
      const sizeBytes = (fileRecord.sizeBytes ?? raw["size_bytes"] ?? 0) as number;

      form.setValue("photo_url", fileRecord.id, { shouldDirty: true });
      form.setValue("photo_content_type", contentType, { shouldDirty: true });
      form.setValue("photo_size", sizeBytes, { shouldDirty: true });
      form.setValue("photo_title", fileRecord.filename, { shouldDirty: true });
      form.setValue("photo_creation", new Date().toISOString(), { shouldDirty: true });

      await fetchDownloadUrl(fileRecord.id);
      toast.success("Photo uploaded — will be saved with the rest of the form.");
    },
    [form, fetchDownloadUrl],
  );

  const handleError = useCallback((error: Error) => {
    toast.error(`Upload failed: ${error.message}`);
  }, []);

  const { upload, isUploading } = useUpload({
    onComplete: handleComplete,
    onError: handleError,
  });

  const isLoading = isUploading || isFetchingUrl;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // allow re-selecting the same file
    upload([file]);
  }

  function handleRemove() {
    form.setValue("photo_url", "", { shouldDirty: true });
    form.setValue("photo_content_type", "", { shouldDirty: true });
    form.setValue("photo_size", undefined, { shouldDirty: true });
    form.setValue("photo_title", "", { shouldDirty: true });
    form.setValue("photo_hash", "", { shouldDirty: true });
    form.setValue("photo_creation", "", { shouldDirty: true });
    setPreviewUrl(null);
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="relative flex size-32 items-center justify-center overflow-hidden rounded-md border bg-muted">
        {previewUrl && !isLoading ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={currentTitle || "Service photo"} className="size-full object-cover" />
        ) : isLoading ? (
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        ) : (
          <ImageIcon className="size-8 text-muted-foreground/50" />
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
        >
          <Upload className="mr-2 size-4" />
          {currentFileId ? "Replace Photo" : "Upload Photo"}
        </Button>
        {currentFileId && (
          <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={isLoading}>
            <Trash2 className="mr-2 size-4 text-destructive" />
            Remove
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">JPEG, PNG or WebP · Max 5 MB</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileChange}
      />
    </div>
  );
}
