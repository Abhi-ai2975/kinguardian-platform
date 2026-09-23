/**
 * KinGuardian Platform Domain Error Codes Taxonomy.
 * Consumed by the React Native client for UI error handling, toast alerts, and automatic recovery flows.
 */

export interface ErrorCodeMetadata {
  code: string;
  httpStatus: number;
  userMessage: string;
  actionableResolution: string;
}

export const ERROR_CODES_TAXONOMY: Record<string, ErrorCodeMetadata> = {
  FAMILY_NOT_FOUND: {
    code: 'FAMILY_NOT_FOUND',
    httpStatus: 404,
    userMessage: 'The requested family care circle was not found.',
    actionableResolution: 'Verify your invitation link or select a different care circle from your profile.'
  },
  SUBJECT_NOT_FOUND: {
    code: 'SUBJECT_NOT_FOUND',
    httpStatus: 404,
    userMessage: 'The selected care recipient profile was not found.',
    actionableResolution: 'Refresh your family dashboard or contact your primary coordinator.'
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    httpStatus: 403,
    userMessage: 'You do not have permission to perform this action in this care circle.',
    actionableResolution: 'Request upgraded care permissions from the family coordinator.'
  },
  CONSENT_REQUIRED: {
    code: 'CONSENT_REQUIRED',
    httpStatus: 403,
    userMessage: 'Explicit patient or coordinator consent is required to view these clinical records.',
    actionableResolution: 'Navigate to the Consent Governance tab to grant health record access.'
  },
  CONSENT_EXPIRED: {
    code: 'CONSENT_EXPIRED',
    httpStatus: 403,
    userMessage: 'The consent authorization window for this resource has expired.',
    actionableResolution: 'Request a renewed consent grant from the patient.'
  },
  MEDICATION_NOT_ACTIVE: {
    code: 'MEDICATION_NOT_ACTIVE',
    httpStatus: 400,
    userMessage: 'This medication schedule is no longer active.',
    actionableResolution: 'Sync with latest EMR prescriptions from the Doctor Visits tab.'
  },
  APPOINTMENT_NOT_FOUND: {
    code: 'APPOINTMENT_NOT_FOUND',
    httpStatus: 404,
    userMessage: 'The clinical appointment record could not be found.',
    actionableResolution: 'Check your upcoming appointments list for the latest schedule.'
  },
  DOCUMENT_NOT_READY: {
    code: 'DOCUMENT_NOT_READY',
    httpStatus: 422,
    userMessage: 'The document is currently undergoing AI OCR processing.',
    actionableResolution: 'Wait a few moments for background processing to finish and refresh.'
  },
  AI_ACTION_REQUIRES_APPROVAL: {
    code: 'AI_ACTION_REQUIRES_APPROVAL',
    httpStatus: 403,
    userMessage: 'This autonomous AI recommendation requires explicit human confirmation.',
    actionableResolution: 'Review and approve or reject the action in the Guardian Moments tab.'
  },
  RATE_LIMITED: {
    code: 'RATE_LIMITED',
    httpStatus: 429,
    userMessage: 'You have made too many requests in a short period.',
    actionableResolution: 'Please slow down and try again in a few seconds.'
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    httpStatus: 401,
    userMessage: 'Your session has expired or is invalid.',
    actionableResolution: 'Log in again via IAM authentication handoff.'
  },
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    httpStatus: 422,
    userMessage: 'The submitted information is incomplete or formatted incorrectly.',
    actionableResolution: 'Check the required input fields and resubmit.'
  },
  CIRCUIT_BREAKER_OPEN: {
    code: 'CIRCUIT_BREAKER_OPEN',
    httpStatus: 503,
    userMessage: 'Clinical backend service is temporarily experiencing high latency.',
    actionableResolution: 'Operating in degraded mode with cached data. Live sync will resume automatically.'
  },
  INTERNAL_SERVER_ERROR: {
    code: 'INTERNAL_SERVER_ERROR',
    httpStatus: 500,
    userMessage: 'An unexpected system error occurred.',
    actionableResolution: 'Please try again later or share the Request ID with support.'
  }
};
