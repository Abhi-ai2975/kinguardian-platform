import {
  ZodEGrantType,
  ZodEResponseType,
  ZodESubjectType,
  ZodETokenEndpointAuthMode,
  ZodEType,
} from "@/modules/entities/enums/admin/oauth-client/oauth-client.enum";
import z from "zod";

// ------------------------------------------------------- //
// base reusable schemas

export const OAuthClientBaseSchema = z.object({
  scope: z.string().optional(),
  client_name: z.string().min(1).optional(),
  client_secret: z.string().min(1).optional(),

  client_uri: z.string().url().optional(),
  logo_uri: z.string().url().optional(),
  policy_uri: z.string().url().optional(),
  redirect_uris: z.array(z.string().url()).min(1),
  post_logout_redirect_uris: z.array(z.string().url()).optional(),
  tos_uri: z.string().url().optional(),

  contacts: z.array(z.string()).optional(),

  token_endpoint_auth_method: ZodETokenEndpointAuthMode.optional(),

  grant_types: z.array(ZodEGrantType).optional(),

  response_types: z.array(ZodEResponseType).optional(),

  type: ZodEType.optional(),
  subject_type: ZodESubjectType.optional(),

  software_id: z.string().optional(),
  software_version: z.string().optional(),
  software_statement: z.string().optional(),

  metadata: z.record(z.any()).optional(),

  skip_consent: z.boolean().optional(),
  enable_end_session: z.boolean().optional(),
  require_pkce: z.boolean().optional(),
  public: z.boolean().optional(),
  disabled: z.boolean().optional(),

  client_secret_expires_at: z.number().optional(),
  client_id_issued_at: z.number(),

  // uri: z.string().url().optional(),
  // icon: z.string().url().optional(),
  // tos: z.string().url().optional(),
  // policy: z.string().url().optional(),
});

export const OAuthClientIdSchema = z.object({
  client_id: z.string(),
  user_id: z.string(),
});
