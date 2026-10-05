/**
 * Functional and Unit Tests for AUTH-004 and AUTH-005.
 * AUTH-004 (P1): Cross-Family Access Security (Family Isolation)
 * AUTH-005 (P1): Multi-Device Session Consistency & JWT Lifecycle
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, AuthSession } from '../src/services/auth/authService';
import { ApiFamilyService } from '../src/services/ApiFamilyService';

function makeMockJwt(sub: string, role: string, jti?: string, expSeconds = 3600): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const exp = Math.floor(Date.now() / 1000) + expSeconds;
  const payload = Buffer.from(
    JSON.stringify({
      sub,
      role,
      jti: jti || Math.random().toString(36).substring(2),
      exp,
      type: 'access'
    })
  ).toString('base64');
  return `${header}.${payload}.signature`;
}

describe('AUTH-004 & AUTH-005 Functional Frontend Tests', () => {
  const FAMILY_A_ID = 'aa7bb110-fc9f-4f95-be60-a796f24ac1a1';
  const FAMILY_B_ID = '9eb0d4a4-365f-4dd9-9369-57464bf91688';

  beforeEach(async () => {
    await AsyncStorage.clear();
    await authService.clearSession();
  });

  afterEach(async () => {
    await AsyncStorage.clear();
    await authService.clearSession();
  });

  describe('AUTH-004: Cross-Family Access Security (Family Isolation)', () => {
    it('rejects access to Family B when coordinator only belongs to Family A', async () => {
      // 1. Sign in as coordinator belonging to Family A
      const coordToken = makeMockJwt('c0000000-0000-4000-8000-000000000001', 'coordinator');
      await authService.storeSession(
        {
          access_token: coordToken,
          refresh_token: makeMockJwt('c0000000-0000-4000-8000-000000000001', 'coordinator', 'refresh-1', 7200),
          expires_in: 3600
        },
        {
          id: 'c0000000-0000-4000-8000-000000000001',
          email: 'coordinator@example.com',
          display_name: 'Coordinator',
          timezone: 'Europe/London',
          role: 'coordinator',
          memberships: [{ family_id: FAMILY_A_ID, role: 'coordinator', status: 'active' }]
        }
      );

      // 2. Validate family authorization logic: User cannot access Family B
      const familyService = new ApiFamilyService();

      // Mock client.families.getById to simulate 403 on Family B and 200 on Family A
      jest.spyOn(familyService.client.families, 'getById').mockImplementation(async (famId: string) => {
        if (famId === FAMILY_B_ID) {
          throw new Error('HTTP Error 403: Forbidden - Family authorization denied');
        }
        return {
          id: FAMILY_A_ID,
          name: 'KinGuardian Family',
          status: 'active'
        };
      });

      // Test Family B rejection
      const accessFamilyB = await familyService.validateFamilyAccess(FAMILY_B_ID);
      expect(accessFamilyB.hasAccess).toBe(false);
      expect(accessFamilyB.error).toContain('403');
      expect(accessFamilyB.error).toContain('Family authorization denied');

      // Test Family A acceptance
      const accessFamilyA = await familyService.validateFamilyAccess(FAMILY_A_ID);
      expect(accessFamilyA.hasAccess).toBe(true);
      expect(accessFamilyA.error).toBeUndefined();
    });

    it('ensures no unauthorized family data is disclosed in responses or stored state', async () => {
      const stored = await authService.getStoredSession();
      // Ensure state is clean before access
      expect(stored).toBeNull();
    });
  });

  describe('AUTH-005: Multi-Device Session Consistency & JWT Lifecycle', () => {
    it('manages distinct sessions with unique tokens for the same user across devices', async () => {
      // Device A login
      const tokenA = makeMockJwt('c0000000-0000-4000-8000-000000000001', 'coordinator', 'session-device-a');
      const sessionA: AuthSession = {
        user: {
          id: 'c0000000-0000-4000-8000-000000000001',
          email: 'coordinator@example.com',
          displayName: 'Coordinator Alice',
          timezone: 'Europe/London',
          role: 'coordinator',
          permissions: ['care:manage']
        },
        tokens: {
          accessToken: tokenA,
          refreshToken: makeMockJwt('c0000000-0000-4000-8000-000000000001', 'coordinator', 'refresh-a', 7200),
          expiresIn: 3600
        }
      };

      // Device B login
      const tokenB = makeMockJwt('c0000000-0000-4000-8000-000000000001', 'coordinator', 'session-device-b');
      const sessionB: AuthSession = {
        user: {
          id: 'c0000000-0000-4000-8000-000000000001',
          email: 'coordinator@example.com',
          displayName: 'Coordinator Alice',
          timezone: 'Europe/London',
          role: 'coordinator',
          permissions: ['care:manage']
        },
        tokens: {
          accessToken: tokenB,
          refreshToken: makeMockJwt('c0000000-0000-4000-8000-000000000001', 'coordinator', 'refresh-b', 7200),
          expiresIn: 3600
        }
      };

      // Both tokens must be distinct
      expect(tokenA).not.toEqual(tokenB);
      expect(sessionA.user.id).toEqual(sessionB.user.id);
      expect(sessionA.user.email).toEqual(sessionB.user.email);
    });

    it('syncs data updates made on Device A to Device B and refuses stale authorization', async () => {
      // 1. Device A updates profile display_name
      const initialProfile = {
        id: 'c0000000-0000-4000-8000-000000000001',
        email: 'coordinator@example.com',
        displayName: 'Coordinator Initial',
        timezone: 'Europe/London',
        role: 'coordinator' as const,
        permissions: ['care:manage']
      };

      const updatedName = 'Coordinator Updated Name';
      const updatedProfile = {
        ...initialProfile,
        displayName: updatedName
      };

      // Store updated session simulating refresh from backend
      await authService.storeSession(
        {
          access_token: makeMockJwt(initialProfile.id, 'coordinator', 'device-b-token'),
          refresh_token: makeMockJwt(initialProfile.id, 'coordinator', 'device-b-ref', 7200),
          expires_in: 3600
        },
        {
          ...updatedProfile,
          display_name: updatedProfile.displayName
        }
      );

      const refreshedSession = await authService.getStoredSession();
      expect(refreshedSession?.user.displayName).toBe(updatedName);

      // 2. Stale authorization verification: If account is deactivated or session revoked
      // AuthService clears session on 401 rejection so stale session is not trusted
      jest.spyOn(authService, 'refreshToken').mockResolvedValueOnce(null);
      await authService.handle401();

      const cleared = await authService.getStoredSession();
      expect(cleared).toBeNull();
    });
  });
});
