import z from "zod";

export const TokenEndpointAuthMode = [
  "none",
  "client_secret_basic",
  "client_secret_post",
] as const;
export type TTokenEndpointAuthMode = (typeof TokenEndpointAuthMode)[number];
export const ZodETokenEndpointAuthMode = z.enum(TokenEndpointAuthMode);

/* --------------------------------------- */

export const GrantType = [
  "authorization_code",
  "client_credentials",
  "refresh_token",
] as const;
export type TGrantType = (typeof GrantType)[number];
export const ZodEGrantType = z.enum(GrantType);

/* --------------------------------------- */

export const ResponseType = ["code"] as const;
export type TResponseType = (typeof ResponseType)[number];
export const ZodEResponseType = z.enum(ResponseType);

/* --------------------------------------- */

export const Type = ["web", "native", "user-agent-based"] as const;
export type TType = (typeof Type)[number];
export const ZodEType = z.enum(Type);

/* --------------------------------------- */

export const SubjectType = ["public", "pairwise"] as const;
export type TSubjectType = (typeof SubjectType)[number];
export const ZodESubjectType = z.enum(SubjectType);

/* --------------------------------------- */

/* --------------------------------------- */

/* --------------------------------------- */
