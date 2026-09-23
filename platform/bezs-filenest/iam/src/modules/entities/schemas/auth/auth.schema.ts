import z from "zod"
import { ZodSocialProviders } from "../../enums/auth/auth.enum"
import { TransportOptionsSchema } from "../transport"
import { BaseSigninOrSignupSchema } from "./base.schema"
import { UserSchema } from "./reusable.schema"

// form schemas (used in client side forms)
export const SignupFormSchema = BaseSigninOrSignupSchema.pick({
  name: true,
  username: true,
  email: true,
  password: true,
  rememberMe: true
})
export type TSignupFormSchema = z.infer<typeof SignupFormSchema>

export const SigninFormSchema = BaseSigninOrSignupSchema.pick({
  email: true,
  password: true,
  rememberMe: true
})
export type TSigninFormSchema = z.infer<typeof SigninFormSchema>

export const ForgetPasswordOrMagicLinkFormSchema =
  BaseSigninOrSignupSchema.pick({
    email: true
  })
export type TForgetPasswordOrMagicLinkFormSchema = z.infer<
  typeof ForgetPasswordOrMagicLinkFormSchema
>

// ------------------------------------------------------- //

// validation schemas (used in and controllers)
export const SignupValidationSchema = BaseSigninOrSignupSchema.pick({
  name: true,
  username: true,
  email: true,
  password: true,
  rememberMe: true
})
export type TSignupValidationSchema = z.infer<typeof SignupValidationSchema>

export const SigninValidationSchema = BaseSigninOrSignupSchema.pick({
  email: true,
  password: true,
  rememberMe: true
})
export type TSigninValidationSchema = z.infer<typeof SigninValidationSchema>

export const SigninWithSocialValidationSchema = z.object({
  provider: ZodSocialProviders,
  callbackURL: z.string().optional(),
})
export type TSigninWithSocialValidationSchema = z.infer<
  typeof SigninWithSocialValidationSchema
>

export const SendVerificationEmailValidationSchema = z.object({
  email: z.string().email(),
  callbackURL: z.string().optional(),
})
export type TSendVerificationEmailValidationSchema = z.infer<
  typeof SendVerificationEmailValidationSchema
>

// ------------------------------------------------------- //

// Server Action Schema
export const SignupActionSchema = z.object({
  payload: SignupValidationSchema,
  captchaToken: z.string().optional(),
  transportOptions: TransportOptionsSchema.optional()
})
export type TSignupActionSchema = z.infer<typeof SignupActionSchema>

export const SigninActionSchema = z.object({
  payload: SigninValidationSchema,
  captchaToken: z.string().optional(),
  transportOptions: TransportOptionsSchema.optional()
})
export type TSigninActionSchema = z.infer<typeof SigninActionSchema>

export const SignoutActionSchema = z.object({
  transportOptions: TransportOptionsSchema.optional()
})
export type TSignoutActionSchema = z.infer<typeof SignoutActionSchema>

export const SendEmailVerificationActionSchema = z.object({
  payload: SendVerificationEmailValidationSchema,
  transportOptions: TransportOptionsSchema.optional()
})
export type TSendEmailVerificationActionSchema = z.infer<
  typeof SendEmailVerificationActionSchema
>

// ------------------------------------------------------- //

// return DTO validator
export const SignupResponseDtoSchema = z.union([
  z.object({
    token: z.null(),
    user: UserSchema
  }),
  z.object({
    token: z.string(),
    user: UserSchema
  })
])
export type TSignupResponseDtoSchema = z.infer<typeof SignupResponseDtoSchema>

// When 2FA is enabled the after-hook replaces the normal sign-in response
export const SigninResponseDtoSchema = z.union([
  z.object({
    redirect: z.boolean(),
    token: z.string(),
    url: z.string().optional(),
    user: UserSchema,
  }),
  z.object({
    twoFactorRedirect: z.literal(true),
  }),
])
export type TSigninResponseDtoSchema = z.infer<typeof SigninResponseDtoSchema>

export const SigninWithSocialResponseDtoSchema = z.union([
  z.object({
    redirect: z.boolean(),
    token: z.string(),
    url: z.undefined(),
    user: UserSchema
  }),
  z.object({
    redirect: z.boolean(),
    url: z.string()
  })
])
export type TSigninWithSocialResponseDtoSchema = z.infer<
  typeof SigninWithSocialResponseDtoSchema
>

export const SignoutResponseDtoSchema = z.object({
  success: z.boolean(),
  url: z.string().nullable()
})
export type TSignoutResponseDtoSchema = z.infer<typeof SignoutResponseDtoSchema>

export const SendEmailVerificationDtoSchema = z.object({
  success: z.boolean()
})
export type TSendEmailVerificationDtoSchema = z.infer<
  typeof SendEmailVerificationDtoSchema
>

// ------------------------------------------------------- //

// Two-Factor Authentication schemas

export const VerifyTwoFactorOTPValidationSchema = z.object({
  code: z.string().min(6).max(6),
  trustDevice: z.boolean().optional(),
})
export type TVerifyTwoFactorOTPValidationSchema = z.infer<
  typeof VerifyTwoFactorOTPValidationSchema
>

export const VerifyTwoFactorOTPActionSchema = z.object({
  payload: VerifyTwoFactorOTPValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
})
export type TVerifyTwoFactorOTPActionSchema = z.infer<
  typeof VerifyTwoFactorOTPActionSchema
>

export const SendTwoFactorOTPActionSchema = z.object({
  transportOptions: TransportOptionsSchema.optional(),
})
export type TSendTwoFactorOTPActionSchema = z.infer<
  typeof SendTwoFactorOTPActionSchema
>

export const VerifyTwoFactorOTPDtoSchema = z.object({
  token: z.string(),
})
export type TVerifyTwoFactorOTPDtoSchema = z.infer<
  typeof VerifyTwoFactorOTPDtoSchema
>

export const SendTwoFactorOTPDtoSchema = z.object({
  status: z.boolean(),
})
export type TSendTwoFactorOTPDtoSchema = z.infer<
  typeof SendTwoFactorOTPDtoSchema
>

// TOTP verification schemas (authenticator app)

export const VerifyTOTPValidationSchema = z.object({
  code: z.string().min(6).max(6),
  trustDevice: z.boolean().optional(),
})
export type TVerifyTOTPValidationSchema = z.infer<typeof VerifyTOTPValidationSchema>

export const VerifyTOTPActionSchema = z.object({
  payload: VerifyTOTPValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
})
export type TVerifyTOTPActionSchema = z.infer<typeof VerifyTOTPActionSchema>

export const VerifyTOTPDtoSchema = z.object({
  token: z.string(),
})
export type TVerifyTOTPDtoSchema = z.infer<typeof VerifyTOTPDtoSchema>

// ------------------------------------------------------- //

// Magic link schemas

export const SendMagicLinkValidationSchema = z.object({
  email: z.string().email(),
  callbackURL: z.string().optional(),
})
export type TSendMagicLinkValidationSchema = z.infer<
  typeof SendMagicLinkValidationSchema
>

export const SendMagicLinkActionSchema = z.object({
  payload: SendMagicLinkValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
})
export type TSendMagicLinkActionSchema = z.infer<
  typeof SendMagicLinkActionSchema
>

export const SendMagicLinkDtoSchema = z.object({
  success: z.boolean(),
})
export type TSendMagicLinkDtoSchema = z.infer<typeof SendMagicLinkDtoSchema>

// ------------------------------------------------------- //

// Password reset schemas

export const SendResetPasswordValidationSchema = z.object({
  email: z.string().email(),
  redirect: z.string().optional(),
})
export type TSendResetPasswordValidationSchema = z.infer<
  typeof SendResetPasswordValidationSchema
>

export const SendResetPasswordActionSchema = z.object({
  payload: SendResetPasswordValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
})
export type TSendResetPasswordActionSchema = z.infer<
  typeof SendResetPasswordActionSchema
>

export const SendResetPasswordDtoSchema = z.object({
  success: z.boolean(),
})
export type TSendResetPasswordDtoSchema = z.infer<
  typeof SendResetPasswordDtoSchema
>

export const ResetPasswordValidationSchema = z
  .object({
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
export type TResetPasswordValidationSchema = z.infer<
  typeof ResetPasswordValidationSchema
>

export const ResetPasswordActionSchema = z.object({
  payload: ResetPasswordValidationSchema,
  token: z.string(),
  redirect: z.string().optional(),
  transportOptions: TransportOptionsSchema.optional(),
})
export type TResetPasswordActionSchema = z.infer<
  typeof ResetPasswordActionSchema
>

export const ResetPasswordDtoSchema = z.object({
  success: z.boolean(),
})
export type TResetPasswordDtoSchema = z.infer<typeof ResetPasswordDtoSchema>
