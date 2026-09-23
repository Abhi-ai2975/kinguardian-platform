"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAdminStore } from "../../stores/admin.store";
import { useServerAction } from "zsa-react";
import { deleteOrgRoleAction } from "@/modules/server/presentation/actions/admin/organizations.action";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

export const DeleteOrgRoleModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "deleteOrgRole";

  const { execute, isPending } = useServerAction(deleteOrgRoleAction, {
    onSuccess() {
      toast.success("Role deleted successfully.");
      closeModal();
    },
    onError({ err }) {
      handleZSAError({ err, fallbackMessage: "Failed to delete role" });
    },
  });

  async function handleDelete() {
    if (!modalData?.orgRoleOrganizationId || !modalData?.orgRoleName) return;
    await execute({
      payload: {
        organizationId: modalData.orgRoleOrganizationId,
        role: modalData.orgRoleName,
      },
      transportOptions: {
        shouldRevalidate: true,
        url: `/admin/organizations/${modalData.orgRoleOrganizationId}/roles`,
      },
    });
  }

  const permCount = modalData?.orgRolePermissions?.length ?? 0;

  return (
    <Dialog open={isModalOpen} onOpenChange={closeModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Role</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete role{" "}
            <code className="font-semibold">{modalData?.orgRoleName}</code>? This will remove all{" "}
            {permCount} permission mapping{permCount !== 1 ? "s" : ""} associated with this role.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
