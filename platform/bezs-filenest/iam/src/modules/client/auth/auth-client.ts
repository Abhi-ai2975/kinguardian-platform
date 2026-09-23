import { createAuthClient } from "better-auth/react";
import {
  jwtClient,
  organizationClient,
  adminClient,
  twoFactorClient,
  lastLoginMethodClient,
  magicLinkClient,
  customSessionClient,
} from "better-auth/client/plugins";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { agentAuthClient } from "@better-auth/agent-auth/client";
import { auth } from "@/modules/server/auth-provider/auth";

export const authClient = createAuthClient({
  /** The base URL of the server (optional if you're using the same domain) */
  baseURL: process.env.BETTER_AUTH_URL,
  plugins: [
    jwtClient(),
    organizationClient(),
    adminClient(),
    twoFactorClient({
      twoFactorPage: "/auth/two-factor",
    }),
    magicLinkClient(),
    oauthProviderClient(),
    agentAuthClient(),
    lastLoginMethodClient(),
    customSessionClient<typeof auth>(),
  ],
});

export const { useSession } = authClient;
