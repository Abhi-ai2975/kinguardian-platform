/**
 * auth-client — BetterAuth React client for the FileNest Console.
 *
 * Points at the IAM (BetterAuth OAuth server). The console uses this client
 * for sign-out, org switching, and any other BetterAuth operations that the
 * IAM exposes. Token management (httpOnly session cookie) is handled by the
 * IAM's BetterAuth session layer.
 *
 * @module
 */
import {
  jwtClient,
  organizationClient,
  adminClient,
  twoFactorClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { apiKeyClient } from "@better-auth/api-key/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [
    jwtClient(),
    organizationClient(),
    adminClient(),
    oauthProviderClient(),
    twoFactorClient(),
    apiKeyClient(),
  ],
});

export const { useSession } = authClient;
