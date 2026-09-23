import { authClient } from "../auth-client";

export type TSession = typeof authClient.$Infer.Session;
export type TUser = typeof authClient.$Infer.Session.user;
