import { TListAgentsControllerOutput } from "@/modules/server/core/admin/interface-adapters/controllers/agent-auth/listAgents.controller";
import { TListHostsControllerOutput } from "@/modules/server/core/admin/interface-adapters/controllers/agent-auth/listHosts.controller";
import { TListPendingApprovalsControllerOutput } from "@/modules/server/core/admin/interface-adapters/controllers/agent-auth/listPendingApprovals.controller";
import { ZSAError } from "zsa";

export interface IAgentsTableProps {
  agents: TListAgentsControllerOutput | null;
  error: ZSAError | null;
}

export interface IHostsTableProps {
  hosts: TListHostsControllerOutput | null;
  error: ZSAError | null;
}

export interface IApprovalsTableProps {
  approvals: TListPendingApprovalsControllerOutput | null;
  error: ZSAError | null;
}

export type TAgent = TListAgentsControllerOutput[number];
export type THost = TListHostsControllerOutput[number];
export type TApprovalRequest = TListPendingApprovalsControllerOutput[number];
