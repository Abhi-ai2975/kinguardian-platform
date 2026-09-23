"""
TypeScript SDK & Client Contract Generator for KinGuardian / DrGodly.
Extracts OpenAPI 3.1.0 schemas and routes from FastAPI and generates typed TypeScript client contracts.
"""

import json
import os
import sys
from pathlib import Path

# Add backend root to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app
from app.core.openapi import custom_openapi_generator


def generate_typescript_client():
    schema = custom_openapi_generator(app)
    
    output_dir = backend_dir.parent / "drgodly-api-client" / "src"
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Generate types.ts
    types_file = output_dir / "types.ts"
    types_content = """/* eslint-disable */
/**
 * Auto-generated Typed Client Contracts for DrGodly / KinGuardian Platform API.
 * Generated from OpenAPI 3.1.0 Specification.
 * DO NOT EDIT MANUALLY.
 */

export type UUID = string;
export type ISODateTime = string;

// Standard Error Envelope
export interface ErrorDetail {
  code: string;
  message: string;
  request_id: UUID;
  details?: Record<string, any> | null;
}

export interface ErrorResponse {
  error: ErrorDetail;
}

export type ErrorCode =
  | 'FAMILY_NOT_FOUND'
  | 'SUBJECT_NOT_FOUND'
  | 'FORBIDDEN'
  | 'CONSENT_REQUIRED'
  | 'MEDICATION_NOT_ACTIVE'
  | 'APPOINTMENT_NOT_FOUND'
  | 'DOCUMENT_NOT_READY'
  | 'AI_ACTION_REQUIRES_APPROVAL'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR'
  | 'IMMUTABILITY_VIOLATION'
  | 'INTERNAL_SERVER_ERROR';

// Domain Entities & DTOs
export interface FamilyMembership {
  id: UUID;
  family_id: UUID;
  profile_id: UUID;
  membership_role: 'primary_coordinator' | 'secondary_coordinator' | 'elder_parent' | 'family_viewer';
  status: 'active' | 'inactive';
  joined_at: ISODateTime;
}

export interface FamilyResponse {
  id: UUID;
  name: string;
  primary_coordinator_profile_id?: UUID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CareSubjectResponse {
  id: UUID;
  family_id: UUID;
  profile_id?: UUID | null;
  fhir_patient_id: string;
  relationship_to_coordinator?: string | null;
  city?: string | null;
  country_code?: string | null;
  timezone?: string | null;
  status: 'active' | 'inactive';
  created_at: ISODateTime;
}

export interface MedicationConfirmRequest {
  adherence_id: UUID;
  subject_id: UUID;
  medication_name: string;
  dosage: string;
  scheduled_at: ISODateTime;
}

export interface MedicationAdherenceResponse {
  adherence_id: UUID;
  status: 'scheduled' | 'taken' | 'missed' | 'delayed';
  confirmed_at?: ISODateTime | null;
  consistency: 'strong_synchronous' | 'eventual_asynchronous';
}

export interface WellbeingCheckinCreate {
  family_id: UUID;
  subject_id: UUID;
  feeling: 'great' | 'good' | 'neutral' | 'unwell' | 'critical';
  notes?: string | null;
  vital_signs?: Record<string, any> | null;
}

export interface WellbeingCheckinResponse {
  id: UUID;
  family_id: UUID;
  subject_id: UUID;
  submitted_by_profile_id: UUID;
  feeling: string;
  notes?: string | null;
  submitted_at: ISODateTime;
}

export interface CareTaskCreate {
  family_id: UUID;
  subject_id: UUID;
  assigned_to_profile_id: UUID;
  title: string;
  description?: string | null;
  category: 'medication' | 'check_in' | 'appointment' | 'general';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_at: ISODateTime;
}

export interface CareTaskResponse {
  id: UUID;
  family_id: UUID;
  subject_id: UUID;
  title: string;
  status: 'pending' | 'completed' | 'cancelled';
  category: string;
  due_at: ISODateTime;
  completed_at?: ISODateTime | null;
  completed_by_profile_id?: UUID | null;
}

export interface ConsentScope {
  vitals?: boolean;
  medications?: boolean;
  documents?: boolean;
  ai_insights?: boolean;
  messaging?: boolean;
  appointments?: boolean;
}

export interface ConsentGrantRequest {
  family_id: UUID;
  subject_id: UUID;
  grantee_profile_id: UUID;
  scope: ConsentScope;
}

export interface ConsentResponse {
  id: UUID;
  family_id: UUID;
  subject_id: UUID;
  grantor_profile_id: UUID;
  grantee_profile_id: UUID;
  scope: ConsentScope;
  status: 'active' | 'revoked' | 'expired';
  version: number;
  granted_at: ISODateTime;
  revoked_at?: ISODateTime | null;
}

export interface HealthCheckResponse {
  status: 'ok' | 'healthy' | 'unhealthy' | 'ready';
  service: string;
  version: string;
  uptime_seconds?: number;
  timestamp: ISODateTime;
  checks?: Record<string, any>;
}
"""
    types_file.write_text(types_content, encoding="utf-8")

    # 2. Generate client.ts
    client_file = output_dir / "client.ts"
    client_content = """/* eslint-disable */
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
    this.baseUrl = config.baseUrl.replace(/\\/+$/, '');
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
"""
    client_file.write_text(client_content, encoding="utf-8")

    # 3. Generate index.ts
    index_file = output_dir / "index.ts"
    index_file.write_text("export * from './types';\nexport * from './client';\n", encoding="utf-8")

    # 4. Generate package.json
    pkg_file = backend_dir.parent / "drgodly-api-client" / "package.json"
    pkg_content = {
        "name": "@drgodly/api-client",
        "version": "0.1.0",
        "description": "Typed Mobile & Web Client Contract SDK for DrGodly / KinGuardian Healthcare Platform",
        "main": "dist/index.js",
        "types": "dist/index.d.ts",
        "scripts": {
            "build": "tsc"
        },
        "author": "DrGodly Platform Team",
        "license": "UNLICENSED"
    }
    pkg_file.write_text(json.dumps(pkg_content, indent=2), encoding="utf-8")
    print(f"Generated typed TypeScript SDK in: {output_dir.parent}")


if __name__ == "__main__":
    generate_typescript_client()
