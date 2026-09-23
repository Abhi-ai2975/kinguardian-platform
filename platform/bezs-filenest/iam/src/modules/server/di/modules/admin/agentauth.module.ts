import { Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { AgentAuthService } from "@/modules/server/core/admin/infrastructure/services/agentauth.service";

export function registerAgentAuthModule(container: Container) {
  container.bind(DI_SYMBOLS.IAgentAuthService).toClass(AgentAuthService);
}
