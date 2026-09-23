/**
 * ProjectUploadRestrictionsForm — upload restriction settings for a project.
 *
 * Allows configuring max file size, accepted MIME types, accepted extensions,
 * and max files per upload request. Null values mean "no restriction".
 *
 * Tag inputs store values as string[] in form state. On save the arrays are
 * sent directly to updateUploadConfigAction which forwards them to the backend.
 * The backend converts [] → null (clear restriction) and non-empty → comma-joined TEXT.
 *
 * @module
 */
"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useServerAction } from "zsa-react";
import { toast } from "sonner";
import { Save, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { updateUploadConfigAction } from "@/modules/server/presentation/actions/project-config.actions";
import {
  UploadConfigFormSchema,
  type TUploadConfigForm,
  type TProjectConfig,
} from "@/modules/entities/schemas/project-config";
import { handleZSAError } from "@/modules/client/shared/error/handle-zsa-error";

// Common MIME type quick-picks grouped by category
const MIME_PRESETS: { label: string; types: string[] }[] = [
  { label: "Images", types: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"] },
  { label: "Documents", types: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"] },
  { label: "Spreadsheets", types: ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] },
  { label: "Videos", types: ["video/mp4", "video/webm", "video/quicktime"] },
  { label: "Audio", types: ["audio/mpeg", "audio/wav", "audio/ogg"] },
  { label: "Archives", types: ["application/zip", "application/x-tar", "application/x-gzip"] },
];

const SIZE_UNITS = [
  { label: "KB", multiplier: 1024 },
  { label: "MB", multiplier: 1024 * 1024 },
  { label: "GB", multiplier: 1024 * 1024 * 1024 },
] as const;

type SizeUnit = (typeof SIZE_UNITS)[number]["label"];

function bytesToUnit(bytes: number | null): { value: string; unit: SizeUnit } {
  if (bytes === null) return { value: "", unit: "MB" };
  if (bytes >= 1024 * 1024 * 1024) return { value: String(bytes / (1024 * 1024 * 1024)), unit: "GB" };
  if (bytes >= 1024 * 1024) return { value: String(bytes / (1024 * 1024)), unit: "MB" };
  return { value: String(bytes / 1024), unit: "KB" };
}

function unitToBytes(value: string, unit: SizeUnit): number | null {
  const num = parseFloat(value);
  if (!value || isNaN(num) || num <= 0) return null;
  const m = SIZE_UNITS.find((u) => u.label === unit)!.multiplier;
  return Math.floor(num * m);
}

interface TagInputProps {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}

function TagInput({ value, onChange, placeholder }: TagInputProps) {
  const [draft, setDraft] = React.useState("");

  function add() {
    const trimmed = draft.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setDraft("");
  }

  function remove(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); add(); }
          }}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="icon" onClick={add} disabled={!draft.trim()}>
          <Plus className="size-4" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1">
              <span className="text-xs font-mono">{tag}</span>
              <button
                type="button"
                onClick={() => remove(tag)}
                className="rounded hover:text-destructive transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  projectId: string;
  config: TProjectConfig;
}

export function ProjectUploadRestrictionsForm({ projectId, config }: Props) {
  const initial = bytesToUnit(config.max_file_size_bytes);
  const [sizeValue, setSizeValue] = React.useState(initial.value);
  const [sizeUnit, setSizeUnit] = React.useState<SizeUnit>(initial.unit);

  const form = useForm<TUploadConfigForm>({
    resolver: zodResolver(UploadConfigFormSchema),
    defaultValues: {
      max_file_size_bytes: config.max_file_size_bytes,
      allowed_mime_types: config.allowed_mime_types ?? [],
      allowed_extensions: config.allowed_extensions ?? [],
      max_files_per_request: config.max_files_per_request,
    },
  });

  const { execute: save, isPending } = useServerAction(updateUploadConfigAction, {
    onSuccess: () => toast.success("Upload restrictions saved"),
    onError: ({ err }) =>
      handleZSAError({ err, form, fallbackMessage: "Failed to save upload restrictions" }),
  });

  async function onSubmit(values: TUploadConfigForm) {
    await save({
      payload: {
        projectId,
        max_file_size_bytes: values.max_file_size_bytes,
        allowed_mime_types: values.allowed_mime_types.length ? values.allowed_mime_types : null,
        allowed_extensions: values.allowed_extensions.length ? values.allowed_extensions : null,
        max_files_per_request: values.max_files_per_request,
      },
    });
  }

  function togglePreset(types: string[]) {
    const current = form.getValues("allowed_mime_types");
    const allPresent = types.every((t) => current.includes(t));
    if (allPresent) {
      form.setValue("allowed_mime_types", current.filter((t) => !types.includes(t)));
    } else {
      const merged = [...new Set([...current, ...types])];
      form.setValue("allowed_mime_types", merged);
    }
  }

  const watchedMimes = form.watch("allowed_mime_types");

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <FieldGroup>
        {/* Max file size */}
        <Field>
          <FieldLabel>Max file size</FieldLabel>
          <FieldDescription>
            Maximum size allowed per individual file. Leave blank for no limit.
          </FieldDescription>
          <div className="flex gap-2">
            <Input
              value={sizeValue}
              onChange={(e) => {
                setSizeValue(e.target.value);
                form.setValue("max_file_size_bytes", unitToBytes(e.target.value, sizeUnit));
              }}
              placeholder="e.g. 50"
              className="w-32"
              type="number"
              min="0"
              step="any"
            />
            <NativeSelect
              value={sizeUnit}
              onChange={(e) => {
                const u = e.target.value as SizeUnit;
                setSizeUnit(u);
                form.setValue("max_file_size_bytes", unitToBytes(sizeValue, u));
              }}
              className="w-24"
            >
              {SIZE_UNITS.map((u) => (
                <NativeSelectOption key={u.label} value={u.label}>{u.label}</NativeSelectOption>
              ))}
            </NativeSelect>
            {sizeValue && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setSizeValue(""); form.setValue("max_file_size_bytes", null); }}
              >
                Clear
              </Button>
            )}
          </div>
        </Field>

        {/* Allowed MIME types */}
        <Field>
          <FieldLabel>Allowed MIME types</FieldLabel>
          <FieldDescription>
            Only these types will be accepted. Leave empty to allow all types.
          </FieldDescription>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {MIME_PRESETS.map((preset) => {
              const allPresent = preset.types.every((t) => watchedMimes.includes(t));
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => togglePreset(preset.types)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    allPresent
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          <Controller
            name="allowed_mime_types"
            control={form.control}
            render={({ field }) => (
              <TagInput
                value={field.value}
                onChange={field.onChange}
                placeholder="image/jpeg"
              />
            )}
          />
        </Field>

        {/* Allowed extensions */}
        <Field>
          <FieldLabel>Allowed extensions</FieldLabel>
          <FieldDescription>
            Optional extension filter (e.g. <code>.pdf</code>, <code>.jpg</code>). Leave empty to allow all.
          </FieldDescription>
          <Controller
            name="allowed_extensions"
            control={form.control}
            render={({ field }) => (
              <TagInput
                value={field.value}
                onChange={field.onChange}
                placeholder=".pdf"
              />
            )}
          />
        </Field>

        {/* Max files per request */}
        <Field>
          <FieldLabel>Max files per upload</FieldLabel>
          <FieldDescription>
            Maximum number of files in a single multipart upload call. Leave blank for no limit.
          </FieldDescription>
          <Controller
            name="max_files_per_request"
            control={form.control}
            render={({ field, fieldState }) => (
              <>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                  type="number"
                  min="1"
                  placeholder="e.g. 10"
                  className="w-32"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </>
            )}
          />
        </Field>
      </FieldGroup>

      <Button type="submit" disabled={isPending}>
        <Save className="h-4 w-4 mr-1.5" />
        {isPending ? "Saving…" : "Save restrictions"}
      </Button>
    </form>
  );
}
