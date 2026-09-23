import z from "zod";
import { TransportOptionsSchema } from "../../transport";
import { OAuthClientBaseSchema, OAuthClientIdSchema } from "./base.schema";

// ------------------------------------------------------- //
// form schemas (client side forms)

export const CreateOAuthClientFormSchema = OAuthClientBaseSchema.pick({
  redirect_uris: true,
  scope: true,
  client_name: true,
  client_uri: true,
  logo_uri: true,
  contacts: true,
  tos_uri: true,
  policy_uri: true,
  software_id: true,
  software_version: true,
  software_statement: true,
  post_logout_redirect_uris: true,
  token_endpoint_auth_method: true,
  grant_types: true,
  response_types: true,
  type: true,
  client_secret_expires_at: true,
  skip_consent: true,
  enable_end_session: true,
  require_pkce: true,
  subject_type: true,
  metadata: true,
});

export type TCreateOAuthClientFormSchema = z.infer<
  typeof CreateOAuthClientFormSchema
>;

export const UpdateOAuthClientFormSchema = OAuthClientIdSchema.pick({
  client_id: true,
}).merge(
  z.object({
    update: OAuthClientBaseSchema.pick({
      scope: true,
      client_name: true,
      client_uri: true,
      logo_uri: true,
      contacts: true,
      tos_uri: true,
      policy_uri: true,
      software_id: true,
      software_version: true,
      software_statement: true,
      post_logout_redirect_uris: true,
      token_endpoint_auth_method: true,
      grant_types: true,
      response_types: true,
      type: true,
      subject_type: true,
      require_pkce: true,
      skip_consent: true,
      enable_end_session: true,
    }).merge(
      z.object({
        redirect_uris: z.array(z.string().url()).min(1).optional(),
      }),
    ),
  }),
);

export type TUpdateOAuthClientFormSchema = z.infer<
  typeof UpdateOAuthClientFormSchema
>;

// ------------------------------------------------------- //
// validation schemas (used in controllers / services)

export const CreateOAuthClientValidationSchema = CreateOAuthClientFormSchema;

export type TCreateOAuthClientValidationSchema = z.infer<
  typeof CreateOAuthClientValidationSchema
>;

export const UpdateOAuthClientValidationSchema = z.object({
  client_id: z.string(),
  update: OAuthClientBaseSchema.partial(),
});

export type TUpdateOAuthClientValidationSchema = z.infer<
  typeof UpdateOAuthClientValidationSchema
>;

export const DeleteOAuthClientValidationSchema = z.object({
  client_id: z.string(),
});

export type TDeleteOAuthClientValidationSchema = z.infer<
  typeof DeleteOAuthClientValidationSchema
>;

export const GetOAuthClientValidationSchema = z.object({
  client_id: z.string(),
});

export type TGetOAuthClientValidationSchema = z.infer<
  typeof GetOAuthClientValidationSchema
>;

export const GetOAuthClientsValidationSchema = z.object({});

export type TGetOAuthClientsValidationSchema = z.infer<
  typeof GetOAuthClientsValidationSchema
>;

// ------------------------------------------------------- //
// Server Action Schemas

export const CreateOAuthClientActionSchema = z.object({
  payload: CreateOAuthClientFormSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TCreateOAuthClientActionSchema = z.infer<
  typeof CreateOAuthClientActionSchema
>;

export const UpdateOAuthClientActionSchema = z.object({
  payload: UpdateOAuthClientValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TUpdateOAuthClientActionSchema = z.infer<
  typeof UpdateOAuthClientActionSchema
>;

export const DeleteOAuthClientActionSchema = z.object({
  payload: DeleteOAuthClientValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TDeleteOAuthClientActionSchema = z.infer<
  typeof DeleteOAuthClientActionSchema
>;

export const GetOAuthClientActionSchema = z.object({
  payload: GetOAuthClientValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TGetOAuthClientActionSchema = z.infer<
  typeof GetOAuthClientActionSchema
>;

export const GetOAuthClientsActionSchema = z.object({
  transportOptions: TransportOptionsSchema.optional(),
});

export type TGetOAuthClientsActionSchema = z.infer<
  typeof GetOAuthClientsActionSchema
>;

// ------------------------------------------------------- //
// Response DTO schemas

export const CreateOAuthClientResponseDtoSchema = OAuthClientBaseSchema.pick({
  client_secret: true,
  client_secret_expires_at: true,
  scope: true,
  client_id_issued_at: true,
  client_name: true,
  client_uri: true,
  logo_uri: true,
  contacts: true,
  tos_uri: true,
  policy_uri: true,
  software_id: true,
  software_version: true,
  software_statement: true,
  redirect_uris: true,
  post_logout_redirect_uris: true,
  token_endpoint_auth_method: true,
  grant_types: true,
  response_types: true,
  public: true,
  type: true,
  disabled: true,
  skip_consent: true,
  enable_end_session: true,
  require_pkce: true,
  subject_type: true,
  metadata: true,
  // reference_id: true,
}).merge(
  OAuthClientIdSchema.pick({
    client_id: true,
    user_id: true,
  }),
);

export type TCreateOAuthClientResponseDtoSchema = z.infer<
  typeof CreateOAuthClientResponseDtoSchema
>;

export const GetOAuthClientResponseDtoSchema =
  CreateOAuthClientResponseDtoSchema;

export type TGetOAuthClientResponseDtoSchema = z.infer<
  typeof GetOAuthClientResponseDtoSchema
>;

export const GetOAuthClientsResponseDtoSchema = z.array(
  CreateOAuthClientResponseDtoSchema,
);

export type TGetOAuthClientsResponseDtoSchema = z.infer<
  typeof GetOAuthClientsResponseDtoSchema
>;

export const DeleteOAuthClientResponseDtoSchema = z.object({
  success: z.boolean(),
});

export type TDeleteOAuthClientResponseDtoSchema = z.infer<
  typeof DeleteOAuthClientResponseDtoSchema
>;

// ------------------------------------------------------- //
// Rotate Client Secret

export const RotateClientSecretValidationSchema = z.object({
  client_id: z.string(),
});

export type TRotateClientSecretValidationSchema = z.infer<
  typeof RotateClientSecretValidationSchema
>;

export const RotateClientSecretActionSchema = z.object({
  payload: RotateClientSecretValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TRotateClientSecretActionSchema = z.infer<
  typeof RotateClientSecretActionSchema
>;
