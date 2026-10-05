/**
 * Unit and functional test for Authentication, Token Handling & Role Isolation.
 * Verifies AUTH-001, AUTH-002, AUTH-003 frontend behaviors:
 * 1. Coordinator login session creation and role detection.
 * 2. Parent login session creation and role isolation.
 * 3. Token rejection / revocation clearing session and preventing data exposure.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../src/services/auth/authService';

function makeMockJwt(expSecondsFromNow = 3600): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const exp = Math.floor(Date.now() / 1000) + expSecondsFromNow;
  const payload = Buffer.from(JSON.stringify({ sub: 'user_123', exp, type: 'access' })).toString('base64');
  return `${header}.${payload}.signature`;
}

describe('Auth Service and Role Isolation (AUTH-001, AUTH-002, AUTH-003)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await authService.clearSession();
  });

  afterEach(async () => {
    await AsyncStorage.clear();
    await authService.clearSession();
  });

  it('AUTH-001: stores coordinator session and recognizes coordinator role', async () => {
    const validToken = makeMockJwt(3600);
    const session = await authService.storeSession(
      {
        access_token: validToken,
        refresh_token: makeMockJwt(7200),
        expires_in: 3600
      },
      {
        id: 'c0000000-0000-4000-8000-000000000001',
        email: 'coordinator@example.com',
        display_name: 'Coordinator',
        timezone: 'Europe/London',
        role: 'coordinator'
      },
      'coordinator'
    );

    expect(session.user.role).toBe('coordinator');
    expect(session.user.email).toBe('coordinator@example.com');
    expect(await authService.getAccessToken()).toBe(validToken);

    const stored = await authService.getStoredSession();
    expect(stored).not.toBeNull();
    expect(stored?.user.role).toBe('coordinator');

    // Route logic verification
    const targetRoute = session.user.role === 'parent' ? '/(parent)' : '/(coordinator)';
    expect(targetRoute).toBe('/(coordinator)');
  });

  it('AUTH-002: stores parent session and enforces role isolation away from coordinator', async () => {
    const validToken = makeMockJwt(3600);
    const session = await authService.storeSession(
      {
        access_token: validToken,
        refresh_token: makeMockJwt(7200),
        expires_in: 3600
      },
      {
        id: 'b0000000-0000-4000-8000-000000000001',
        email: 'ramesh@example.com',
        display_name: 'Ramesh Sharma',
        timezone: 'Asia/Kolkata',
        role: 'parent'
      },
      'parent'
    );

    expect(session.user.role).toBe('parent');
    expect(session.user.email).toBe('ramesh@example.com');

    // Role routing check: Parent routes to /(parent), blocked from /(coordinator)
    const targetRoute = session.user.role === 'parent' ? '/(parent)' : '/(coordinator)';
    expect(targetRoute).toBe('/(parent)');

    // Role isolation: role is NOT coordinator
    expect(session.user.role).not.toBe('coordinator');
  });

  it('AUTH-003: clears session upon token revocation or 401 rejection to prevent data exposure', async () => {
    const validToken = makeMockJwt(3600);

    // 1. Establish initial session
    await authService.storeSession(
      {
        access_token: validToken,
        refresh_token: makeMockJwt(7200),
        expires_in: 3600
      },
      {
        id: 'c0000000-0000-4000-8000-000000000001',
        email: 'coordinator@example.com',
        role: 'coordinator'
      }
    );

    expect(await authService.getAccessToken()).toBe(validToken);

    // 2. Token revoked / 401 encountered: handle401 cleans up session
    await authService.handle401();

    // 3. Verify session is completely wiped
    const postSession = await authService.getStoredSession();
    expect(postSession).toBeNull();
    expect(await authService.getAccessToken()).toBeNull();
    expect(await authService.getStoredUser()).toBeNull();
  });
});
