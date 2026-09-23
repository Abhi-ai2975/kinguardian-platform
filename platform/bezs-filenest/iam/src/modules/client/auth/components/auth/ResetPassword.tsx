"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ResetPasswordValidationSchema,
  TResetPasswordValidationSchema,
} from "@/modules/entities/schemas/auth";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useServerAction } from "zsa-react";
import { resetPasswordAction } from "@/modules/server/presentation/actions/auth";
import { toast } from "sonner";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

interface IResetPasswordProps {
  token: string;
  redirect?: string;
}

function ResetPassword({ token, redirect }: IResetPasswordProps) {
  const form = useForm<TResetPasswordValidationSchema>({
    resolver: zodResolver(ResetPasswordValidationSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });
  const { isSubmitting } = form.formState;

  const { execute } = useServerAction(resetPasswordAction, {
    onSuccess: () => {
      toast.success("Password reset successfully!");
    },
    onError: ({ err }) => {
      handleZSAError<TResetPasswordValidationSchema>({
        err,
        form,
        fallbackMessage: "Failed to reset password. The link may have expired.",
      });
    },
  });

  async function handleReset(values: TResetPasswordValidationSchema) {
    await execute({
      payload: values,
      token,
      redirect,
      transportOptions: { shouldRedirect: true },
    });
  }

  return (
    <Card className="max-w-sm w-full mx-auto">
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>Enter your new password below.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleReset)}>
            <FieldGroup>
              <Controller
                control={form.control}
                name="newPassword"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="newPassword">New Password</FieldLabel>
                    <Input
                      {...field}
                      id="newPassword"
                      type="password"
                      aria-invalid={fieldState.invalid}
                      placeholder="••••••••"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="confirmPassword"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="confirmPassword">
                      Confirm Password
                    </FieldLabel>
                    <Input
                      {...field}
                      id="confirmPassword"
                      type="password"
                      aria-invalid={fieldState.invalid}
                      placeholder="••••••••"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </FieldGroup>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default ResetPassword;
