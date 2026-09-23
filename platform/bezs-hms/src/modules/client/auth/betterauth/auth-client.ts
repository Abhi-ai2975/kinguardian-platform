import {
  jwtClient,
  organizationClient,
  adminClient,
  twoFactorClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [
    jwtClient(),
    organizationClient(),
    adminClient(),
    oauthProviderClient(),
    twoFactorClient(),
  ],
});

export const { useSession } = authClient;
