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
  VerifyTwoFactorOTPValidationSchema,
  TVerifyTwoFactorOTPValidationSchema,
  VerifyTOTPValidationSchema,
  TVerifyTOTPValidationSchema,
} from "@/modules/entities/schemas/auth";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Mail, Smartphone } from "lucide-react";
import { useEffect, useRef } from "react";
import { useServerAction } from "zsa-react";
import {
  verifyTwoFactorOTPAction,
  sendTwoFactorOTPAction,
  verifyTOTPAction,
} from "@/modules/server/presentation/actions/auth";
import { toast } from "sonner";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useCountdown } from "../../hooks/useCountdown";

interface ITwoFactorProps {
  redirect?: string;
}

function EmailOTPTab({ redirect }: ITwoFactorProps) {
  const { restart, seconds } = useCountdown(0);
  const hasSentRef = useRef(false);

  const form = useForm<TVerifyTwoFactorOTPValidationSchema>({
    resolver: zodResolver(VerifyTwoFactorOTPValidationSchema),
    defaultValues: { code: "" },
  });
  const { isSubmitting } = form.formState;

  const { execute: executeVerify } = useServerAction(verifyTwoFactorOTPAction, {
    onSuccess: () => { toast.success("Verified successfully!"); },
    onError: ({ err }) => {
      handleZSAError<TVerifyTwoFactorOTPValidationSchema>({
        err,
        form,
        fallbackMessage: "Invalid or expired code. Please try again.",
      });
    },
  });

  const { execute: executeSend, isPending: isSending } = useServerAction(
    sendTwoFactorOTPAction,
    {
      onSuccess: () => {
        toast.success("OTP sent!", { description: "Check your email for the verification code." });
        restart();
      },
      onError: ({ err }) => {
        handleZSAError({ err, fallbackMessage: "Failed to send OTP. Please try again." });
      },
    },
  );

  useEffect(() => {
    if (hasSentRef.current) return;
    hasSentRef.current = true;
    executeSend({});
  }, [executeSend]);

  async function handleVerify(values: TVerifyTwoFactorOTPValidationSchema) {
    await executeVerify({
      payload: values,
      transportOptions: { shouldRedirect: true, url: redirect ?? "/" },
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleVerify)}>
        <FieldGroup>
          <Controller
            control={form.control}
            name="code"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="code">Verification Code</FieldLabel>
                <InputOTP maxLength={6} value={field.value} onChange={field.onChange}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                  </InputOTPGroup>
                </InputOTP>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? <><Loader2 className="animate-spin" /> Verifying...</> : "Verify"}
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={isSending || seconds > 0}
            onClick={() => executeSend({})}
          >
            {isSending ? (
              <><Loader2 className="animate-spin" /> Sending...</>
            ) : seconds > 0 ? (
              `Resend Code (${seconds}s)`
            ) : (
              "Resend Code"
            )}
          </Button>
        </FieldGroup>
      </form>
    </Form>
  );
}

function AuthenticatorTab({ redirect }: ITwoFactorProps) {
  const form = useForm<TVerifyTOTPValidationSchema>({
    resolver: zodResolver(VerifyTOTPValidationSchema),
    defaultValues: { code: "" },
  });
  const { isSubmitting } = form.formState;

  const { execute: executeVerify } = useServerAction(verifyTOTPAction, {
    onSuccess: () => { toast.success("Verified successfully!"); },
    onError: ({ err }) => {
      handleZSAError<TVerifyTOTPValidationSchema>({
        err,
        form,
        fallbackMessage: "Invalid authenticator code.",
      });
    },
  });

  async function handleVerify(values: TVerifyTOTPValidationSchema) {
    await executeVerify({
      payload: values,
      transportOptions: { shouldRedirect: true, url: redirect ?? "/" },
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleVerify)}>
        <FieldGroup>
          <Controller
            control={form.control}
            name="code"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="totp-code">Authenticator Code</FieldLabel>
                <InputOTP maxLength={6} value={field.value} onChange={field.onChange}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                  </InputOTPGroup>
                </InputOTP>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? <><Loader2 className="animate-spin" /> Verifying...</> : "Verify"}
          </Button>
        </FieldGroup>
      </form>
    </Form>
  );
}

function TwoFactor({ redirect }: ITwoFactorProps) {
  return (
    <Card className="max-w-sm w-full mx-auto">
      <CardHeader>
        <CardTitle>Two-Factor Verification</CardTitle>
        <CardDescription>
          Verify your identity to continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="totp">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="totp" className="flex-1 gap-1.5">
              <Smartphone className="h-4 w-4" />
              Authenticator
            </TabsTrigger>
            <TabsTrigger value="email" className="flex-1 gap-1.5">
              <Mail className="h-4 w-4" />
              Email Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="totp">
            <AuthenticatorTab redirect={redirect} />
          </TabsContent>

          <TabsContent value="email">
            <EmailOTPTab redirect={redirect} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default TwoFactor;
