"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAdminStore } from "../../stores/admin.store";
import { useServerAction } from "zsa-react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BanUserFormSchema,
  TBanUserFormSchema,
} from "@/modules/entities/schemas/admin/users/users.schema";
import { UserBanForm } from "../../forms/users/UserBanForm";
import {
  banUserAction,
  unbanUserAction,
} from "@/modules/server/presentation/actions/admin/users.action";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

export const BanUserModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "banUser";
  const isUnban = modalData?.isBanned === true;

  const form = useForm<TBanUserFormSchema>({
    resolver: zodResolver(BanUserFormSchema),
    defaultValues: { banExpiresInDays: 0 },
  });

  const { execute: executeBan } = useServerAction(banUserAction, {
    onSuccess() {
      toast.success("User banned successfully.");
      handleCloseModal();
    },
    onError({ err }) {
      handleZSAError<TBanUserFormSchema>({
        err,
        form,
        fallbackMessage: "Failed to ban user",
      });
    },
  });

  const { execute: executeUnban, isPending: isUnbanPending } = useServerAction(unbanUserAction, {
    onSuccess() {
      toast.success("User unbanned successfully.");
      handleCloseModal();
    },
    onError({ err }) {
      handleZSAError({ err, fallbackMessage: "Failed to unban user" });
    },
  });

  async function handleBanUser(values: TBanUserFormSchema) {
    if (!modalData?.userId) return;
    const banExpiresIn =
      values.banExpiresInDays > 0
        ? values.banExpiresInDays * 24 * 60 * 60
        : undefined;
    await executeBan({
      payload: {
        userId: modalData.userId,
        banReason: values.banReason || undefined,
        banExpiresIn,
      },
      transportOptions: { shouldRevalidate: true, url: "/admin/users" },
    });
  }

  async function handleUnbanUser() {
    if (!modalData?.userId) return;
    await executeUnban({
      payload: { userId: modalData.userId },
      transportOptions: { shouldRevalidate: true, url: "/admin/users" },
    });
  }

  function handleCloseModal() {
    form.reset();
    closeModal();
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isUnban ? "Unban User" : "Ban User"}</DialogTitle>
          <DialogDescription>
            {isUnban
              ? `Remove the ban from ${modalData?.userName ?? "this user"}.`
              : `Ban ${modalData?.userName ?? "this user"} from the platform.`}
          </DialogDescription>
        </DialogHeader>

        {isUnban ? (
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleUnbanUser} disabled={isUnbanPending}>
              {isUnbanPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Unban
            </Button>
          </DialogFooter>
        ) : (
          <FormProvider {...form}>
            <UserBanForm onSubmit={handleBanUser} onCancel={handleCloseModal} />
          </FormProvider>
        )}
      </DialogContent>
    </Dialog>
  );
};
