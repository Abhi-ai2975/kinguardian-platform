"use client";

import { useSyncExternalStore } from "react";
import { CreateUserModal } from "../modals/users/CreateUserModal";
import { UpdateUserModal } from "../modals/users/UpdateUserModal";
import { SetRoleModal } from "../modals/users/SetRoleModal";
import { BanUserModal } from "../modals/users/BanUserModal";
import { RemoveUserModal } from "../modals/users/RemoveUserModal";
import { SetUserPasswordModal } from "../modals/users/SetUserPasswordModal";
import { RevokeUserSessionsModal } from "../modals/users/RevokeUserSessionsModal";
import { ImpersonateUserModal } from "../modals/users/ImpersonateUserModal";

export const UserModalProvider = () => {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!isMounted) return null;

  return (
    <>
      <CreateUserModal />
      <UpdateUserModal />
      <SetRoleModal />
      <BanUserModal />
      <RemoveUserModal />
      <SetUserPasswordModal />
      <RevokeUserSessionsModal />
      <ImpersonateUserModal />
    </>
  );
};
