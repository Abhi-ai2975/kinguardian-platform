/**
 * DoctorProfilePhotoUpload — avatar display with click-to-upload for the doctor profile page.
 *
 * Layer: client / telemedicine / doctor / component / profile
 *
 * Renders a large circular avatar. If the practitioner has an existing photo the
 * component fetches a short-lived presigned URL from /api/filenest-download-url
 * and displays it; otherwise a single-letter fallback is shown. Clicking the
 * avatar (or the pencil overlay) opens a hidden file input that accepts images
 * up to 5 MB.
 *
 * On selection the file is uploaded via the FileNest @filenest-fs/react useUpload
 * hook (token provided by the parent FileNestProvider), then the FileNest file
 * record is persisted to the FHIR practitioner.photo[] sub-resource:
 *  - First upload → addPractitionerPhotoAction (POST)
 *  - Re-upload    → patchPractitionerPhotoAction (PATCH on the existing item)
 *
 * The component is disabled in create mode (practitionerId is undefined) because a
 * FHIR Practitioner record must exist before a photo sub-resource can be created.
 *
 * Must be rendered inside a <FileNestProvider> (set up in DoctorProfileForm).
 */

"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useUpload, type FileRecord } from "@filenest-fs/react";
import { Loader2, Pencil, Info } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  addPractitionerPhotoAction,
  patchPractitionerPhotoAction,
} from "@/modules/server/presentation/actions/practitioner/photos.actions";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DoctorProfilePhotoUploadProps {
  /** FileNest file ID stored in practitioner.photo[0].url — used to load the presigned URL. */
  initialFileId?: string;
  /**
   * FHIR Practitioner.id — required to call add/patch photo actions.
   * Undefined in create mode (no practitioner record yet); upload is disabled until set.
   */
  practitionerId?: number;
  /**
   * FHIR photo sub-resource item id (practitioner.photo[0].id).
   * When present, re-uploads call patchPractitionerPhotoAction instead of addPractitionerPhotoAction.
   */
  existingPhotoItemId?: number;
  /** Used to derive the avatar fallback letter (first character). Defaults to "D". */
  displayName?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Large avatar widget that lets the doctor upload a profile photo.
 *
 * State machine:
 *   idle → file selected → uploading → saving to FHIR → fetching URL → idle (new photo shown)
 *
 * @param initialFileId       - FileNest file ID from practitioner.photo[0].url.
 * @param practitionerId      - FHIR Practitioner.id — required for photo write actions.
 * @param existingPhotoItemId - FHIR photo item id for patch operations.
 * @param displayName         - Doctor's name, used for the initials fallback letter.
 */
export function DoctorProfilePhotoUpload({
  initialFileId,
  practitionerId,
  existingPhotoItemId,
  displayName,
}: DoctorProfilePhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  /** Currently displayed presigned download URL, or null to show fallback. */
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Tracks the FHIR photo sub-resource item id after the first upload.
   * Starts as existingPhotoItemId; updated to the returned id after addPractitionerPhotoAction.
   */
  const [currentPhotoItemId, setCurrentPhotoItemId] = useState<
    number | undefined
  >(existingPhotoItemId);

  const fallback = displayName ? displayName.charAt(0).toUpperCase() : "D";

  // ── Download URL fetcher ──────────────────────────────────────────────────

  /**
   * Fetches a short-lived presigned download URL for the given FileNest file ID.
   * Silently falls back to the initials avatar on any failure.
   *
   * @param fileId - FileNest file ID to get a URL for.
   */
  const fetchDownloadUrl = useCallback(async (fileId: string) => {
    setIsFetchingUrl(true);
    try {
      const res = await fetch(
        `/api/filenest-download-url?fileId=${encodeURIComponent(fileId)}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as { url: string };
      setPhotoUrl(data.url);
    } catch {
      // Network error — avatar will show initials fallback
    } finally {
      setIsFetchingUrl(false);
    }
  }, []);

  /** Load the existing photo URL on mount. */
  useEffect(() => {
    if (initialFileId) {
      fetchDownloadUrl(initialFileId);
    }
    // Only run on mount — initialFileId is a stable server prop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Upload handling ───────────────────────────────────────────────────────

  /**
   * Called by useUpload when an upload completes successfully.
   * Persists the FileNest file metadata to the FHIR practitioner.photo[] sub-resource,
   * then refreshes the presigned URL shown in the avatar.
   *
   * Uses addPractitionerPhotoAction for the first photo, patchPractitionerPhotoAction
   * for subsequent uploads (keyed by currentPhotoItemId).
   *
   * @param fileRecord - Completed FileRecord returned by FileNest.
   */
  const handleComplete = useCallback(
    async (fileRecord: FileRecord) => {
      if (!practitionerId) {
        toast.error(
          "Complete your doctor profile first before uploading a photo.",
        );
        return;
      }

      setIsSaving(true);
      try {
        // The SDK's final file-record fetch uses raw `fetch` (not the camelizing
        // HTTP client), so runtime keys are snake_case despite the TS type saying
        // camelCase. Read camelCase first and fall back to snake_case.
        const raw = fileRecord as unknown as Record<string, unknown>;
        const contentType = (fileRecord.contentType ??
          raw["content_type"] ??
          "") as string;
        const sizeBytes = (fileRecord.sizeBytes ??
          raw["size_bytes"] ??
          0) as number;
        const creation = new Date().toISOString();

        if (currentPhotoItemId != null) {
          // ── Update existing photo sub-resource ─────────────────────────────
          const [, err] = await patchPractitionerPhotoAction({
            payload: {
              practitionerId,
              photoId: currentPhotoItemId,
              url: fileRecord.id,
              content_type: contentType,
              size: sizeBytes,
              title: fileRecord.filename,
              creation,
            },
          });
          if (err) {
            console.log(err);
            handleZSAError({ err });
            return;
          }
        } else {
          // ── Create first photo sub-resource ────────────────────────────────
          const [data, err] = await addPractitionerPhotoAction({
            payload: {
              practitionerId,
              url: fileRecord.id,
              content_type: contentType,
              size: sizeBytes,
              title: fileRecord.filename,
              creation,
            },
          });
          if (err) {
            console.log(err);
            handleZSAError({ err });
            return;
          }
          // addPractitionerPhotoAction returns the created photo record directly
          // (TPractitionerPhotoResponse), not the full practitioner — use data.id.
          if (data?.id != null) {
            setCurrentPhotoItemId(data.id);
          }
        }

        // Refresh the avatar with a presigned URL for the new file
        await fetchDownloadUrl(fileRecord.id);
        toast.success("Profile photo updated.");
      } finally {
        setIsSaving(false);
      }
    },
    [practitionerId, currentPhotoItemId, fetchDownloadUrl],
  );

  const handleError = useCallback((error: Error) => {
    console.log({ error });
    toast.error(`Upload failed: ${error.message}`);
  }, []);

  const { upload, isUploading } = useUpload({
    onComplete: handleComplete,
    onError: handleError,
  });

  const isLoading = isUploading || isSaving || isFetchingUrl;

  // ── File input handler ────────────────────────────────────────────────────

  /**
   * Triggered when the user selects a file via the hidden input.
   * Clears the input value so the same file can be re-selected.
   *
   * @param e - Change event from the file input.
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // allow re-selecting the same file
    upload([file]);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  // ── Create-mode placeholder — shown before the practitioner record exists ─────

  if (!practitionerId) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm font-medium text-foreground">Profile photo</p>

        {/* Dimmed placeholder avatar */}
        <Avatar className="size-20 text-2xl font-semibold opacity-40">
          <AvatarFallback className="text-2xl">{fallback}</AvatarFallback>
        </Avatar>

        {/* Info callout */}
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 max-w-xs">
          <Info className="size-4 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed">
            Complete and save your doctor profile below first. Once saved, you
            can upload a profile photo here.
          </p>
        </div>
      </div>
    );
  }

  // ── Edit-mode upload UI ───────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-sm font-medium text-foreground">Profile photo</p>

      {/* Clickable avatar wrapper */}
      <div className="relative group/photo-upload w-fit">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
          aria-label="Change profile photo"
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        >
          {/* Avatar — 5rem (80px) circle */}
          <Avatar className="size-20 text-2xl font-semibold">
            {photoUrl && !isLoading && (
              <AvatarImage
                src={photoUrl}
                alt={`${displayName ?? "Doctor"} profile photo`}
              />
            )}
            <AvatarFallback className="text-2xl">
              {isLoading ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              ) : (
                fallback
              )}
            </AvatarFallback>
          </Avatar>

          {/* Pencil overlay — visible on hover when not loading */}
          {!isLoading && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover/photo-upload:opacity-100 transition-opacity duration-150">
              <Pencil className="size-5 text-white" />
            </span>
          )}
        </button>

        {/* Hidden file input — only images, max 5 MB enforced client-side */}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        JPEG, PNG, WebP or GIF · Max 5 MB
      </p>
    </div>
  );
}
