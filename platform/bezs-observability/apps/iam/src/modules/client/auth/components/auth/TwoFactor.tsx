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
} from "@/modules/entities/schemas/auth";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { useServerAction } from "zsa-react";
import {
  verifyTwoFactorOTPAction,
  sendTwoFactorOTPAction,
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
  /** Destination to redirect after successful verification (e.g. /api/auth/oauth2/authorize?...) */
  redirect?: string;
}

function TwoFactor({ redirect }: ITwoFactorProps) {
  const { restart, seconds } = useCountdown(0);
  const hasSentRef = useRef(false);

  const form = useForm<TVerifyTwoFactorOTPValidationSchema>({
    resolver: zodResolver(VerifyTwoFactorOTPValidationSchema),
    defaultValues: { code: "" },
  });
  const { isSubmitting } = form.formState;

  const { execute: executeVerify } = useServerAction(verifyTwoFactorOTPAction, {
    onSuccess: () => {
      toast.success("Verified successfully!");
    },
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
        toast.success("OTP sent!", {
          description: "Check your email for the verification code.",
        });
        restart();
      },
      onError: ({ err }) => {
        handleZSAError({
          err,
          fallbackMessage: "Failed to send OTP. Please try again.",
        });
      },
    },
  );

  // Auto-send OTP on mount so the user receives it immediately without clicking
  useEffect(() => {
    if (hasSentRef.current) return;
    hasSentRef.current = true;
    executeSend({});
  }, [executeSend]);

  async function handleVerify(values: TVerifyTwoFactorOTPValidationSchema) {
    await executeVerify({
      payload: values,
      transportOptions: {
        shouldRedirect: true,
        url: redirect ?? "/",
      },
    });
  }

  function handleSendOTP() {
    executeSend({});
  }

  return (
    <Card className="max-w-sm w-full mx-auto">
      <CardHeader>
        <CardTitle>Two-Factor Verification</CardTitle>
        <CardDescription>
          Enter the 6-digit code sent to your email address.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleVerify)}>
            <FieldGroup>
              <Controller
                control={form.control}
                name="code"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="code">Verification Code</FieldLabel>
                    <InputOTP
                      maxLength={6}
                      value={field.value}
                      onChange={field.onChange}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
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
                    Verifying...
                  </>
                ) : (
                  "Verify"
                )}
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={isSending || seconds > 0}
                onClick={handleSendOTP}
              >
                {isSending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Sending...
                  </>
                ) : seconds > 0 ? (
                  `Resend Code (${seconds}s)`
                ) : (
                  "Resend Code"
                )}
              </Button>
            </FieldGroup>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default TwoFactor;
