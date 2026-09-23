/**
 * @module auth/auth.service
 * @description Core authentication service — signup, signin (email + social),
 *              signout, email verification, 2FA (OTP + TOTP), magic link,
 *              password reset. Every method calls Better Auth's API and
 *              validates responses with Zod DTO schemas.
 *
 * **Security:** OAuth callback URLs are validated against a whitelist
 * (`"/"` or `/api/auth/oauth2/authorize?*`) to prevent open redirect attacks.
 *
 * **Magic link OAuth workaround:** Because Better Auth's origin check
 * double-decodes OAuth authorize paths (failing on `:`), magic links route
 * through a relay page that base64url-decodes and redirects server-side.
 * @category Infrastructure
 * @layer Infrastructure
 */

import { randomUUID } from "crypto";
import {
  SignupResponseDtoSchema,
  TSignupResponseDtoSchema,
  TSigninResponseDtoSchema,
  SigninResponseDtoSchema,
  SignoutResponseDtoSchema,
  TSignoutResponseDtoSchema,
  SigninWithSocialResponseDtoSchema,
  TSigninWithSocialResponseDtoSchema,
  SendEmailVerificationDtoSchema,
  TSendEmailVerificationDtoSchema,
  VerifyTwoFactorOTPDtoSchema,
  TVerifyTwoFactorOTPDtoSchema,
  SendTwoFactorOTPDtoSchema,
  TSendTwoFactorOTPDtoSchema,
  SendMagicLinkDtoSchema,
  TSendMagicLinkDtoSchema,
  SendResetPasswordDtoSchema,
  TSendResetPasswordDtoSchema,
  ResetPasswordDtoSchema,
  TResetPasswordDtoSchema,
  VerifyTOTPDtoSchema,
  TVerifyTOTPDtoSchema,
} from "@/modules/entities/schemas/auth";
import { auth } from "@/modules/server/auth-provider/auth";
import { IAuthService } from "../../domain/interfaces/auth.service.interface";
import { mapBetterAuthError } from "@/modules/server/shared/errors/mappers/mapBetterAuthError";
import { headers } from "next/headers";
import {
  TSendEmailVerificationPayload,
  TSigninEmailPayload,
  TSigninWithSocialPayload,
  TSignupEmailPayload,
  TVerifyTwoFactorOTPPayload,
  TSendTwoFactorOTPPayload,
  TVerifyTOTPPayload,
  TSendMagicLinkPayload,
  TSendResetPasswordPayload,
  TResetPasswordPayload,
} from "@/modules/entities/types/auth";
import { logOperation } from "@/modules/server/config/logger/log-operation";

export class AuthService implements IAuthService {
  async signUpWithEmail(
    payload: TSignupEmailPayload,
  ): Promise<TSignupResponseDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "AuthService.signUpWithEmail",
      startTimeMs,
      context: { operationId, email: payload.email },
    });

    try {
      const res = await auth.api.signUpEmail({
        body: {
          name: payload.name,
          username: payload.username,
          email: payload.email,
          password: payload.password,
          callbackURL: "/",
        },
      });

      const data = await SignupResponseDtoSchema.parseAsync(res);

      logOperation("success", {
        name: "AuthService.signUpWithEmail",
        startTimeMs,
        data,
        context: { operationId, email: payload.email },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "AuthService.signUpWithEmail",
        startTimeMs,
        err: error,
        context: { operationId, email: payload.email },
      });

      mapBetterAuthError(error, "Failed to sign up user");
    }
  }

  async signInWithEmail(
    payload: TSigninEmailPayload,
  ): Promise<TSigninResponseDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "AuthService.signInWithEmail",
      startTimeMs,
      context: { operationId, email: payload.email },
    });

    try {
      const res = await auth.api.signInEmail({
        body: {
          email: payload.email,
          password: payload.password,
          rememberMe: payload.rememberMe,
          callbackURL: "/",
        },
      });

      const data = await SigninResponseDtoSchema.parseAsync(res);

      logOperation("success", {
        name: "AuthService.signInWithEmail",
        startTimeMs,
        data,
        context: { operationId, email: payload.email },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "AuthService.signInWithEmail",
        startTimeMs,
        err: error,
        context: { operationId, email: payload.email },
      });

      mapBetterAuthError(error, "Failed to sign in user");
    }
  }

  async signInWithSocial(
    payload: TSigninWithSocialPayload,
  ): Promise<TSigninWithSocialResponseDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "AuthService.signInWithSocial",
      startTimeMs,
      context: { operationId, provider: payload.provider },
    });

    try {
      const isValidCallbackURL = (url: string | undefined): boolean => {
        if (!url) return true;
        return url === "/" || url.startsWith("/api/auth/oauth2/authorize?");
      };
      const safeCallbackURL = isValidCallbackURL(payload.callbackURL)
        ? (payload.callbackURL ?? "/")
        : "/";

      const res = await auth.api.signInSocial({
        body: { provider: payload.provider, callbackURL: safeCallbackURL },
      });

      const data = await SigninWithSocialResponseDtoSchema.parseAsync(res);

      logOperation("success", {
        name: "AuthService.signInWithSocial",
        startTimeMs,
        data,
        context: { operationId, provider: payload.provider },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "AuthService.signInWithSocial",
        startTimeMs,
        err: error,
        context: { operationId, provider: payload.provider },
      });

      mapBetterAuthError(error, "Failed to sign in user");
    }
  }

  async signOut(): Promise<TSignoutResponseDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "AuthService.signOut",
      startTimeMs,
      context: { operationId },
    });

    try {
      const res = await auth.api.signOut({ headers: await headers() });

      const data = await SignoutResponseDtoSchema.parseAsync({
        ...res,
        url: res.success ? "/" : null,
      });

      logOperation("success", {
        name: "AuthService.signOut",
        startTimeMs,
        data,
        context: { operationId },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "AuthService.signOut",
        startTimeMs,
        err: error,
        context: { operationId },
      });

      mapBetterAuthError(error, "Failed to sign out user");
    }
  }

  async sendEmailVerification(
    payload: TSendEmailVerificationPayload,
  ): Promise<TSendEmailVerificationDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "AuthService.sendEmailVerification",
      startTimeMs,
      context: { operationId, email: payload.email },
    });

    try {
      // Only allow "/" or our own OAuth authorize path to prevent open redirect
      const isValidCallbackURL = (url: string | undefined): boolean => {
        if (!url) return true;
        return url === "/" || url.startsWith("/api/auth/oauth2/authorize?");
      };
      const safeCallbackURL = isValidCallbackURL(payload.callbackURL)
        ? (payload.callbackURL ?? "/")
        : "/";

      const res = await auth.api.sendVerificationEmail({
        body: { email: payload.email, callbackURL: safeCallbackURL },
      });

      const data = await SendEmailVerificationDtoSchema.parseAsync({
        success: res.status,
      });

      logOperation("success", {
        name: "AuthService.sendEmailVerification",
        startTimeMs,
        data,
        context: { operationId, email: payload.email },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "AuthService.sendEmailVerification",
        startTimeMs,
        err: error,
        context: { operationId, email: payload.email },
      });

      mapBetterAuthError(error, "Failed to send verification email");
    }
  }

  async sendTwoFactorOTP(
    payload: TSendTwoFactorOTPPayload,
  ): Promise<TSendTwoFactorOTPDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "AuthService.sendTwoFactorOTP",
      startTimeMs,
      context: { operationId },
    });

    try {
      const res = await auth.api.sendTwoFactorOTP({
        body: { trustDevice: payload.trustDevice },
        headers: await headers(),
      });

      const data = await SendTwoFactorOTPDtoSchema.parseAsync({
        status: res.status,
      });

      logOperation("success", {
        name: "AuthService.sendTwoFactorOTP",
        startTimeMs,
        data,
        context: { operationId },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "AuthService.sendTwoFactorOTP",
        startTimeMs,
        err: error,
        context: { operationId },
      });

      mapBetterAuthError(error, "Failed to send two-factor OTP");
    }
  }

  async verifyTwoFactorOTP(
    payload: TVerifyTwoFactorOTPPayload,
  ): Promise<TVerifyTwoFactorOTPDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "AuthService.verifyTwoFactorOTP",
      startTimeMs,
      context: { operationId },
    });

    try {
      const res = await auth.api.verifyTwoFactorOTP({
        body: { code: payload.code, trustDevice: payload.trustDevice },
        headers: await headers(),
      });

      const data = await VerifyTwoFactorOTPDtoSchema.parseAsync(res);

      logOperation("success", {
        name: "AuthService.verifyTwoFactorOTP",
        startTimeMs,
        data,
        context: { operationId },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "AuthService.verifyTwoFactorOTP",
        startTimeMs,
        err: error,
        context: { operationId },
      });

      mapBetterAuthError(error, "Failed to verify two-factor OTP");
    }
  }

  async verifyTwoFactorTOTP(
    payload: TVerifyTOTPPayload,
  ): Promise<TVerifyTOTPDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "AuthService.verifyTwoFactorTOTP",
      startTimeMs,
      context: { operationId },
    });

    try {
      const res = await auth.api.verifyTOTP({
        body: { code: payload.code, trustDevice: payload.trustDevice },
        headers: await headers(),
      });

      const data = await VerifyTOTPDtoSchema.parseAsync(res);

      logOperation("success", {
        name: "AuthService.verifyTwoFactorTOTP",
        startTimeMs,
        data,
        context: { operationId },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "AuthService.verifyTwoFactorTOTP",
        startTimeMs,
        err: error,
        context: { operationId },
      });

      mapBetterAuthError(error, "Failed to verify TOTP code");
    }
  }

  async sendMagicLink(
    payload: TSendMagicLinkPayload,
  ): Promise<TSendMagicLinkDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "AuthService.sendMagicLink",
      startTimeMs,
      context: { operationId, email: payload.email },
    });

    try {
      // Only allow "/" or our own OAuth authorize path to prevent open redirect
      const isValidCallbackURL = (url: string | undefined): boolean => {
        if (!url) return true;
        return url === "/" || url.startsWith("/api/auth/oauth2/authorize?");
      };
      const safeCallbackURL = isValidCallbackURL(payload.callbackURL)
        ? (payload.callbackURL ?? "/")
        : "/";

      // Better Auth's magic-link verify endpoint double-decodes callbackURL via
      // originCheck middleware. An OAuth authorize path (containing `:` after
      // double-decode) fails the relative-URL regex. Route through a relay page
      // that base64url-decodes and issues a server-side redirect instead.
      const finalCallbackURL = safeCallbackURL.startsWith(
        "/api/auth/oauth2/authorize?",
      )
        ? `${process.env.BETTER_AUTH_URL!}/auth/magic-link/relay?redirect=${Buffer.from(safeCallbackURL).toString("base64url")}`
        : safeCallbackURL;

      const res = await auth.api.signInMagicLink({
        body: { email: payload.email, callbackURL: finalCallbackURL },
        headers: await headers(),
      });

      const data = await SendMagicLinkDtoSchema.parseAsync({
        success: res.status,
      });

      logOperation("success", {
        name: "AuthService.sendMagicLink",
        startTimeMs,
        data,
        context: { operationId, email: payload.email },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "AuthService.sendMagicLink",
        startTimeMs,
        err: error,
        context: { operationId, email: payload.email },
      });

      mapBetterAuthError(error, "Failed to send magic link");
    }
  }

  async sendResetPassword(
    payload: TSendResetPasswordPayload,
  ): Promise<TSendResetPasswordDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "AuthService.sendResetPassword",
      startTimeMs,
      context: { operationId, email: payload.email },
    });

    try {
      // Only allow "/" or our own OAuth authorize path to prevent open redirect
      const isValidRedirect = (url: string | undefined): boolean => {
        if (!url) return true;
        return url === "/" || url.startsWith("/api/auth/oauth2/authorize?");
      };
      const safeRedirect = isValidRedirect(payload.redirect)
        ? payload.redirect
        : undefined;

      const resetBase = `${process.env.BETTER_AUTH_URL}/auth/reset-password`;
      const redirectTo = safeRedirect
        ? `${resetBase}?redirect=${encodeURIComponent(safeRedirect)}`
        : resetBase;

      await auth.api.requestPasswordReset({
        body: { email: payload.email, redirectTo },
      });

      const data = await SendResetPasswordDtoSchema.parseAsync({
        success: true,
      });

      logOperation("success", {
        name: "AuthService.sendResetPassword",
        startTimeMs,
        data,
        context: { operationId, email: payload.email },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "AuthService.sendResetPassword",
        startTimeMs,
        err: error,
        context: { operationId, email: payload.email },
      });

      mapBetterAuthError(error, "Failed to send password reset email");
    }
  }

  async resetPassword(
    payload: TResetPasswordPayload,
  ): Promise<TResetPasswordDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "AuthService.resetPassword",
      startTimeMs,
      context: { operationId },
    });

    try {
      await auth.api.resetPassword({
        body: { newPassword: payload.newPassword, token: payload.token },
      });

      const data = await ResetPasswordDtoSchema.parseAsync({ success: true });

      logOperation("success", {
        name: "AuthService.resetPassword",
        startTimeMs,
        data,
        context: { operationId },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "AuthService.resetPassword",
        startTimeMs,
        err: error,
        context: { operationId },
      });

      mapBetterAuthError(error, "Failed to reset password");
    }
  }
}
