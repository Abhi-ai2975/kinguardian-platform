"use client";

import { useSyncExternalStore } from "react";
import { RevokeAgentModal } from "../modals/agent-auth/RevokeAgentModal";
import { ReactivateAgentModal } from "../modals/agent-auth/ReactivateAgentModal";
import { GrantCapabilityModal } from "../modals/agent-auth/GrantCapabilityModal";
import { CreateHostModal } from "../modals/agent-auth/CreateHostModal";
import { RevokeHostModal } from "../modals/agent-auth/RevokeHostModal";
import { UpdateAgentModal } from "../modals/agent-auth/UpdateAgentModal";
import { ApproveCapabilityModal } from "../modals/agent-auth/ApproveCapabilityModal";
import { UpdateHostModal } from "../modals/agent-auth/UpdateHostModal";

export const AgentAuthModalProvider = () => {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!isMounted) return null;

  return (
    <>
      <UpdateAgentModal />
      <RevokeAgentModal />
      <ReactivateAgentModal />
      <GrantCapabilityModal />
      <ApproveCapabilityModal />
      <CreateHostModal />
      <UpdateHostModal />
      <RevokeHostModal />
    </>
  );
};
