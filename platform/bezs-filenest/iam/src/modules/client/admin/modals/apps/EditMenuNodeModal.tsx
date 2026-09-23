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
  UpdateMenuNodeFormSchema,
  TUpdateMenuNodeFormSchema,
} from "@/modules/entities/schemas/admin/apps/apps.schema";
import {
  listMenuNodesAction,
  updateMenuNodeAction,
  listActionsAction,
} from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { MenuNodeForm } from "../../forms/apps/MenuNodeForm";

export const EditMenuNodeModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "editMenuNode";

  const [parentNodes, setParentNodes] = useState<{ id: string; label: string }[]>([]);
  const [availableActions, setAvailableActions] = useState<{ key: string; name: string }[]>([]);

  const { execute: fetchNodes, isPending: isFetchingNodes } = useServerAction(listMenuNodesAction, {
    onSuccess({ data }) {
      setParentNodes(
        data
          .filter((n) => n.id !== modalData?.menuNodeId)
          .map((n) => ({ id: n.id, label: n.label })),
      );
    },
  });

  const { execute: fetchActions, isPending: isFetchingActions } = useServerAction(listActionsAction, {
    onSuccess({ data }) {
      setAvailableActions(data.map((a) => ({ key: a.key, name: a.name })));
    },
  });

  const isLoading = isFetchingNodes || isFetchingActions;

  useEffect(() => {
    if (!isModalOpen || !modalData?.menuNodeAppId) return;
    void fetchNodes({ appId: modalData.menuNodeAppId });
    void fetchActions();
  }, [isModalOpen, modalData?.menuNodeAppId, modalData?.menuNodeId]);

  const form = useForm<TUpdateMenuNodeFormSchema>({
    resolver: zodResolver(UpdateMenuNodeFormSchema),
    values: {
      label: modalData?.menuNodeLabel ?? "",
      slug: modalData?.menuNodeSlug ?? "",
      type: modalData?.menuNodeType ?? "ITEM",
      parentId: modalData?.menuNodeParentId ?? "",
      icon: modalData?.menuNodeIcon ?? "",
      href: modalData?.menuNodeHref ?? "",
      order: modalData?.menuNodeOrder ?? 0,
      isActive: modalData?.menuNodeIsActive ?? true,
      isVisible: modalData?.menuNodeIsVisible ?? true,
      permissionKeys: modalData?.menuNodePermissionKeys ?? [],
    },
  });

  const { execute } = useServerAction(updateMenuNodeAction, {
    onSuccess() {
      toast.success("Menu node updated successfully.");
      handleClose();
    },
    onError({ err }) {
      handleZSAError<TUpdateMenuNodeFormSchema>({
        err,
        form,
        fallbackMessage: "Failed to update menu node",
      });
    },
  });

  async function handleSubmit(values: TUpdateMenuNodeFormSchema) {
    if (!modalData?.menuNodeId) return;
    await execute({
      payload: {
        id: modalData.menuNodeId,
        label: values.label,
        slug: values.slug,
        type: values.type,
        parentId: (values.parentId && values.parentId !== "__none__") ? values.parentId : null,
        icon: values.icon || null,
        href: values.href || null,
        order: values.order,
        isActive: values.isActive,
        isVisible: values.isVisible,
        permissionKeys: values.permissionKeys,
      },
      transportOptions: {
        shouldRevalidate: true,
        url: `/admin/apps/${modalData?.menuNodeAppId}/menus`,
      },
    });
  }

  function handleClose() {
    form.reset();
    setParentNodes([]);
    setAvailableActions([]);
    closeModal();
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Menu Node</DialogTitle>
          <DialogDescription>
            Update the details of{" "}
            <span className="font-medium">{modalData?.menuNodeLabel}</span>.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            {/* Label, Slug, Type, Parent, Icon, Href */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
            {/* Visible switch */}
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-9 rounded-full" />
              <Skeleton className="h-4 w-14" />
            </div>
            {/* Permission Keys */}
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-52" />
              <Skeleton className="h-8 w-full" />
            </div>
            <div className="flex justify-end gap-2">
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
          </div>
        ) : (
          <FormProvider {...form}>
            <MenuNodeForm
              onSubmit={handleSubmit}
              onCancel={handleClose}
              appId={modalData?.menuNodeAppId ?? ""}
              parentNodes={parentNodes}
              availableActions={availableActions}
              submitLabel="Save Changes"
            />
          </FormProvider>
        )}
      </DialogContent>
    </Dialog>
  );
};
