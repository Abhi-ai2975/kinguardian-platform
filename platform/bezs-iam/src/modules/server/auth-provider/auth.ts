/**
 * @module auth-provider/auth
 * @description Better Auth instance — the single exported `auth` object
 *              used by every service, route handler, and middleware.
 *              Created from `authConfig` which defines all plugins,
 *              adapters, and security settings.
 * @category Auth Provider
 */

import { betterAuth } from "better-auth"
import { authConfig } from "./auth.config"

export const auth = betterAuth(authConfig)
