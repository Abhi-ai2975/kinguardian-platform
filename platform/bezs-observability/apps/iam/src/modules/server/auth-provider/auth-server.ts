"server-only"

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
