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
import { ArrowLeft, Key, Loader2, Mail } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useServerAction } from "zsa-react";
import { sendResetPasswordAction } from "@/modules/server/presentation/actions/auth";
import { toast } from "sonner";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import OauthButton from "./OauthButton";
import AuthSeparator from "./AuthSeparator";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface IForgetPasswordProps {
  redirect?: string;
}

function ForgetPassword({ redirect }: IForgetPasswordProps) {
  const router = useRouter();
  const [sent, setSent] = useState(false);

  const form = useForm<TForgetPasswordOrMagicLinkFormSchema>({
    resolver: zodResolver(ForgetPasswordOrMagicLinkFormSchema),
    defaultValues: {
      email: "",
    },
  });
  const { isSubmitting } = form.formState;

  const { execute } = useServerAction(sendResetPasswordAction, {
    onSuccess: () => {
      setSent(true);
      toast.success("Password reset link sent to the given email.");
    },
    onError: ({ err }) => {
      handleZSAError<TForgetPasswordOrMagicLinkFormSchema>({
        err,
        form,
        fallbackMessage: "Failed to send reset link",
      });
    },
  });

  async function handleForgetPassword(
    values: TForgetPasswordOrMagicLinkFormSchema,
  ) {
    await execute({ payload: { ...values, redirect } });
  }

  if (sent) {
    return (
      <Card className="max-w-sm w-full mx-auto">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent a password reset link to{" "}
            <span className="font-medium text-foreground">
              {form.getValues("email")}
            </span>
            . Click the link in the email to reset your password.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex items-center gap-1.5 w-fit mx-auto text-sm">
          <ArrowLeft className="text-muted-foreground size-3" />
          <p
            className="text-foreground underline underline-offset-2 cursor-pointer"
            onClick={() => router.back()}
          >
            Go back
          </p>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="max-w-sm w-full mx-auto">
      <CardHeader>
        <CardTitle>Forgot Password</CardTitle>
        <CardDescription>
          Enter your email to reset your password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleForgetPassword)}>
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
                    "Send reset link"
                  )}
                </Button>
                <Link
                  href={redirect ? `/auth/magic-link?redirect=${encodeURIComponent(redirect)}` : "/auth/magic-link"}
                  className={cn(
                    buttonVariants({ variant: "secondary" }),
                    "w-full",
                  )}
                >
                  <Mail /> Sign in with Magic Link
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
      <CardFooter className="flex items-center gap-1.5 w-fit mx-auto text-sm">
        <ArrowLeft className="text-muted-foreground size-3" />
        <p
          className="text-foreground underline underline-offset-2 cursor-pointer"
          onClick={() => router.back()}
        >
          Go back
        </p>
      </CardFooter>
    </Card>
  );
}

export default ForgetPassword;
