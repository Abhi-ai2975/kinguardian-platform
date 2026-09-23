"use client";

import { useSyncExternalStore } from "react";
import { CreateOrganizationModal } from "../modals/organizations/CreateOrganizationModal";
import { EditOrganizationModal } from "../modals/organizations/EditOrganizationModal";
import { DeleteOrganizationModal } from "../modals/organizations/DeleteOrganizationModal";
import { AddMemberModal } from "../modals/organizations/AddMemberModal";
import { UpdateMemberRoleModal } from "../modals/organizations/UpdateMemberRoleModal";
import { RemoveMemberModal } from "../modals/organizations/RemoveMemberModal";
import { CreateInvitationModal } from "../modals/organizations/CreateInvitationModal";
import { CancelInvitationModal } from "../modals/organizations/CancelInvitationModal";
import { CreateTeamModal } from "../modals/organizations/CreateTeamModal";
import { UpdateTeamModal } from "../modals/organizations/UpdateTeamModal";
import { RemoveTeamModal } from "../modals/organizations/RemoveTeamModal";
import { AddTeamMemberModal } from "../modals/organizations/AddTeamMemberModal";
import { RemoveTeamMemberModal } from "../modals/organizations/RemoveTeamMemberModal";
import { CreateOrgRoleModal } from "../modals/organizations/CreateOrgRoleModal";
import { EditOrgRoleModal } from "../modals/organizations/EditOrgRoleModal";
import { DeleteOrgRoleModal } from "../modals/organizations/DeleteOrgRoleModal";

export const OrganizationModalProvider = () => {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!isMounted) return null;

  return (
    <>
      <CreateOrganizationModal />
      <EditOrganizationModal />
      <DeleteOrganizationModal />
      <AddMemberModal />
      <UpdateMemberRoleModal />
      <RemoveMemberModal />
      <CreateInvitationModal />
      <CancelInvitationModal />
      <CreateTeamModal />
      <UpdateTeamModal />
      <RemoveTeamModal />
      <AddTeamMemberModal />
      <RemoveTeamMemberModal />
      <CreateOrgRoleModal />
      <EditOrgRoleModal />
      <DeleteOrgRoleModal />
    </>
  );
};
