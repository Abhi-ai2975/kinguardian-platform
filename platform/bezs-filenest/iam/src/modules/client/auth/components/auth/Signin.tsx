"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  SigninFormSchema,
  TSigninFormSchema,
} from "@/modules/entities/schemas/auth";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useCallback } from "react";
import { authClient } from "@/modules/client/auth/auth-client";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Eye, EyeOff, Key, Loader2, Mail } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useServerAction } from "zsa-react";
import { signinAction } from "@/modules/server/presentation/actions/auth";
import { toast } from "sonner";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { Link } from "@/i18n/navigation";
import OauthButton from "./OauthButton";
import AuthSeparator from "./AuthSeparator";
import { Turnstile } from "../shared/Turnstile";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { LastUsedBadge } from "@/components/LastedUsedBadge";

function Signin() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [lastMethod, setLastMethod] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>();
  const handleCaptchaToken = useCallback((token: string) => setCaptchaToken(token), []);
  const handleCaptchaExpire = useCallback(() => setCaptchaToken(undefined), []);

  useEffect(() => {
    (async () => {
      const lastLogin = authClient.getLastUsedLoginMethod();
      setLastMethod(lastLogin);
    })();
  }, []);

  const form = useForm<TSigninFormSchema>({
    resolver: zodResolver(SigninFormSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  });
  const { isSubmitting } = form.formState;

  const { execute } = useServerAction(signinAction, {
    onSuccess: () => {
      toast.success("Signup successful");
    },
    onError: ({ err }) => {
      handleZSAError<TSigninFormSchema>({
        err,
        form,
        fallbackMessage: "Signup failed",
      });
    },
  });

  function handlePasswordVisibility() {
    setIsPasswordVisible((prev) => !prev);
  }

  async function handleSignin(values: TSigninFormSchema) {
    const searchParams = new URLSearchParams(window.location.search);

    // Detect OAuth Authorization Code flow
    const isOAuthFlow =
      searchParams.has("client_id") && searchParams.has("redirect_uri");

    const shouldRedirect = isOAuthFlow;

    await execute({
      payload: values,
      captchaToken,
      transportOptions: {
        shouldRedirect: shouldRedirect ? true : undefined,
        url: shouldRedirect
          ? `/api/auth/oauth2/authorize?${searchParams.toString()}`
          : undefined,
      },
    });
  }

  const queryString =
    typeof window !== "undefined" ? window.location.search : "";

  const forgetPasswordHref = (() => {
    if (typeof window === "undefined") return "/auth/forget-password";
    const sp = new URLSearchParams(window.location.search);
    if (sp.has("client_id") && sp.has("redirect_uri")) {
      const oauthUrl = `/api/auth/oauth2/authorize?${sp.toString()}`;
      return `/auth/forget-password?redirect=${encodeURIComponent(oauthUrl)}`;
    }
    return "/auth/forget-password";
  })();

  const magicLinkHref = (() => {
    if (typeof window === "undefined") return "/auth/magic-link";
    const sp = new URLSearchParams(window.location.search);
    if (sp.has("client_id") && sp.has("redirect_uri")) {
      const oauthUrl = `/api/auth/oauth2/authorize?${sp.toString()}`;
      return `/auth/magic-link?redirect=${encodeURIComponent(oauthUrl)}`;
    }
    return "/auth/magic-link";
  })();

  return (
    <Card className="max-w-sm w-full mx-auto">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          Enter your email below to login to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSignin)}>
            <FieldGroup>
              {/* email */}
              <Controller
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      {...field}
                      id="email"
                      aria-invalid={fieldState.invalid}
                      placeholder="me@example.com"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {/* password */}
              <Controller
                control={form.control}
                name="password"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <FieldLabel htmlFor="password">Password</FieldLabel>
                      <FieldLabel asChild>
                        <Link
                          href={forgetPasswordHref}
                          className="hover:underline"
                        >
                          Forgot your password?
                        </Link>
                      </FieldLabel>
                    </div>
                    <InputGroup>
                      <InputGroupInput
                        {...field}
                        id="password"
                        aria-invalid={fieldState.invalid}
                        placeholder="Password"
                        autoComplete="off"
                        type={isPasswordVisible ? "text" : "password"}
                      />
                      <InputGroupAddon
                        align="inline-end"
                        className="cursor-pointer"
                        onClick={handlePasswordVisibility}
                      >
                        {isPasswordVisible ? <Eye /> : <EyeOff />}
                      </InputGroupAddon>
                    </InputGroup>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Turnstile onToken={handleCaptchaToken} onExpire={handleCaptchaExpire} />

              <div className="grid gap-4">
                <div className="space-y-2.5">
                  <Controller
                    control={form.control}
                    name="rememberMe"
                    render={({ field, fieldState }) => (
                      <Field>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="rememberme"
                            defaultChecked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                            }}
                          />
                          <FieldLabel
                            htmlFor="rememberme"
                            className="font-normal text-sm"
                          >
                            Remember me
                          </FieldLabel>
                        </div>
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                  <div className="relative">
                    {lastMethod === "email" && <LastUsedBadge />}
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="animate-spin" />
                          Sign In
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  {lastMethod === "magic-link" && <LastUsedBadge />}
                  <Link
                    href={magicLinkHref}
                    className={cn(
                      buttonVariants({ variant: "secondary" }),
                      "w-full",
                    )}
                  >
                    <Mail /> Sign in with Magic Link
                  </Link>
                </div>
              </div>

              <AuthSeparator />

              <div className="grid gap-4">
                <div className="flex items-center justify-between gap-4">
                  <OauthButton
                    oauthName="google"
                    label="Google"
                    isFormSubmitting={isSubmitting}
                    isLastUsed={lastMethod === "google"}
                  />
                  <OauthButton
                    oauthName="github"
                    label="GitHub"
                    isFormSubmitting={isSubmitting}
                    isLastUsed={lastMethod === "github"}
                  />
                </div>
                <Button variant="secondary">
                  <Key /> Sign in with Passkey
                </Button>
              </div>
            </FieldGroup>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex items-center gap-1.5 w-fit mx-auto text-sm text-muted-foreground">
        {"Don't have an account?"}
        <Link
          href={`/auth/sign-up${queryString}`}
          className="text-foreground underline underline-offset-2"
        >
          Sign Up
        </Link>
      </CardFooter>
    </Card>
  );
}

export default Signin;
