"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAdminStore } from "../../stores/admin.store";
import { useServerAction } from "zsa-react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import {
  CreateResourceActionFormSchema,
  TCreateResourceActionFormSchema,
} from "@/modules/entities/schemas/admin/resources/resources.schema";
import {
  createResourceActionAction,
  listResourcesAction,
} from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { ResourceActionForm } from "../../forms/resources/ResourceActionForm";

export const CreateResourceActionModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);

  const isModalOpen = isOpen && modalType === "createResourceAction";

  const [resources, setResources] = useState<{ id: string; name: string }[]>([]);

  const { execute: fetchResources, isPending: isLoading } = useServerAction(listResourcesAction, {
    onSuccess({ data }) {
      setResources(data.map((r) => ({ id: r.id, name: r.name })));
    },
  });

  useEffect(() => {
    if (!isModalOpen) return;
    void fetchResources();
  }, [isModalOpen]);

  const form = useForm<TCreateResourceActionFormSchema>({
    resolver: zodResolver(CreateResourceActionFormSchema),
    defaultValues: {
      resourceId: "",
      name: "",
      description: "",
      key: "",
    },
  });

  const { execute } = useServerAction(createResourceActionAction, {
    onSuccess() {
      toast.success("Resource action created successfully.");
      handleClose();
    },
    onError({ err }) {
      handleZSAError<TCreateResourceActionFormSchema>({
        err,
        form,
        fallbackMessage: "Failed to create resource action",
      });
    },
  });

  async function handleSubmit(values: TCreateResourceActionFormSchema) {
    await execute({
      payload: {
        resourceId: values.resourceId,
        name: values.name,
        description: values.description || undefined,
        key: values.key,
      },
      transportOptions: {
        shouldRevalidate: true,
        url: "/admin/resource-actions",
      },
    });
  }

  function handleClose() {
    form.reset();
    setResources([]);
    closeModal();
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Resource Action</DialogTitle>
          <DialogDescription>
            Add a new action (permission) to a resource.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            {/* Resource select, Name, Key, Description */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-32 rounded-md" />
            </div>
          </div>
        ) : (
          <FormProvider {...form}>
            <ResourceActionForm
              onSubmit={handleSubmit}
              onCancel={handleClose}
              resources={resources}
              showResourceSelect
              submitLabel="Create Action"
            />
          </FormProvider>
        )}
      </DialogContent>
    </Dialog>
  );
};
