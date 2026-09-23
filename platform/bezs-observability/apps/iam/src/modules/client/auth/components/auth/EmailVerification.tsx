"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { useCountdown } from "../../hooks/useCountdown"
import { useServerAction } from "zsa-react"
import { toast } from "sonner"
import { sendEmailVerificationAction } from "@/modules/server/presentation/actions/auth"
import { Loader2 } from "lucide-react"
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError"

interface IEmailVerificationProps {
  email: string
  redirect?: string
}

function EmailVerification({ email, redirect }: IEmailVerificationProps) {
  const { restart, seconds } = useCountdown(30)

  const { execute, isPending } = useServerAction(sendEmailVerificationAction, {
    onSuccess() {
      toast.success("Verification Email Sent!", {
        description: "Check your email to verify your account."
      })
      restart()
    },
    onError({ err }) {
      handleZSAError({
        err,
        fallbackMessage: "Failed to send verification email"
      })
    }
  })

  function handleResendEmail() {
    if (!email) {
      toast.warning(
        "Something went wrong while resending the verification email. Please try again."
      )
      return
    }

    execute({ payload: { email, callbackURL: redirect } })
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle className="text-xl">Verify Your Email</CardTitle>
        <CardDescription>
          We sent you a verification link. Please check your email and click the
          link to verify your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="secondary"
          className="w-full"
          disabled={isPending || seconds > 0}
          onClick={handleResendEmail}
        >
          {isPending ? (
            <>
              <Loader2 className="animate-spin" />
              Sending...
            </>
          ) : seconds > 0 ? (
            `Resend Email (${seconds})`
          ) : (
            "Resend Email"
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

export default EmailVerification
