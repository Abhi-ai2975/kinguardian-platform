import {
  TSignupResponseDtoSchema,
  TSigninResponseDtoSchema,
  TSignoutResponseDtoSchema,
  TSigninWithSocialResponseDtoSchema,
  TSendEmailVerificationDtoSchema,
  TVerifyTwoFactorOTPDtoSchema,
  TSendTwoFactorOTPDtoSchema,
  TSendMagicLinkDtoSchema,
  TSendResetPasswordDtoSchema,
  TResetPasswordDtoSchema,
} from "@/modules/entities/schemas/auth"
import {
  TSendEmailVerificationPayload,
  TSigninEmailPayload,
  TSigninWithSocialPayload,
  TSignupEmailPayload,
  TVerifyTwoFactorOTPPayload,
  TSendTwoFactorOTPPayload,
  TSendMagicLinkPayload,
  TSendResetPasswordPayload,
  TResetPasswordPayload,
} from "@/modules/entities/types/auth"

export interface IAuthService {
  signUpWithEmail(
    payload: TSignupEmailPayload
  ): Promise<TSignupResponseDtoSchema>
  signInWithEmail(
    payload: TSigninEmailPayload
  ): Promise<TSigninResponseDtoSchema>
  signInWithSocial(
    payload: TSigninWithSocialPayload
  ): Promise<TSigninWithSocialResponseDtoSchema>
  signOut(): Promise<TSignoutResponseDtoSchema>
  sendEmailVerification(
    payload: TSendEmailVerificationPayload
  ): Promise<TSendEmailVerificationDtoSchema>
  sendTwoFactorOTP(
    payload: TSendTwoFactorOTPPayload
  ): Promise<TSendTwoFactorOTPDtoSchema>
  verifyTwoFactorOTP(
    payload: TVerifyTwoFactorOTPPayload
  ): Promise<TVerifyTwoFactorOTPDtoSchema>
  sendMagicLink(
    payload: TSendMagicLinkPayload
  ): Promise<TSendMagicLinkDtoSchema>
  sendResetPassword(
    payload: TSendResetPasswordPayload
  ): Promise<TSendResetPasswordDtoSchema>
  resetPassword(
    payload: TResetPasswordPayload
  ): Promise<TResetPasswordDtoSchema>
}
