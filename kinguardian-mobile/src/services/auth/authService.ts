import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../../constants/config';

export const STORAGE_KEY_ACCESS_TOKEN = 'kinguardian_access_token';
export const STORAGE_KEY_REFRESH_TOKEN = 'kinguardian_refresh_token';
export const STORAGE_KEY_USER = 'kinguardian_user';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
  role: 'coordinator' | 'parent' | 'caregiver' | 'observer';
  permissions: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthSession {
  user: AuthUser;
  tokens: AuthTokens;
}

export type AuthChangeListener = (session: AuthSession | null) => void;

class AuthService {
  private inMemoryAccessToken: string | null = null;
  private isRefreshing: boolean = false;
  private refreshSubscribers: Array<(token: string | null) => void> = [];
  private authChangeListeners: AuthChangeListener[] = [];

  public onAuthChange(listener: AuthChangeListener): () => void {
    this.authChangeListeners.push(listener);
    return () => {
      this.authChangeListeners = this.authChangeListeners.filter((l) => l !== listener);
    };
  }

  private notifyAuthChange(session: AuthSession | null) {
    this.authChangeListeners.forEach((listener) => {
      try {
        listener(session);
      } catch (e) {
        console.warn('Auth change listener error:', e);
      }
    });
  }

  private getApiUrl(): string {
    return CONFIG.apiUrl.replace(/\/+$/, '');
  }

  private isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4 !== 0) {
        base64 += '=';
      }
      let jsonStr = '';
      if (typeof atob === 'function') {
        jsonStr = atob(base64);
      } else if (typeof Buffer !== 'undefined') {
        jsonStr = Buffer.from(base64, 'base64').toString('utf-8');
      } else {
        return false;
      }
      const payload = JSON.parse(jsonStr);
      if (!payload.exp) return false;
      // Expired if current time >= exp - 30 seconds buffer
      return Date.now() >= payload.exp * 1000 - 30000;
    } catch {
      return true;
    }
  }

  public async getAccessToken(): Promise<string | null> {
    let token = this.inMemoryAccessToken;
    if (!token) {
      token = await AsyncStorage.getItem(STORAGE_KEY_ACCESS_TOKEN);
      this.inMemoryAccessToken = token;
    }
    if (!token) {
      return null;
    }

    if (this.isTokenExpired(token)) {
      console.log('Access token has expired, refreshing...');
      const newToken = await this.refreshToken();
      return newToken;
    }

    return token;
  }

  public async handle401(): Promise<string | null> {
    const refreshed = await this.refreshToken();
    if (!refreshed) {
      await this.clearSession();
    }
    return refreshed;
  }

  public async getRefreshToken(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEY_REFRESH_TOKEN);
  }

  public async getStoredUser(): Promise<AuthUser | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_USER);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public async getStoredSession(): Promise<AuthSession | null> {
    const accessToken = await this.getAccessToken();
    const refreshToken = await this.getRefreshToken();
    const user = await this.getStoredUser();

    if (!accessToken || !user) {
      return null;
    }

    return {
      user,
      tokens: {
        accessToken,
        refreshToken: refreshToken || '',
        expiresIn: 7200
      }
    };
  }

  public async storeSession(
    tokens: { access_token: string; refresh_token: string; expires_in?: number },
    userData: any,
    roleOverride?: string,
    permissionsOverride?: string[]
  ): Promise<AuthSession> {
    const userRole = (roleOverride || userData?.role || 'coordinator') as AuthUser['role'];
    const permissions = permissionsOverride || userData?.permissions || [];

    const user: AuthUser = {
      id: userData?.id || userData?.sub || 'user-id',
      email: userData?.email || '',
      displayName: userData?.display_name || userData?.name || 'KinGuardian User',
      timezone: userData?.timezone || userData?.zoneinfo || 'Asia/Kolkata',
      role: userRole,
      permissions
    };

    this.inMemoryAccessToken = tokens.access_token;

    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, tokens.access_token),
      AsyncStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, tokens.refresh_token),
      AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user))
    ]);

    const session: AuthSession = {
      user,
      tokens: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in || 7200
      }
    };

    this.notifyAuthChange(session);
    return session;
  }

  public async clearSession(): Promise<void> {
    try {
      this.inMemoryAccessToken = null;
      this.isRefreshing = false;
      this.refreshSubscribers = [];
      
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEY_ACCESS_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEY_REFRESH_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEY_USER)
      ]);
      
      this.notifyAuthChange(null);
      console.log('Session cleared successfully');
    } catch (error) {
      console.error('Error clearing session:', error);
      throw error;
    }
  }

  public async logout(): Promise<void> {
    try {
      const token = await this.getAccessToken();
      if (token) {
        try {
          await fetch(`${this.getApiUrl()}/api/v1/auth/logout`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Accept: 'application/json'
            }
          });
        } catch (apiErr) {
          console.warn('Backend logout call failed, proceeding to clear local session:', apiErr);
        }
      }
    } catch (err) {
      console.warn('Error during logout:', err);
    } finally {
      await this.clearSession();
    }
  }

  public async revokeToken(): Promise<void> {
    try {
      const token = await this.getAccessToken();
      if (token) {
        try {
          await fetch(`${this.getApiUrl()}/api/v1/auth/revoke`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Accept: 'application/json'
            },
            body: JSON.stringify({ token })
          });
        } catch (apiErr) {
          console.warn('Backend revoke call failed, proceeding to clear local session:', apiErr);
        }
      }
    } catch (err) {
      console.warn('Error during token revocation:', err);
    } finally {
      await this.clearSession();
    }
  }

  public async login(email: string, password: string): Promise<AuthSession> {
    const cleanEmail = email.trim().toLowerCase();
    const url = `${this.getApiUrl()}/api/v1/auth/login`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        email: cleanEmail,
        password
      })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const detail = errJson?.detail || errJson?.error?.message || 'Invalid email or password';
      throw new Error(detail);
    }

    const data = await res.json();
    return await this.storeSession(
      {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in
      },
      data.user,
      data.role,
      data.permissions
    );
  }

  public async register(
    name: string,
    email: string,
    password: string,
    role: 'coordinator' | 'parent' | 'caregiver' | 'observer' = 'coordinator',
    timezone: string = 'Asia/Kolkata'
  ): Promise<AuthSession> {
    const cleanEmail = email.trim().toLowerCase();
    const url = `${this.getApiUrl()}/api/v1/auth/register`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        name: name.trim(),
        email: cleanEmail,
        password,
        role,
        timezone
      })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const detail = errJson?.detail || errJson?.error?.message || 'Registration failed';
      throw new Error(detail);
    }

    const data = await res.json();
    return await this.storeSession(
      {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in
      },
      data.user,
      data.role,
      data.permissions
    );
  }

  public async exchangeIamToken(iamToken: string): Promise<AuthSession> {
    const url = `${this.getApiUrl()}/api/v1/auth/iam-token`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        token: iamToken.trim()
      })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const detail = errJson?.detail || 'IAM token exchange failed';
      throw new Error(detail);
    }

    const data = await res.json();
    return await this.storeSession(
      {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in
      },
      data.user,
      data.role,
      data.permissions
    );
  }

  public async refreshToken(): Promise<string | null> {
    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.refreshSubscribers.push(resolve);
      });
    }

    this.isRefreshing = true;
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        await this.clearSession();
        this.isRefreshing = false;
        this.onTokenRefreshed(null);
        return null;
      }

      const res = await fetch(`${this.getApiUrl()}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (!res.ok) {
        await this.clearSession();
        this.isRefreshing = false;
        this.onTokenRefreshed(null);
        return null;
      }

      const data = await res.json();
      this.inMemoryAccessToken = data.access_token;
      await AsyncStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, data.access_token);
      if (data.refresh_token) {
        await AsyncStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, data.refresh_token);
      }

      this.isRefreshing = false;
      this.onTokenRefreshed(data.access_token);
      return data.access_token;
    } catch {
      await this.clearSession();
      this.isRefreshing = false;
      this.onTokenRefreshed(null);
      return null;
    }
  }

  private onTokenRefreshed(token: string | null) {
    this.refreshSubscribers.forEach((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  public async getMe(): Promise<{
    profile: any;
    role: AuthUser['role'];
    permissions: string[];
    memberships: any[];
    grants: any[];
  }> {
    const token = await this.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const res = await fetch(`${this.getApiUrl()}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });

    if (!res.ok) {
      if (res.status === 401) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          return await this.getMe();
        }
      }
      throw new Error('Failed to fetch user context');
    }

    const data = await res.json();

    // Refresh stored user info with authoritative server data
    const existingUser = await this.getStoredUser();
    if (existingUser) {
      const updatedUser: AuthUser = {
        ...existingUser,
        displayName: data.profile?.display_name || existingUser.displayName,
        email: data.profile?.email || existingUser.email,
        role: data.role || existingUser.role,
        permissions: data.permissions || existingUser.permissions
      };
      await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updatedUser));
    }

    return data;
  }
}

export const authService = new AuthService();
