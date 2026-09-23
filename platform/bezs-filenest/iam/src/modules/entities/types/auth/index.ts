import { TSocialProviders } from "../../enums/auth/auth.enum"

// backend schemas (used in class methods and interfaces)
// payloads
export type TBaseSigninOrSignupPayload = {
  name: string
  username: string
  email: string
  password: string
  rememberMe: boolean
}

export type TSignupEmailPayload = Pick<
  TBaseSigninOrSignupPayload,
  "email" | "name" | "username" | "password" | "rememberMe"
>

export type TSigninEmailPayload = Pick<
  TBaseSigninOrSignupPayload,
  "email" | "password" | "rememberMe"
>

export type TSigninWithSocialPayload = {
  provider: TSocialProviders
  callbackURL?: string
}

export type TSendEmailVerificationPayload = {
  email: string
  callbackURL?: string
}

export type TVerifyTwoFactorOTPPayload = {
  code: string
  trustDevice?: boolean
}

export type TSendTwoFactorOTPPayload = {
  trustDevice?: boolean
}

export type TVerifyTOTPPayload = {
  code: string
  trustDevice?: boolean
}

export type TSendMagicLinkPayload = {
  email: string
  callbackURL?: string
}

export type TSendResetPasswordPayload = {
  email: string
  redirect?: string
}

export type TResetPasswordPayload = {
  newPassword: string
  token: string
}
