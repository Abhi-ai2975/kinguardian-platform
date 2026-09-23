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
  ForgetPasswordOrMagicLinkFormSchema,
  TForgetPasswordOrMagicLinkFormSchema,
} from "@/modules/entities/schemas/auth";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Key, Loader2, Lock } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useServerAction } from "zsa-react";
import { sendMagicLinkAction } from "@/modules/server/presentation/actions/auth";
import { toast } from "sonner";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import OauthButton from "./OauthButton";
import AuthSeparator from "./AuthSeparator";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ISigninWithMagicLinkProps {
  /** OAuth authorize URL to resume after clicking the magic link */
  redirect?: string;
}

function SigninWithMagicLink({ redirect }: ISigninWithMagicLinkProps) {
  const [sent, setSent] = useState(false);

  const form = useForm<TForgetPasswordOrMagicLinkFormSchema>({
    resolver: zodResolver(ForgetPasswordOrMagicLinkFormSchema),
    defaultValues: {
      email: "",
    },
  });
  const { isSubmitting } = form.formState;

  const { execute } = useServerAction(sendMagicLinkAction, {
    onSuccess: () => {
      setSent(true);
      toast.success("Magic link sent! Check your email.");
    },
    onError: ({ err }) => {
      handleZSAError<TForgetPasswordOrMagicLinkFormSchema>({
        err,
        form,
        fallbackMessage: "Failed to send magic link. Please try again.",
      });
    },
  });

  async function handleSendMagicLink(
    values: TForgetPasswordOrMagicLinkFormSchema,
  ) {
    await execute({
      payload: {
        email: values.email,
        // callbackURL is the OAuth authorize URL (or "/" for normal flow)
        callbackURL: redirect ?? "/",
      },
    });
  }

  const queryString =
    typeof window !== "undefined" ? window.location.search : "";

  if (sent) {
    return (
      <Card className="max-w-sm w-full mx-auto">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent a magic link to{" "}
            <span className="font-medium text-foreground">
              {form.getValues("email")}
            </span>
            . Click the link to sign in — it expires in 5 minutes.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="max-w-sm w-full mx-auto">
      <CardHeader>
        <CardTitle>Magic Link</CardTitle>
        <CardDescription>
          Enter your email to receive a magic link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSendMagicLink)}>
            <FieldGroup>
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

              <div className="grid gap-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send magic link"
                  )}
                </Button>
                <Link
                  href={`/auth/sign-in${queryString}`}
                  className={cn(buttonVariants({ variant: "secondary" }), "w-full")}
                >
                  <Lock /> Sign in with Password
                </Link>
              </div>

              <AuthSeparator />

              <div className="grid gap-4">
                <div className="flex items-center justify-between gap-4">
                  <OauthButton
                    oauthName="google"
                    label="Google"
                    isFormSubmitting={isSubmitting}
                  />
                  <OauthButton
                    oauthName="github"
                    label="GitHub"
                    isFormSubmitting={isSubmitting}
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

export default SigninWithMagicLink;
