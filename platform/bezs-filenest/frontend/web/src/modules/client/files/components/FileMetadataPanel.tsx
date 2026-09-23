/**
 * FileMetadataPanel — side drawer showing file detail, tags, and metadata.
 *
 * Opens when modalType === "fileDetails" in the file store. Tags are editable
 * inline (chip + X to remove, input to add). Metadata is editable as a raw
 * JSON textarea — useful for debugging and manual corrections.
 *
 * Tags mutations call setTagsAction (PUT — replace) or addTagsAction (POST — union).
 * Metadata mutations call updateMetadataAction (PUT — replace all).
 *
 * @module
 */
"use client";

import * as React from "react";
import { X, Plus, Save, Pencil } from "lucide-react";
import { useServerAction } from "zsa-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useFileStore } from "@/modules/client/files/stores/file.store";
import {
  setTagsAction,
  addTagsAction,
  updateMetadataAction,
} from "@/modules/server/presentation/actions/file.actions";
import { handleZSAError } from "@/modules/client/shared/error/handle-zsa-error";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function FileMetadataPanel() {
  const isOpen = useFileStore((s) => s.isOpen);
  const modalType = useFileStore((s) => s.modalType);
  const file = useFileStore((s) => s.fileData);
  const onClose = useFileStore((s) => s.onClose);
  const incrementTrigger = useFileStore((s) => s.incrementTrigger);

  const open = isOpen && modalType === "fileDetails" && file !== null;

  // Tags state
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState("");

  // Metadata state
  const [isEditingMetadata, setIsEditingMetadata] = React.useState(false);
  const [metadataJson, setMetadataJson] = React.useState("");
  const [metadataError, setMetadataError] = React.useState("");

  // Seed local state whenever a new file is opened
  React.useEffect(() => {
    if (file) {
      setTags(file.tags ?? []);
      setMetadataJson(JSON.stringify(file.metadata ?? {}, null, 2));
      setIsEditingMetadata(false);
      setMetadataError("");
      setTagInput("");
    }
  }, [file?.id]);

  const { execute: execSetTags, isPending: isPendingTags } = useServerAction(setTagsAction, {
    onSuccess: ({ data }) => {
      setTags(data?.tags ?? tags);
      incrementTrigger();
    },
    onError: ({ err }) => handleZSAError({ err, fallbackMessage: "Failed to update tags" }),
  });

  const { execute: execAddTags, isPending: isPendingAddTags } = useServerAction(addTagsAction, {
    onSuccess: ({ data }) => {
      setTags(data?.tags ?? tags);
      incrementTrigger();
    },
    onError: ({ err }) => handleZSAError({ err, fallbackMessage: "Failed to add tag" }),
  });

  const { execute: execUpdateMetadata, isPending: isPendingMetadata } = useServerAction(
    updateMetadataAction,
    {
      onSuccess: () => {
        setIsEditingMetadata(false);
        incrementTrigger();
        toast.success("Metadata saved");
      },
      onError: ({ err }) => handleZSAError({ err, fallbackMessage: "Failed to save metadata" }),
    },
  );

  function removeTag(tag: string) {
    if (!file) return;
    const next = tags.filter((t) => t !== tag);
    void execSetTags({ payload: { projectId: file.project_id, fileId: file.id, tags: next } });
  }

  function addTag() {
    const trimmed = tagInput.trim();
    if (!trimmed || !file || tags.includes(trimmed)) {
      setTagInput("");
      return;
    }
    void execAddTags({
      payload: { projectId: file.project_id, fileId: file.id, tags: [trimmed] },
    });
    setTagInput("");
  }

  function saveMetadata() {
    if (!file) return;
    setMetadataError("");
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(metadataJson);
      if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) throw new Error();
    } catch {
      setMetadataError("Must be a valid JSON object");
      return;
    }
    void execUpdateMetadata({ payload: { projectId: file.project_id, fileId: file.id, metadata: parsed } });
  }

  if (!file) return null;

  const metadataEntries = Object.entries(file.metadata ?? {});

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto flex flex-col gap-0 p-0">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="truncate text-base">{file.filename}</SheetTitle>
          <SheetDescription className="flex items-center gap-2 text-xs">
            <span>{formatBytes(file.size_bytes)}</span>
            <span>·</span>
            <span className="font-mono">{file.content_type}</span>
            <span>·</span>
            <Badge variant={file.status === "ready" ? "default" : "secondary"} className="text-xs">
              {file.status}
            </Badge>
          </SheetDescription>
        </SheetHeader>

        <Separator />

        {/* Tags */}
        <div className="px-6 py-5 flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tags</p>
          <div className="flex flex-wrap gap-1.5 min-h-[28px]">
            {tags.length === 0 && (
              <span className="text-xs text-muted-foreground italic">No tags</span>
            )}
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1 pr-1 text-xs">
                {tag}
                <button
                  type="button"
                  className="rounded-full hover:bg-muted p-0.5 transition-colors"
                  onClick={() => removeTag(tag)}
                  disabled={isPendingTags}
                  aria-label={`Remove tag ${tag}`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTag()}
              placeholder="Add tag…"
              className="h-8 text-sm"
              disabled={isPendingAddTags}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2"
              onClick={addTag}
              disabled={!tagInput.trim() || isPendingAddTags}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Metadata */}
        <div className="px-6 py-5 flex flex-col gap-3 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Metadata
            </p>
            {!isEditingMetadata && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 text-xs"
                onClick={() => {
                  setMetadataJson(JSON.stringify(file.metadata ?? {}, null, 2));
                  setMetadataError("");
                  setIsEditingMetadata(true);
                }}
              >
                <Pencil className="size-3" />
                Edit
              </Button>
            )}
          </div>

          {isEditingMetadata ? (
            <div className="flex flex-col gap-2">
              <Textarea
                value={metadataJson}
                onChange={(e) => { setMetadataJson(e.target.value); setMetadataError(""); }}
                className="font-mono text-xs min-h-[200px] resize-y"
                spellCheck={false}
              />
              {metadataError && (
                <p className="text-xs text-destructive">{metadataError}</p>
              )}
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => { setIsEditingMetadata(false); setMetadataError(""); }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={saveMetadata}
                  disabled={isPendingMetadata}
                >
                  <Save className="size-3.5" />
                  Save
                </Button>
              </div>
            </div>
          ) : metadataEntries.length === 0 ? (
            <span className="text-xs text-muted-foreground italic">No metadata</span>
          ) : (
            <div className="rounded-md border divide-y text-sm">
              {metadataEntries.map(([key, value]) => (
                <div key={key} className="flex gap-3 px-3 py-2">
                  <span className="font-mono text-xs text-muted-foreground w-[40%] shrink-0 truncate">
                    {key}
                  </span>
                  <span className="font-mono text-xs truncate">
                    {typeof value === "object" ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
