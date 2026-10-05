/* eslint-disable */
/**
 * DrGodly Typed Mobile API Client.
 * Automatically wraps KinGuardian REST API endpoints with typed contracts,
 * automatic Bearer token injection, correlation tracking, and idempotency support.
 */

import {
  UUID,
  ErrorResponse,
  FamilyMembership,
  CareSubjectResponse,
  ConsentGrantRequest,
  ConsentResponse,
  HealthCheckResponse
} from './types';


import { authService } from '../auth/authService';

export class DrGodlyApiError extends Error {
  public readonly code: string;
  public readonly requestId: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, any> | null;

  constructor(statusCode: number, error: ErrorResponse['error']) {
    super(error.message);
    this.name = 'DrGodlyApiError';
    this.statusCode = statusCode;
    this.code = error.code;
    this.requestId = error.request_id;
    this.details = error.details;
  }
}

export interface ClientConfig {
  baseUrl: string;
  authToken?: string;
  getAuthToken?: () => Promise<string | null>;
  timeoutMs?: number;
}

export class DrGodlyApiClient {
  private baseUrl: string;
  private authToken: string | null = null;
  private getAuthTokenFn?: () => Promise<string | null>;
  private timeoutMs: number;

  constructor(config: ClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.authToken = config.authToken || null;
    this.getAuthTokenFn = config.getAuthToken || (() => authService.getAccessToken());
    this.timeoutMs = config.timeoutMs || 15000;
  }

  public setAuthToken(token: string | null) {
    this.authToken = token;
  }

  private async getActiveToken(): Promise<string | null> {
    if (this.getAuthTokenFn) {
      return await this.getAuthTokenFn();
    }
    return this.authToken;
  }

  private async request<T>(
    method: string,
    path: string,
    options: {
      body?: any;
      params?: Record<string, string>;
      idempotencyKey?: string;
      customHeaders?: Record<string, string>;
    } = {}
  ): Promise<T> {
    const token = await this.getActiveToken();
    let url = `${this.baseUrl}${path.startsWith('/') ? path : '/' + path}`;

    if (options.params) {
      const searchParams = new URLSearchParams(options.params);
      url += `?${searchParams.toString()}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Request-ID': this.generateUUID(),
      ...options.customHeaders
    };

    if (process.env.EXPO_PUBLIC_ENVIRONMENT === 'development' && !token) {
      headers['X-Actor-Subject'] = process.env.EXPO_PUBLIC_ACTOR_SUBJECT || 'iam_anjali_london_001';
      headers['X-Actor-Email'] = process.env.EXPO_PUBLIC_ACTOR_EMAIL || 'anjali.coordinator@example.com';
      headers['X-Actor-Name'] = process.env.EXPO_PUBLIC_ACTOR_NAME || 'Authenticated User';
      headers['X-Actor-Timezone'] = process.env.EXPO_PUBLIC_ACTOR_TIMEZONE || 'Europe/London';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (json && json.error) {
          throw new DrGodlyApiError(res.status, json.error);
        }
        throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
      }

      return json as T;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeoutMs}ms`);
      }
      throw err;
    }
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private isUUID(val?: string | null): boolean {
    if (!val) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  }

  // Domain API Modules

  public readonly system = {
    liveness: () => this.request<HealthCheckResponse>('GET', '/health'),
    readiness: () => this.request<HealthCheckResponse>('GET', '/health/ready'),
    stats: () => this.request<any>('GET', '/api/v1/db/stats')
  };

  public readonly families = {
    list: () => this.request<any[]>('GET', '/api/v1/families'),
    create: (data: { name: string; home_timezone?: string }) =>
      this.request<any>('POST', '/api/v1/families', { body: data }),
    getDashboard: (familyId: UUID) =>
      this.request<any>('GET', `/api/v1/families/${familyId}/dashboard`),
    getHome: (familyId: UUID) =>
      this.request<any>('GET', `/api/v1/families/${familyId}/home`),
    listMembers: (familyId: UUID) =>
      this.request<FamilyMembership[]>('GET', `/api/v1/families/${familyId}/members`),
    getById: (familyId: UUID) =>
      this.request<any>('GET', `/api/v1/families/${familyId}`),
    addMember: (familyId: UUID, data: { profile_id?: UUID; email?: string; name?: string; role: string }) =>
      this.request<any>('POST', `/api/v1/families/${familyId}/members`, { body: data }),
    getAudit: (familyId: UUID) =>
      this.request<any[]>('GET', `/api/v1/families/${familyId}/audit`)
  };

  public readonly subjects = {
    getSummary: (familyId: UUID, subjectId: UUID) =>
      this.request<any>('GET', `/api/v1/families/${familyId}/subjects/${subjectId}/summary`),
    getEmergencySummary: (subjectId: UUID) =>
      this.request<any>('GET', `/api/v1/subjects/${subjectId}/emergency-summary`),
    listGrants: (familyId: UUID, subjectId: UUID) =>
      this.request<any[]>('GET', `/api/v1/families/${familyId}/subjects/${subjectId}/access-grants`),
    listConsents: (familyId: UUID, subjectId: UUID) =>
      this.request<any[]>('GET', `/api/v1/families/${familyId}/subjects/${subjectId}/consents`),
    list: (familyId: UUID) =>
      this.request<CareSubjectResponse[]>('GET', `/api/v1/families/${familyId}/subjects`),
    create: (familyId: UUID, data: any, idempotencyKey?: string) =>
      this.request<CareSubjectResponse>('POST', `/api/v1/families/${familyId}/subjects`, {
        body: data,
        idempotencyKey
      })
  };

  public readonly medications = {
    confirm: (req: any, idempotencyKey?: string) =>
      this.request<any>('POST', '/api/v1/medications/confirm', {
        body: req,
        idempotencyKey
      }),
    remind: (medicationId: string, req?: any) =>
      this.request<any>('POST', `/api/v1/medications/${encodeURIComponent(medicationId)}/remind`, {
        body: req || { medication_id: medicationId }
      }),
    listAdherence: (familyId: UUID, subjectId?: UUID) => {
      const validSub = this.isUUID(subjectId) ? subjectId : undefined;
      return this.request<any[]>(
        'GET',
        validSub
          ? `/api/v1/families/${familyId}/subjects/${validSub}/medication-adherence`
          : `/api/v1/families/${familyId}/medication-adherence`
      );
    }
  };

  public readonly checkins = {
    submit: (req: any, idempotencyKey?: string) =>
      this.request<any>('POST', '/api/v1/checkins', {
        body: {
          subject_id: req.subject_id,
          feeling: req.feeling || req.mood,
          notes: req.notes || req.note,
          severity: req.severity || 'normal'
        },
        idempotencyKey
      }),
    list: (familyId: UUID, subjectId?: UUID) => {
      const validSub = this.isUUID(subjectId) ? subjectId : undefined;
      return this.request<any[]>(
        'GET',
        validSub
          ? `/api/v1/families/${familyId}/subjects/${validSub}/checkins`
          : `/api/v1/families/${familyId}/checkins`
      );
    }
  };

  public readonly careTasks = {
    list: (familyId: UUID, subjectId?: UUID) => {
      const validSub = this.isUUID(subjectId) ? subjectId : undefined;
      return this.request<any[]>(
        'GET',
        validSub
          ? `/api/v1/families/${familyId}/subjects/${validSub}/care-tasks`
          : `/api/v1/families/${familyId}/care-tasks`
      );
    },
    create: (req: any, idempotencyKey?: string) =>
      this.request<any>('POST', '/api/v1/care/tasks', {
        body: req,
        idempotencyKey
      }),
    complete: (taskId: UUID, actorId?: UUID, idempotencyKey?: string) =>
      this.request<any>('POST', `/api/v1/care/tasks/${taskId}/complete`, {
        body: actorId ? { actor_id: actorId } : {},
        idempotencyKey
      })
  };

  public readonly documents = {
    list: (familyId: UUID, subjectId?: UUID) => {
      const validSub = this.isUUID(subjectId) ? subjectId : undefined;
      return this.request<any[]>(
        'GET',
        validSub
          ? `/api/v1/families/${familyId}/subjects/${validSub}/documents`
          : `/api/v1/families/${familyId}/documents`
      );
    },
    create: (data: { family_id: UUID; subject_id: UUID; filenest_file_id: string; classification?: string }, idempotencyKey?: string) =>
      this.request<any>('POST', '/api/v1/documents', {
        body: data,
        idempotencyKey
      })
  };

  public readonly conversations = {
    getOrCreate: (familyId: UUID, subjectId?: UUID) => {
      const validSub = this.isUUID(subjectId) ? subjectId : undefined;
      const path = validSub
        ? `/api/v1/families/${familyId}/conversations?subject_id=${validSub}`
        : `/api/v1/families/${familyId}/conversations`;
      return this.request<any>('GET', path);
    },
    listMessages: (familyId: UUID, conversationId: UUID) =>
      this.request<any[]>('GET', `/api/v1/families/${familyId}/conversations/${conversationId}/messages`),
    sendMessage: (familyId: UUID, conversationId: UUID, body: string) =>
      this.request<any>('POST', `/api/v1/families/${familyId}/conversations/${conversationId}/messages`, {
        body: { body }
      }),
    sendAIMessage: (conversationId: UUID, body: string, customHeaders?: Record<string, string>) =>
      this.request<any>('POST', `/api/v1/ai/conversations/${conversationId}/messages`, {
        body: { body },
        customHeaders
      }),
    create: (data: { family_id: UUID; subject_id?: UUID; title?: string }) =>
      this.request<any>('POST', '/api/v1/conversations', {
        body: data
      })
  };

  public readonly ai = {
    query: (conversationId: UUID, query: string, subjectId?: UUID) =>
      this.request<any>('POST', '/api/v1/ai/query', {
        body: {
          conversation_id: conversationId,
          query: query,
          subject_id: subjectId
        }
      })
  };

  public readonly notifications = {
    list: (familyId: UUID) =>
      this.request<any[]>('GET', `/api/v1/families/${familyId}/notifications`),
    create: (familyIdOrData: any, maybeData?: any) => {
      const data = maybeData || familyIdOrData;
      return this.request<any>('POST', '/api/v1/notifications', {
        body: data
      });
    },
    markRead: (notificationId: UUID) =>
      this.request<any>('PATCH', `/api/v1/notifications/${notificationId}/read`),
    clearAll: (familyId: UUID) =>
      this.request<any>('DELETE', `/api/v1/families/${familyId}/notifications`)
  };

  public readonly insights = {
    list: (familyId: UUID) =>
      this.request<any[]>('GET', `/api/v1/families/${familyId}/insights`),
    getHealthMetrics: (subjectId: UUID) =>
      this.request<any>('GET', `/api/v1/health/metrics?subject_id=${subjectId}`)
  };

  public readonly consents = {
    list: (familyId?: UUID, subjectId?: UUID) => {
      if (familyId && subjectId && this.isUUID(subjectId)) {
        return this.request<any[]>('GET', `/api/v1/families/${familyId}/subjects/${subjectId}/consents`);
      }
      return this.request<any[]>('GET', '/api/v1/consents');
    },
    grant: (req: ConsentGrantRequest, idempotencyKey?: string) =>
      this.request<ConsentResponse>('POST', '/api/v1/consents', {
        body: req,
        idempotencyKey
      }),
    revoke: (consentId: UUID, idempotencyKey?: string) =>
      this.request<ConsentResponse>('POST', `/api/v1/consents/${consentId}/revoke`, {
        idempotencyKey
      })
  };

  public readonly appointments = {
    list: (familyId: UUID, subjectId?: UUID) => {
      const validSub = this.isUUID(subjectId) ? subjectId : undefined;
      return this.request<any[]>('GET', validSub
        ? `/api/v1/families/${familyId}/subjects/${validSub}/appointments`
        : `/api/v1/families/${familyId}/appointments`);
    },
    create: (familyId: UUID, subjectId: UUID, data: any) =>
      this.request<any>('POST', `/api/v1/appointments`, {
        body: { ...data, family_id: familyId, subject_id: subjectId }
      })
  };
}
