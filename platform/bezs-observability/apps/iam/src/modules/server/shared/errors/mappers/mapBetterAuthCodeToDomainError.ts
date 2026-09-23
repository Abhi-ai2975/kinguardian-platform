import {
  InvalidCredentialsError,
  UserAlreadyExistsError,
  EmailNotVerifiedError,
  SessionExpiredError,
  AccountNotFoundError,
  PasswordPolicyError,
  AuthConfigurationError,
  AccountDisabledError,
} from "@/modules/server/shared/errors/auth/commonAuthErrors"
import {
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalServerError,
} from "@/modules/server/shared/errors/commonErrors"

import type { TBetterAuthErrorCode } from "@/modules/server/auth-provider/betterauth-error-codes"

export function mapBetterAuthCodeToDomainError(code: TBetterAuthErrorCode) {
  switch (code) {
    // --- INVALID CREDENTIALS ---
    case "INVALID_PASSWORD":
    case "INVALID_EMAIL":
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_USER":
    case "CREDENTIAL_ACCOUNT_NOT_FOUND":
    case "VALIDATION_ERROR":
      throw new InvalidCredentialsError()

    // --- ACCOUNT / USER EXISTS ---
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
    case "LINKED_ACCOUNT_ALREADY_EXISTS":
    case "SOCIAL_ACCOUNT_ALREADY_LINKED":
      throw new UserAlreadyExistsError()

    // --- EMAIL NOT VERIFIED ---
    case "EMAIL_NOT_VERIFIED":
    case "EMAIL_ALREADY_VERIFIED":
    case "VERIFICATION_EMAIL_NOT_ENABLED":
    case "EMAIL_VERIFICATION_REQUIRED_BEFORE_ACCEPTING_OR_REJECTING_INVITATION":
      throw new EmailNotVerifiedError()

    // --- SESSION / TOKEN ISSUES ---
    case "SESSION_EXPIRED":
    case "SESSION_NOT_FRESH":
    case "INVALID_TOKEN":
    case "TOKEN_EXPIRED":
      throw new SessionExpiredError()

    // --- ACCOUNT NOT FOUND ---
    case "USER_NOT_FOUND":
    case "ACCOUNT_NOT_FOUND":
    case "USER_EMAIL_NOT_FOUND":
      throw new AccountNotFoundError()

    // --- PASSWORD POLICY ---
    case "PASSWORD_TOO_SHORT":
    case "PASSWORD_TOO_LONG":
    case "USER_ALREADY_HAS_PASSWORD":
    case "PASSWORD_ALREADY_SET":
      throw new PasswordPolicyError()

    // --- AUTH CONFIGURATION ERRORS ---
    case "PROVIDER_NOT_FOUND":
    case "ID_TOKEN_NOT_SUPPORTED":
    case "INVALID_ORIGIN":
    case "INVALID_CALLBACK_URL":
    case "INVALID_REDIRECT_URL":
    case "INVALID_ERROR_CALLBACK_URL":
    case "INVALID_NEW_USER_CALLBACK_URL":
    case "CALLBACK_URL_REQUIRED":
    case "MISSING_OR_NULL_ORIGIN":
    case "MISSING_AC_INSTANCE":
      throw new AuthConfigurationError()

    // --- BANNED / DISABLED USER ---
    case "BANNED_USER":
      throw new AccountDisabledError()

    // --- FORBIDDEN / RBAC — admin operations ---
    case "YOU_CANNOT_BAN_YOURSELF":
    case "YOU_CANNOT_REMOVE_YOURSELF":
    case "YOU_CANNOT_IMPERSONATE_ADMINS":
    case "YOU_ARE_NOT_ALLOWED_TO_CHANGE_USERS_ROLE":
    case "YOU_ARE_NOT_ALLOWED_TO_CREATE_USERS":
    case "YOU_ARE_NOT_ALLOWED_TO_LIST_USERS":
    case "YOU_ARE_NOT_ALLOWED_TO_LIST_USERS_SESSIONS":
    case "YOU_ARE_NOT_ALLOWED_TO_BAN_USERS":
    case "YOU_ARE_NOT_ALLOWED_TO_IMPERSONATE_USERS":
    case "YOU_ARE_NOT_ALLOWED_TO_REVOKE_USERS_SESSIONS":
    case "YOU_ARE_NOT_ALLOWED_TO_DELETE_USERS":
    case "YOU_ARE_NOT_ALLOWED_TO_SET_USERS_PASSWORD":
    case "YOU_ARE_NOT_ALLOWED_TO_GET_USER":
    case "YOU_ARE_NOT_ALLOWED_TO_UPDATE_USERS":
    case "FAILED_TO_UNLINK_LAST_ACCOUNT":
    case "CROSS_SITE_NAVIGATION_LOGIN_BLOCKED":
    case "METHOD_NOT_ALLOWED_DEFER_SESSION_REQUIRED":
      throw new ForbiddenError()

    // --- FORBIDDEN / RBAC — organization & team operations ---
    case "YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_ORGANIZATION":
    case "YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_ORGANIZATION":
    case "YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_ORGANIZATION":
    case "YOU_ARE_NOT_ALLOWED_TO_ACCESS_THIS_ORGANIZATION":
    case "YOU_ARE_NOT_A_MEMBER_OF_THIS_ORGANIZATION":
    case "USER_IS_NOT_A_MEMBER_OF_THE_ORGANIZATION":
    case "YOU_ARE_NOT_ALLOWED_TO_INVITE_USERS_TO_THIS_ORGANIZATION":
    case "YOU_ARE_NOT_ALLOWED_TO_INVITE_USER_WITH_THIS_ROLE":
    case "YOU_ARE_NOT_ALLOWED_TO_CANCEL_THIS_INVITATION":
    case "YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION":
    case "INVITER_IS_NO_LONGER_A_MEMBER_OF_THE_ORGANIZATION":
    case "YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_MEMBER":
    case "YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_MEMBER":
    case "YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER":
    case "YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER":
    case "YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_TEAM":
    case "YOU_ARE_NOT_ALLOWED_TO_CREATE_TEAMS_IN_THIS_ORGANIZATION":
    case "YOU_ARE_NOT_ALLOWED_TO_DELETE_TEAMS_IN_THIS_ORGANIZATION":
    case "YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_TEAM":
    case "YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_TEAM":
    case "USER_IS_NOT_A_MEMBER_OF_THE_TEAM":
    case "YOU_CAN_NOT_ACCESS_THE_MEMBERS_OF_THIS_TEAM":
    case "YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_TEAM_MEMBER":
    case "YOU_ARE_NOT_ALLOWED_TO_REMOVE_A_TEAM_MEMBER":
    case "YOU_MUST_BE_IN_AN_ORGANIZATION_TO_CREATE_A_ROLE":
    case "YOU_ARE_NOT_ALLOWED_TO_CREATE_A_ROLE":
    case "YOU_ARE_NOT_ALLOWED_TO_UPDATE_A_ROLE":
    case "YOU_ARE_NOT_ALLOWED_TO_DELETE_A_ROLE":
    case "YOU_ARE_NOT_ALLOWED_TO_READ_A_ROLE":
    case "YOU_ARE_NOT_ALLOWED_TO_LIST_A_ROLE":
    case "YOU_ARE_NOT_ALLOWED_TO_GET_A_ROLE":
    case "CANNOT_DELETE_A_PRE_DEFINED_ROLE":
    case "UNABLE_TO_REMOVE_LAST_TEAM":
      throw new ForbiddenError()

    // --- NOT FOUND — resources ---
    case "ORGANIZATION_NOT_FOUND":
    case "NO_ACTIVE_ORGANIZATION":
    case "MEMBER_NOT_FOUND":
    case "ROLE_NOT_FOUND":
    case "TEAM_NOT_FOUND":
    case "INVITATION_NOT_FOUND":
    case "YOU_DO_NOT_HAVE_AN_ACTIVE_TEAM":
      throw new NotFoundError()

    // --- CONFLICT — resource already exists / limits reached ---
    case "ORGANIZATION_ALREADY_EXISTS":
    case "ORGANIZATION_SLUG_ALREADY_TAKEN":
    case "TEAM_ALREADY_EXISTS":
    case "ROLE_NAME_IS_ALREADY_TAKEN":
    case "ROLE_IS_ASSIGNED_TO_MEMBERS":
    case "USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION":
    case "USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION":
    case "YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS":
    case "YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_TEAMS":
    case "ORGANIZATION_MEMBERSHIP_LIMIT_REACHED":
    case "INVITATION_LIMIT_REACHED":
    case "TEAM_MEMBER_LIMIT_REACHED":
    case "TOO_MANY_ROLES":
      throw new ConflictError()

    // --- VALIDATION / BAD INPUT ---
    case "NO_DATA_TO_UPDATE":
    case "INVALID_ROLE_TYPE":
    case "YOU_ARE_NOT_ALLOWED_TO_SET_NON_EXISTENT_VALUE":
    case "EMAIL_CAN_NOT_BE_UPDATED":
    case "EMAIL_MISMATCH":
    case "FIELD_NOT_ALLOWED":
    case "MISSING_FIELD":
    case "BODY_MUST_BE_AN_OBJECT":
    case "INVALID_RESOURCE":
      throw new ValidationError()

    // --- INFRASTRUCTURE FAILURES ---
    case "FAILED_TO_CREATE_USER":
    case "FAILED_TO_CREATE_SESSION":
    case "FAILED_TO_UPDATE_USER":
    case "FAILED_TO_GET_SESSION":
    case "FAILED_TO_GET_USER_INFO":
    case "FAILED_TO_CREATE_VERIFICATION":
    case "FAILED_TO_RETRIEVE_INVITATION":
    case "ASYNC_VALIDATION_NOT_SUPPORTED":
      throw new InternalServerError()

    default:
      throw new AuthConfigurationError()
  }
}
