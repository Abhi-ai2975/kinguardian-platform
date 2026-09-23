// backend schemas (used in class methods and interfaces)
// payloads

export type TCreateOAuthClientPayload = {
  redirect_uris: string[]; // required

  scope?: string;
  client_name?: string;
  client_uri?: string;
  logo_uri?: string;
  contacts?: string[];
  tos_uri?: string;
  policy_uri?: string;
  software_id?: string;
  software_version?: string;
  software_statement?: string;

  post_logout_redirect_uris?: string[];

  token_endpoint_auth_method?: 
    | "none"
    | "client_secret_basic"
    | "client_secret_post";

  grant_types?: (
    | "authorization_code"
    | "client_credentials"
    | "refresh_token"
  )[];

  response_types?: ("code")[];

  type?: "web" | "native" | "user-agent-based";

  client_secret_expires_at?: string | number;

  skip_consent?: boolean;
  enable_end_session?: boolean;
  require_pkce?: boolean;

  subject_type?: "public" | "pairwise";

  metadata?: Record<string, unknown>;
};

export type TUpdateOAuthClientPayload = {
  client_id: string;
  update: {
    client_name?: string;
    redirect_uris?: string[];

    grant_types?: (
      | "authorization_code"
      | "client_credentials"
      | "refresh_token"
    )[];
    response_types?: "code"[];
    scopes?: string[];

    token_endpoint_auth_method?:
      | "none"
      | "client_secret_basic"
      | "client_secret_post";

    uri?: string;
    icon?: string;
    contacts?: string[];
    tos?: string;
    policy?: string;

    software_id?: string;
    software_version?: string;
    software_statement?: string;

    metadata?: Record<string, any>;
  };
};

export type TDeleteOAuthClientPayload = {
  client_id: string;
};

export type TGetOAuthClientPayload = {
  client_id: string;
};


/* 
{
            redirect_uris: ZodOptional<ZodArray<ZodURL>>;
            scope: ZodOptional<ZodString>;
            client_name: ZodOptional<ZodString>;
            client_uri: ZodOptional<ZodString>;
            logo_uri: ZodOptional<ZodString>;
            contacts: ZodOptional<ZodArray<ZodString>>;
            tos_uri: ZodOptional<ZodString>;
            policy_uri: ZodOptional<ZodString>;
            software_id: ZodOptional<ZodString>;
            software_version: ZodOptional<ZodString>;
            software_statement: ZodOptional<ZodString>;
            post_logout_redirect_uris: ZodOptional<ZodArray<ZodURL>>;
            grant_types: ZodOptional<ZodArray<ZodEnum<{
                authorization_code: "authorization_code";
                client_credentials: "client_credentials";
                refresh_token: "refresh_token";
            }>>>;
            response_types: ZodOptional<ZodArray<ZodEnum<{
                code: "code";
            }>>>;
            type: ZodOptional<ZodEnum<{
                web: "web";
                native: "native";
                "user-agent-based": "user-agent-based";
            }>>;
        }
*/


/* 
  {
        redirect_uris: ZodArray<ZodURL>;
        scope: ZodOptional<ZodString>;
        client_name: ZodOptional<ZodString>;
        client_uri: ZodOptional<ZodString>;
        logo_uri: ZodOptional<ZodString>;
        contacts: ZodOptional<ZodArray<ZodString>>;
        tos_uri: ZodOptional<ZodString>;
        policy_uri: ZodOptional<ZodString>;
        software_id: ZodOptional<ZodString>;
        software_version: ZodOptional<ZodString>;
        software_statement: ZodOptional<ZodString>;
        post_logout_redirect_uris: ZodOptional<ZodArray<ZodURL>>;
        token_endpoint_auth_method: ZodOptional<ZodDefault<ZodEnum<{
            none: "none";
            client_secret_basic: "client_secret_basic";
            client_secret_post: "client_secret_post";
        }>>>;
        grant_types: ZodOptional<ZodDefault<ZodArray<ZodEnum<{
            authorization_code: "authorization_code";
            client_credentials: "client_credentials";
            refresh_token: "refresh_token";
        }>>>>;
        response_types: ZodOptional<ZodDefault<ZodArray<ZodEnum<{
            code: "code";
        }>>>>;
        type: ZodOptional<ZodEnum<{
            web: "web";
            native: "native";
            "user-agent-based": "user-agent-based";
        }>>;
        client_secret_expires_at: ZodDefault<ZodOptional<ZodUnion<readonly [ZodString, ZodNumber]>>>;
        skip_consent: ZodOptional<ZodBoolean>;
        enable_end_session: ZodOptional<ZodBoolean>;
        require_pkce: ZodOptional<ZodBoolean>;
        subject_type: ZodOptional<ZodEnum<{
            public: "public";
            pairwise: "pairwise";
        }>>;
        metadata: ZodOptional<ZodRecord<ZodString, ZodUnknown>>;
    }
  */