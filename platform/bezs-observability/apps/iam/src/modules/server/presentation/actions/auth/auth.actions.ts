"use server";

import {
  SendEmailVerificationActionSchema,
  SendTwoFactorOTPActionSchema,
  SigninActionSchema,
  SigninWithSocialValidationSchema,
  SignoutActionSchema,
  SignupActionSchema,
  VerifyTwoFactorOTPActionSchema,
  SendMagicLinkActionSchema,
  SendResetPasswordActionSchema,
  ResetPasswordActionSchema,
} from "@/modules/entities/schemas/auth";
import { createServerAction } from "zsa";
import {
  signinController,
  signinWithSocialController,
  signoutController,
  signupController,
  TSigninControllerOutput,
  TSigninWithSocialControllerOutput,
  TSignoutControllerOutput,
  TSignupControllerOutput,
  sendTwoFactorOTPController,
  TSendTwoFactorOTPControllerOutput,
  verifyTwoFactorOTPController,
  TVerifyTwoFactorOTPControllerOutput,
  sendMagicLinkController,
  TSendMagicLinkControllerOutput,
  sendResetPasswordController,
  TSendResetPasswordControllerOutput,
  resetPasswordController,
  TResetPasswordControllerOutput,
} from "@/modules/server/core/auth/interface-adapters/controllers/auth";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import {
  sendEmailVerificationController,
  TSendEmailVerificationControllerOutPut,
} from "@/modules/server/core/auth/interface-adapters/controllers/auth/sendEmailVerification.controller";
import { isEmailVerificationEnabled } from "@/modules/server/auth-provider/auth-server";

/**
 * Server action acting as a transport layer between client and server.
 * Input validation and business logic are delegated to controllers and use cases.
 */

// Server actions act as a transport layer only.
// Input validation is handled in controllers to preserve clean architecture boundaries.
export const signupAction = createServerAction()
  .input(SignupActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TSignupControllerOutput>(async () => {
      const data = await signupController(input.payload);

      // Email verification takes priority over OAuth redirect when email is unverified.
      // Encode the OAuth redirect so it survives through the verification page.
      const oauthRedirect = input.transportOptions?.url;
      const redirectUrl = data.user.emailVerified
        ? (oauthRedirect ?? "/")
        : isEmailVerificationEnabled
          ? `/auth/email-verification?email=${data.user.email}${oauthRedirect ? `&redirect=${encodeURIComponent(oauthRedirect)}` : ""}`
          : (oauthRedirect ?? "/");

      return {
        result: data,
        transport: {
          ...input.transportOptions,
          shouldRedirect: input.transportOptions?.shouldRedirect ?? true,
          url: redirectUrl,
        },
      };
    });
  });

export const signinAction = createServerAction()
  .input(SigninActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TSigninControllerOutput>(async () => {
      const data = await signinController(input.payload);

      // Normal sign-in: "redirect" only exists on the non-2FA union member,
      // so TypeScript narrows data correctly in both branches.
      if ("redirect" in data) {
        return {
          result: data,
          transport: {
            ...input.transportOptions,
            url: input.transportOptions?.url ?? data.url,
            shouldRedirect:
              input.transportOptions?.shouldRedirect ?? data.redirect,
          },
        };
      }

      // 2FA required: redirect to the 2FA page, carrying the OAuth redirect as a param
      const oauthRedirect = input.transportOptions?.url;
      const twoFactorUrl = oauthRedirect
        ? `/auth/two-factor?redirect=${encodeURIComponent(oauthRedirect)}`
        : "/auth/two-factor";
      return {
        result: data,
        transport: { url: twoFactorUrl, shouldRedirect: true },
      };
    });
  });

export const signinWithSocialAction = createServerAction()
  .input(SigninWithSocialValidationSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TSigninWithSocialControllerOutput>(
      async () => {
        const data = await signinWithSocialController(input);

        return {
          result: data,
          transport: {
            url: data.redirect ? data.url : null,
            shouldRedirect: Boolean(data.redirect && data.url),
          },
        };
      },
    );
  });

export const signoutAction = createServerAction()
  .input(SignoutActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TSignoutControllerOutput>(async () => {
      const data = await signoutController();

      return {
        result: data,
        transport: {
          ...input.transportOptions,
          url: data.url ?? input.transportOptions?.url,
          shouldRedirect:
            data.success ?? input.transportOptions?.shouldRedirect,
        },
      };
    });
  });

export const sendEmailVerificationAction = createServerAction()
  .input(SendEmailVerificationActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TSendEmailVerificationControllerOutPut>(
      async () => {
        const data = await sendEmailVerificationController(input.payload);

        return {
          result: data,
          transport: input.transportOptions,
        };
      },
    );
  });

export const sendTwoFactorOTPAction = createServerAction()
  .input(SendTwoFactorOTPActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TSendTwoFactorOTPControllerOutput>(
      async () => {
        const data = await sendTwoFactorOTPController();

        return {
          result: data,
          transport: input.transportOptions,
        };
      },
    );
  });

export const verifyTwoFactorOTPAction = createServerAction()
  .input(VerifyTwoFactorOTPActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TVerifyTwoFactorOTPControllerOutput>(
      async () => {
        const data = await verifyTwoFactorOTPController(input.payload);

        return {
          result: data,
          transport: {
            ...input.transportOptions,
            shouldRedirect: input.transportOptions?.shouldRedirect ?? true,
            url: input.transportOptions?.url ?? "/",
          },
        };
      },
    );
  });

export const sendMagicLinkAction = createServerAction()
  .input(SendMagicLinkActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TSendMagicLinkControllerOutput>(async () => {
      const data = await sendMagicLinkController(input.payload);

      return {
        result: data,
        transport: input.transportOptions,
      };
    });
  });

export const sendResetPasswordAction = createServerAction()
  .input(SendResetPasswordActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TSendResetPasswordControllerOutput>(
      async () => {
        const data = await sendResetPasswordController(input.payload);

        return {
          result: data,
          transport: input.transportOptions,
        };
      },
    );
  });

const isValidResetRedirect = (url: string | undefined): boolean => {
  if (!url) return true;
  return url === "/" || url.startsWith("/api/auth/oauth2/authorize?");
};

export const resetPasswordAction = createServerAction()
  .input(ResetPasswordActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TResetPasswordControllerOutput>(async () => {
      const data = await resetPasswordController(input.payload, input.token);

      const safeRedirect = isValidResetRedirect(input.redirect)
        ? input.redirect
        : undefined;

      return {
        result: data,
        transport: {
          ...input.transportOptions,
          shouldRedirect: input.transportOptions?.shouldRedirect ?? true,
          url: safeRedirect ?? input.transportOptions?.url ?? "/auth/sign-in",
        },
      };
    });
  });
