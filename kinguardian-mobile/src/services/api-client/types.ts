/* eslint-disable */
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

export interface CareSubjectCreate {
  fhir_patient_id: string;
  profile_id?: UUID | null;
  relationship_to_coordinator?: string | null;
  city?: string | null;
  country_code?: string | null;
  timezone?: string | null;
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
  status: 'active' | 'inactive' | 'revoked' | 'expired';
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

export interface DeviceConnection {
  id: string;
  provider: string;
  status: 'active' | 'inactive' | 'pending' | 'error';
  provider_user_id?: string | null;
  last_synced_at?: ISODateTime | null;
  capabilities?: Record<string, any>;
}

export interface DeviceConnectUrl {
  provider: string;
  connect_url?: string | null;
  invitation_code?: string | null;
  sdk_token?: string | null;
  expires_at?: ISODateTime | null;
}

export interface WearableActivitySummary {
  date: string;
  steps: number;
  active_duration_minutes: number;
  calories_burned_kcal?: number | null;
  distance_meters?: number | null;
  source_provider?: string | null;
}

export interface WearableSleepSummary {
  date: string;
  total_sleep_minutes: number;
  deep_sleep_minutes?: number | null;
  light_sleep_minutes?: number | null;
  rem_sleep_minutes?: number | null;
  awake_minutes?: number | null;
  sleep_score?: number | null;
  efficiency_percentage?: number | null;
  source_provider?: string | null;
}

export interface WearableRecoverySummary {
  date: string;
  resting_heart_rate_bpm?: number | null;
  hrv_ms?: number | null;
  spo2_percentage?: number | null;
  skin_temperature_celsius?: number | null;
  recovery_score?: number | null;
  source_provider?: string | null;
}

export interface WearableDashboardResponse {
  subject_id: UUID;
  wearable_user_id: string;
  connected_providers: DeviceConnection[];
  latest_activity?: WearableActivitySummary | null;
  latest_sleep?: WearableSleepSummary | null;
  latest_recovery?: WearableRecoverySummary | null;
  weekly_average_steps: number;
  weekly_average_sleep_hours: number;
  baseline_step_goal: number;
  has_activity_anomaly: boolean;
  anomaly_description?: string | null;
}

