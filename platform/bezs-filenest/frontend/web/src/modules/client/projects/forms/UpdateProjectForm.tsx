/**
 * UpdateProjectForm — edit project name and description.
 *
 * Pre-filled from the project passed as a prop. Calls updateProjectAction and
 * revalidates the settings page on success.
 *
 * @module
 */
"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useServerAction } from "zsa-react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { updateProjectAction } from "@/modules/server/presentation/actions/project.actions";
import {
  UpdateProjectFormSchema,
  type TUpdateProjectForm,
} from "@/modules/entities/schemas/project";
import { handleZSAError } from "@/modules/client/shared/error/handle-zsa-error";
import type { TProject } from "@/modules/entities/schemas/project";

interface Props {
  project: TProject;
}

export function UpdateProjectForm({ project }: Props) {
  const form = useForm<TUpdateProjectForm>({
    resolver: zodResolver(UpdateProjectFormSchema),
    defaultValues: {
      name: project.name,
      description: project.description ?? "",
    },
  });

  const { execute: save, isPending } = useServerAction(updateProjectAction, {
    onSuccess: () => toast.success("Project updated"),
    onError: ({ err }) =>
      handleZSAError({ err, form, fallbackMessage: "Failed to update project" }),
  });

  async function onSubmit(values: TUpdateProjectForm) {
    await save({
      payload: { projectId: project.id, ...values },
      transportOptions: { shouldRevalidate: true },
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Project name</FieldLabel>
          <Controller
            name="name"
            control={form.control}
            render={({ field }) => (
              <Input
                id="name"
                placeholder="My Project"
                {...field}
              />
            )}
          />
          <FieldError>{form.formState.errors.name?.message}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Controller
            name="description"
            control={form.control}
            render={({ field }) => (
              <Textarea
                id="description"
                placeholder="What is this project used for?"
                rows={3}
                {...field}
              />
            )}
          />
          <FieldError>{form.formState.errors.description?.message}</FieldError>
        </Field>
      </FieldGroup>

      <Button type="submit" disabled={isPending}>
        <Save className="h-4 w-4 mr-1.5" />
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
