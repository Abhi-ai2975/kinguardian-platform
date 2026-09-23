"server-only"

/**
 * @module auth-provider/auth-server
 * @description Server-side session utilities.
 *              - `getServerSession()` calls `auth.api.getSession` with request headers,
 *                returning the full session with all `customSession` extensions
 *                (nav apps, permissions, organizations).
 *              - `TServerSession` is the inferred full session type.
 *              - `isEmailVerificationEnabled` reads the global toggle from auth config.
 * @category Auth Provider
 */

import { headers } from "next/headers"
import { auth } from "./auth"
import { authConfig } from "./auth.config"

export const getServerSession = async () => {
  const session = await auth.api.getSession({
    headers: await headers()
  })

  return session
}

/** Full session type including customSession extensions (apps, permissions, organizations). */
export type TServerSession = Awaited<ReturnType<typeof getServerSession>>

export const isEmailVerificationEnabled =
  authConfig.emailAndPassword?.requireEmailVerification
