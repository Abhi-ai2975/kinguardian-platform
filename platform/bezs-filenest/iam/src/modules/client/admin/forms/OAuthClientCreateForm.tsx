"use client";

import { useFormContext, useFieldArray, useController } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

import { Loader2, Plus, Trash } from "lucide-react";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";

import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { TCreateOAuthClientFormSchema } from "@/modules/entities/schemas/admin/oauthclient/oauthclient.schema";
import {
  FormInput,
  FormSelect,
  FormSwitch,
} from "../../shared/custom-form-fields";
import {
  GrantType,
  ResponseType,
} from "@/modules/entities/enums/admin/oauth-client/oauth-client.enum";
import { useEffect } from "react";

interface OAuthClientCreateFormProps {
  onSubmit: (data: TCreateOAuthClientFormSchema) => Promise<void>;
  onCancel: () => void;
}

export function OAuthClientCreateForm({
  onSubmit,
  onCancel,
}: OAuthClientCreateFormProps) {
  const form = useFormContext<TCreateOAuthClientFormSchema>();

  const {
    formState: { isSubmitting, errors },
    control,
  } = form;

  const handleSubmit = async (data: TCreateOAuthClientFormSchema) => {
    await onSubmit(data);
  };

  // Field arrays
  const redirectUris = useFieldArray({
    control: control as never,
    name: "redirect_uris",
  });

  const postLogoutRedirectUris = useFieldArray({
    control: control as never,
    name: "post_logout_redirect_uris",
  });

  const contacts = useFieldArray({
    control: control as never,
    name: "contacts",
  });

  const { field: grantTypesField } = useController({
    name: "grant_types",
    control,
  });

  const { field: responseTypesField } = useController({
    name: "response_types",
    control,
  });

  const selectedGrantTypes: string[] = grantTypesField.value ?? [];
  const selectedResponseTypes: string[] = responseTypesField.value ?? [];

  function toggleGrantType(value: string) {
    const updated = selectedGrantTypes.includes(value)
      ? selectedGrantTypes.filter((v) => v !== value)
      : [...selectedGrantTypes, value];
    grantTypesField.onChange(updated);
  }

  function toggleResponseType(value: string) {
    const updated = selectedResponseTypes.includes(value)
      ? selectedResponseTypes.filter((v) => v !== value)
      : [...selectedResponseTypes, value];
    responseTypesField.onChange(updated);
  }

  useEffect(() => {
    if (redirectUris.fields.length === 0) {
      redirectUris.append("");
    }
  }, [redirectUris.fields, redirectUris]);

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Basic Info */}
      <FieldGroup>
        <FieldSet>
          <FieldLegend>Basic Information</FieldLegend>
          <FieldGroup className="grid sm:grid-cols-2 gap-4">
            <FormInput
              control={control}
              name="client_name"
              label="Client Name"
              placeholder="My App"
              description="Human-readable name of your application."
              descriptionPlace="bottom"
            />

            <FormInput
              control={control}
              name="scope"
              label="Scope"
              placeholder="openid profile email"
              description="Space-separated list of OAuth scopes this client can request."
              descriptionPlace="bottom"
            />

            <FormInput
              control={control}
              name="client_uri"
              label="Client URL"
              placeholder="https://example.com"
              description="Homepage URL of your application."
              descriptionPlace="bottom"
            />

            <FormInput
              control={control}
              name="logo_uri"
              label="Logo URL"
              placeholder="https://example.com/logo.png"
              description="URL of the application's logo or icon."
              descriptionPlace="bottom"
            />
          </FieldGroup>
        </FieldSet>
      </FieldGroup>

      {/* Legal */}
      <FieldGroup>
        <FieldSet>
          <FieldLegend>Legal URLs</FieldLegend>
          <FieldGroup className="grid sm:grid-cols-2 gap-4">
            <FormInput
              control={control}
              name="tos_uri"
              label="Terms of Service URL"
              placeholder="https://example.com/tos"
              description="Link to the Terms of Service for this application."
              descriptionPlace="bottom"
            />

            <FormInput
              control={control}
              name="policy_uri"
              label="Privacy Policy URL"
              placeholder="https://example.com/privacy"
              description="Link to the Privacy Policy for this application."
              descriptionPlace="bottom"
            />
          </FieldGroup>
        </FieldSet>
      </FieldGroup>

      {/* Contacts */}
      <FieldGroup>
        <FieldSet>
          <FieldLegend>Contacts</FieldLegend>
          <Field>
            <FieldLabel>Admin Contacts</FieldLabel>
            <FieldDescription>
              Email addresses of people responsible for this client.
            </FieldDescription>
            <div className="space-y-2">
              {contacts.fields.map((item, index) => (
                <div key={item.id} className="flex gap-2 items-center">
                  <FormInput
                    control={control}
                    name={`contacts.${index}`}
                    placeholder="admin@example.com"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => contacts.remove(index)}
                    className="self-end"
                  >
                    <Trash size={16} />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => contacts.append("" as never)}
                className="flex items-center gap-2"
              >
                <Plus size={16} />
                Add Contact
              </Button>
            </div>
          </Field>
        </FieldSet>
      </FieldGroup>

      {/* Redirects */}
      <FieldGroup>
        <FieldSet>
          <FieldLegend>Redirect Configuration</FieldLegend>

          {/* Redirect URIs */}
          <Field>
            <FieldLabel>Redirect URIs</FieldLabel>
            <FieldDescription>
              Allowed callback URLs after login (required).
            </FieldDescription>

            <div className="space-y-2">
              {redirectUris.fields.map((item, index) => (
                <div key={item.id} className="flex gap-2 items-center">
                  <FormInput
                    control={control}
                    name={`redirect_uris.${index}`}
                    placeholder="https://app.com/callback"
                  />

                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => redirectUris.remove(index)}
                    className="self-end"
                  >
                    <Trash size={16} />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => redirectUris.append("")}
                className="flex items-center gap-2"
              >
                <Plus size={16} />
                Add Redirect URI
              </Button>
            </div>

            <FieldError errors={[errors.redirect_uris]} />
          </Field>

          {/* Post Logout Redirect URIs */}
          <Field>
            <FieldLabel>Post Logout Redirect URIs</FieldLabel>
            <FieldDescription>
              Where users are redirected after logout.
            </FieldDescription>

            <div className="space-y-2">
              {postLogoutRedirectUris.fields.map((item, index) => (
                <div key={item.id} className="flex gap-2 items-center">
                  <FormInput
                    control={control}
                    name={`post_logout_redirect_uris.${index}`}
                    placeholder="https://app.com/logout"
                  />

                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => postLogoutRedirectUris.remove(index)}
                    className="self-end"
                  >
                    <Trash size={16} />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => postLogoutRedirectUris.append("")}
                className="flex items-center gap-2"
              >
                <Plus size={16} />
                Add Logout URI
              </Button>
            </div>
          </Field>
        </FieldSet>
      </FieldGroup>

      {/* OAuth Config */}
      <FieldGroup>
        <FieldSet>
          <FieldLegend>OAuth Configuration</FieldLegend>
          <FieldGroup className="grid sm:grid-cols-2 gap-4">
            {/* Auth Method */}
            <FormSelect
              control={form.control}
              name="token_endpoint_auth_method"
              label="Auth Method"
              placeholder="Select method"
              className="w-full"
              description="How the client authenticates at the token endpoint."
            >
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="client_secret_basic">
                client_secret_basic
              </SelectItem>
              <SelectItem value="client_secret_post">
                client_secret_post
              </SelectItem>
            </FormSelect>

            {/* Client Type */}
            <FormSelect
              control={form.control}
              name="type"
              label="Client Type"
              placeholder="Select type"
              className="w-full"
              description="Deployment model: web server, native app, or browser SPA."
            >
              <SelectItem value="web">Web</SelectItem>
              <SelectItem value="native">Native</SelectItem>
              <SelectItem value="user-agent-based">SPA</SelectItem>
            </FormSelect>

            {/* Subject Type */}
            <FormSelect
              control={form.control}
              name="subject_type"
              label="Subject Type"
              placeholder="Select subject type"
              className="w-full"
              description="How the sub claim is computed — public (same across clients) or pairwise (unique per client)."
            >
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="pairwise">Pairwise</SelectItem>
            </FormSelect>
          </FieldGroup>

          {/* Grant Types */}
          <Field>
            <FieldLabel>Grant Types</FieldLabel>
            <FieldDescription>
              OAuth 2.0 grant types this client is allowed to use.
            </FieldDescription>
            <div className="flex flex-wrap gap-x-6 gap-y-3 pt-1">
              {GrantType.map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedGrantTypes.includes(type)}
                    onCheckedChange={() => toggleGrantType(type)}
                  />
                  <span className="text-sm font-mono">{type}</span>
                </label>
              ))}
            </div>
          </Field>

          {/* Response Types */}
          <Field>
            <FieldLabel>Response Types</FieldLabel>
            <FieldDescription>
              OAuth 2.0 response types this client may use in authorization
              requests.
            </FieldDescription>
            <div className="flex flex-wrap gap-x-6 gap-y-3 pt-1">
              {ResponseType.map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedResponseTypes.includes(type)}
                    onCheckedChange={() => toggleResponseType(type)}
                  />
                  <span className="text-sm font-mono">{type}</span>
                </label>
              ))}
            </div>
          </Field>
        </FieldSet>
      </FieldGroup>

      {/* Software Statement */}
      <FieldGroup>
        <FieldSet>
          <FieldLegend>Software Information</FieldLegend>
          <FieldGroup className="grid sm:grid-cols-2 gap-4">
            <FormInput
              control={control}
              name="software_id"
              label="Software ID"
              placeholder="com.example.myapp"
              description="Unique identifier for the software package."
              descriptionPlace="bottom"
            />

            <FormInput
              control={control}
              name="software_version"
              label="Software Version"
              placeholder="1.0.0"
              description="Version of the software package."
              descriptionPlace="bottom"
            />
          </FieldGroup>

          <FormInput
            control={control}
            name="software_statement"
            label="Software Statement"
            placeholder="Signed JWT asserting client software identity"
            description="A signed JWT containing client metadata assertions (optional)."
            descriptionPlace="bottom"
          />
        </FieldSet>
      </FieldGroup>

      {/* Security */}
      <FieldGroup>
        <FieldSet>
          <FieldLegend>Security Settings</FieldLegend>
          <FieldGroup className="grid sm:grid-cols-2 gap-4">
            <FormSwitch
              control={form.control}
              name="require_pkce"
              label="Require PKCE"
              description="Enforce PKCE (Proof Key for Code Exchange) on authorization requests."
            />

            <FormSwitch
              control={form.control}
              name="skip_consent"
              label="Skip Consent"
              description="Bypass the user consent screen for trusted first-party clients."
            />

            <FormSwitch
              control={form.control}
              name="enable_end_session"
              label="Enable Logout"
              description="Allow this client to trigger end-session (logout) flows."
            />
          </FieldGroup>
        </FieldSet>
      </FieldGroup>

      {/* Actions */}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </DialogClose>

        <Button disabled={isSubmitting} size="sm" type="submit">
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" /> Creating Client
            </>
          ) : (
            "Create Client"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
