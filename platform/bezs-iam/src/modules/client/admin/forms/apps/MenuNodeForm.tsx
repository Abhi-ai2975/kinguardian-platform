"use client";

import { useFormContext, useWatch, Controller } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, X } from "lucide-react";
import { SelectItem } from "@/components/ui/select";
import {
  TUpdateMenuNodeFormSchema,
} from "@/modules/entities/schemas/admin/apps/apps.schema";
import {
  FormInput,
  FormSelect,
  FormSwitch,
} from "@/modules/client/shared/custom-form-fields";

type TMenuNodeFormSchema = TUpdateMenuNodeFormSchema;

interface MenuNodeFormProps {
  onSubmit: (data: TMenuNodeFormSchema) => Promise<void>;
  onCancel: () => void;
  appId: string;
  parentNodes: { id: string; label: string }[];
  availableActions?: { key: string; name: string }[];
  submitLabel?: string;
}

export function MenuNodeForm({
  onSubmit,
  onCancel,
  parentNodes,
  availableActions = [],
  submitLabel = "Save",
}: MenuNodeFormProps) {
  const form = useFormContext<TMenuNodeFormSchema>();
  const {
    control,
    setValue,
    formState: { isSubmitting },
  } = form;

  const labelValue = useWatch({ control, name: "label" });
  const permissionKeys = useWatch({ control, name: "permissionKeys" }) ?? [];

  const [keyInput, setKeyInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const slug = (labelValue ?? "")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    setValue("slug", slug, { shouldValidate: false });
  }, [labelValue, setValue]);

  function addKey(key: string) {
    const trimmed = key.trim();
    if (!trimmed || permissionKeys.includes(trimmed)) return;
    setValue("permissionKeys", [...permissionKeys, trimmed], { shouldValidate: true });
    setKeyInput("");
  }

  function removeKey(key: string) {
    setValue(
      "permissionKeys",
      permissionKeys.filter((k) => k !== key),
      { shouldValidate: true },
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addKey(keyInput);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormInput
        control={control}
        name="label"
        label="Label"
        placeholder="e.g. Dashboard"
      />
      <FormInput
        control={control}
        name="slug"
        label="Slug"
        placeholder="e.g. dashboard"
        description="Lowercase letters and dashes"
      />
      <FormSelect
        control={control}
        name="type"
        label="Type"
        placeholder="Select type"
      >
        <SelectItem value="GROUP">GROUP</SelectItem>
        <SelectItem value="ITEM">ITEM</SelectItem>
      </FormSelect>
      <FormSelect
        control={control}
        name="parentId"
        label="Parent Node"
        placeholder="None (root node)"
      >
        <SelectItem value="__none__">None (root node)</SelectItem>
        {parentNodes.map((node) => (
          <SelectItem key={node.id} value={node.id}>
            {node.label}
          </SelectItem>
        ))}
      </FormSelect>
      <FormInput
        control={control}
        name="icon"
        label="Icon"
        placeholder="e.g. Home"
        description="Lucide icon name e.g. Home"
      />
      <FormInput
        control={control}
        name="href"
        label="Href"
        placeholder="e.g. /dashboard"
        description="URL path e.g. /dashboard"
      />
      <FormSwitch control={control} name="isActive" label="Active" />
      <FormSwitch control={control} name="isVisible" label="Show in sidebar nav" />

      {/* Permission Keys tag input */}
      <Controller
        control={control}
        name="permissionKeys"
        render={() => (
          <div className="space-y-2">
            <Label>Permission Keys</Label>
            <p className="text-xs text-muted-foreground">
              Leave empty to make this node visible to all users.
            </p>
            {permissionKeys.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {permissionKeys.map((key) => (
                  <Badge key={key} variant="secondary" className="gap-1 pr-1">
                    {key}
                    <button
                      type="button"
                      onClick={() => removeKey(key)}
                      className="ml-0.5 rounded-sm opacity-70 hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. patient:read"
                className="h-8 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addKey(keyInput)}
              >
                Add
              </Button>
            </div>
            {availableActions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">
                  Available permissions — click to add:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {availableActions.map((action) => {
                    const alreadyAdded = permissionKeys.includes(action.key);
                    return (
                      <button
                        key={action.key}
                        type="button"
                        onClick={() => addKey(action.key)}
                        disabled={alreadyAdded}
                        title={action.name}
                      >
                        <Badge
                          variant={alreadyAdded ? "default" : "outline"}
                          className="cursor-pointer text-xs"
                        >
                          {action.key}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      />

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
