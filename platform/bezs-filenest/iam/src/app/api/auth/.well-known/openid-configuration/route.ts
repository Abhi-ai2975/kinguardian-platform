import { oauthProviderOpenIdConfigMetadata } from "@better-auth/oauth-provider";
import { auth } from "../../../../../modules/server/auth-provider/auth";

export const GET = oauthProviderOpenIdConfigMetadata(auth);