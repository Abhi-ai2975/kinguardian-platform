/* eslint-disable */
/**
 * DrGodly Typed Mobile API Client.
 * Automatically wraps KinGuardian REST API endpoints with typed contracts,
 * automatic Bearer token injection, correlation tracking, and idempotency support.
 */

import {
  UUID,
  ErrorResponse,
  FamilyResponse,
  CareSubjectResponse,
  MedicationConfirmRequest,
  MedicationAdherenceResponse,
  WellbeingCheckinCreate,
  WellbeingCheckinResponse,
  CareTaskCreate,
  CareTaskResponse,
  ConsentGrantRequest,
  ConsentResponse,
  HealthCheckResponse
} from './types';

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
    this.getAuthTokenFn = config.getAuthToken;
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

  // Domain API Modules

  public readonly system = {
    liveness: () => this.request<HealthCheckResponse>('GET', '/health'),
    readiness: () => this.request<HealthCheckResponse>('GET', '/health/ready')
  };

  public readonly families = {
    getDashboard: (familyId: UUID) =>
      this.request<any>('GET', `/api/v1/families/${familyId}/dashboard`),
    listMembers: (familyId: UUID) =>
      this.request<FamilyMembership[]>('GET', `/api/v1/families/${familyId}/members`)
  };

  public readonly subjects = {
    getSummary: (familyId: UUID, subjectId: UUID) =>
      this.request<any>('GET', `/api/v1/families/${familyId}/subjects/${subjectId}/summary`),
    list: (familyId: UUID) =>
      this.request<CareSubjectResponse[]>('GET', `/api/v1/families/${familyId}/subjects`)
  };

  public readonly medications = {
    confirm: (req: MedicationConfirmRequest, idempotencyKey?: string) =>
      this.request<MedicationAdherenceResponse>('POST', '/api/v1/parent/medication/confirm', {
        body: req,
        idempotencyKey
      })
  };

  public readonly checkins = {
    submit: (req: WellbeingCheckinCreate, idempotencyKey?: string) =>
      this.request<WellbeingCheckinResponse>('POST', '/api/v1/parent/checkin', {
        body: req,
        idempotencyKey
      })
  };

  public readonly careTasks = {
    create: (req: CareTaskCreate, idempotencyKey?: string) =>
      this.request<CareTaskResponse>('POST', '/api/v1/care-tasks', {
        body: req,
        idempotencyKey
      }),
    complete: (taskId: UUID, actorId: UUID, idempotencyKey?: string) =>
      this.request<CareTaskResponse>('PATCH', `/api/v1/care-tasks/${taskId}/complete`, {
        body: { actor_id: actorId },
        idempotencyKey
      })
  };

  public readonly consents = {
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
}
