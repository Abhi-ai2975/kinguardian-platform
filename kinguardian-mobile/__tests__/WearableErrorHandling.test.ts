/**
 * Wearable Error Handling Mobile Unit Tests.
 *
 * Verifies that when the backend or Open Wearables returns WEARABLE_SERVICE_UNAVAILABLE,
 * the mobile application presents the reassuring, non-alarming user message:
 * “We couldn't update your health data right now. Your connection is still intact.”
 */

import {
  WEARABLE_ERROR_CODE,
  getWearableErrorMessage
} from '../src/services/health/types';


describe('Wearable Error Handling on Mobile', () => {
  it('maps WEARABLE_SERVICE_UNAVAILABLE to reassuring user copy', () => {
    expect(WEARABLE_ERROR_CODE.WEARABLE_SERVICE_UNAVAILABLE).toBe('WEARABLE_SERVICE_UNAVAILABLE');
    
    const message = getWearableErrorMessage('WEARABLE_SERVICE_UNAVAILABLE');
    expect(message).toBe("We couldn't update your health data right now. Your connection is still intact.");
  });

  it('safely falls back to connection intact message on unknown error code', () => {
    const fallbackMessage = getWearableErrorMessage('INTERNAL_UPSTREAM_UNKNOWN');
    expect(fallbackMessage).toBe("We couldn't update your health data right now. Your connection is still intact.");
  });
});
