/**
 * @module api/auth/route
 * @description Better Auth catch-all route handler.
 *              All `/api/auth/*` requests (sign-in, sign-up, callbacks,
 *              admin operations, agent operations) are routed through here.
 *              `toNextJsHandler` generates `POST` and `GET` exports
 *              that delegate to the Better Auth instance.
 * @category API Route
 */

import { auth } from "@/modules/server/auth-provider/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { POST, GET } = toNextJsHandler(auth);
