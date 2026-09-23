import { authService } from '../auth/authService';
import { CONFIG } from '../../constants/config';

export interface RealProfile {
  id: string;
  email: string;
  display_name: string;
  timezone: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface RealFamily {
  id: string;
  name: string;
  home_timezone: string;
  status: string;
  created_at: string;
}

export interface RealMembership {
  id: string;
  family_id: string;
  profile_id: string;
  role: string;
  status: string;
  family_name?: string;
  display_name?: string;
  email?: string;
  name?: string;
  created_at?: string;
}

export interface RealCareSubject {
  id: string;
  family_id: string;
  profile_id: string | null;
  external_patient_ref: string;
  preferred_timezone: string;
  status: string;
  created_at: string;
}

export interface RealCheckIn {
  id: string;
  subject_id: string;
  submitted_by: string;
  mood: string;
  note: string | null;
  severity: string;
  occurred_at: string;
}

export interface RealMedicationAdherence {
  id: string;
  subject_id: string;
  medication_ref: string;
  confirmed_by: string;
  taken_at: string;
  source: string;
}

export interface RealCareTask {
  id: string;
  family_id: string;
  subject_id: string;
  created_by: string;
  assigned_to: string;
  title: string;
  detail: string | null;
  priority: string;
  status: string;
  due_at: string;
  completed_at: string | null;
}

export interface RealNotification {
  id: string;
  family_id: string;
  recipient_id: string;
  event_type: string;
  payload: any;
  read_at: string | null;
  created_at: string;
}

export interface RealInsight {
  id: string;
  family_id: string;
  subject_id: string | null;
  summary: string;
  source: string;
  created_at: string;
}

class RealDataService {
  private getApiUrl(): string {
    return CONFIG.apiUrl;
  }

  private async getAuthHeaders() {
    const token = await authService.getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  async getCurrentUserProfile(): Promise<RealProfile | null> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/auth/me`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch user profile:', response.status, errorText);
        throw new Error(`Failed to fetch user profile: ${response.status}`);
      }

      const data = await response.json();
      return data.profile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  async getUserFamilies(): Promise<RealFamily[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/families`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch families:', response.status, errorText);
        throw new Error(`Failed to fetch families: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching families:', error);
      return [];
    }
  }

  async getFamilyMembers(familyId: string): Promise<RealMembership[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/families/${familyId}/members`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to fetch family members');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching family members:', error);
      return [];
    }
  }

  async createFamily(name: string, homeTimezone: string = 'Asia/Kolkata'): Promise<RealFamily | null> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/families`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name,
          home_timezone: homeTimezone
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create family');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating family:', error);
      return null;
    }
  }

  async getFamilySubjects(familyId: string): Promise<RealCareSubject[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/families/${familyId}/subjects`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        console.error('Failed to fetch care subjects:', response.status);
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching care subjects:', error);
      return [];
    }
  }

  async getCheckIns(familyId?: string, subjectId?: string): Promise<RealCheckIn[]> {
    try {
      const headers = await this.getAuthHeaders();
      let url = `${this.getApiUrl()}/api/v1/checkins`;
      
      if (familyId && subjectId) {
        url = `${this.getApiUrl()}/api/v1/families/${familyId}/subjects/${subjectId}/checkins`;
      } else if (familyId) {
        url = `${this.getApiUrl()}/api/v1/families/${familyId}/checkins`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        console.error('Failed to fetch check-ins:', response.status);
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching check-ins:', error);
      return [];
    }
  }

  async createCheckIn(mood: string, note?: string, severity: string = 'normal', subjectId?: string, _familyId?: string): Promise<RealCheckIn | null> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/checkins`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subject_id: subjectId,
          feeling: mood,
          notes: note,
          severity,
          occurred_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create check-in');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating check-in:', error);
      return null;
    }
  }

  async getMedicationAdherence(familyId?: string, subjectId?: string): Promise<RealMedicationAdherence[]> {
    try {
      const headers = await this.getAuthHeaders();
      let url = `${this.getApiUrl()}/api/v1/medication-adherence`;
      
      if (familyId && subjectId) {
        url = `${this.getApiUrl()}/api/v1/families/${familyId}/subjects/${subjectId}/medication-adherence`;
      } else if (familyId) {
        url = `${this.getApiUrl()}/api/v1/families/${familyId}/medication-adherence`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        console.error('Failed to fetch medication adherence:', response.status);
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching medication adherence:', error);
      return [];
    }
  }

  async confirmMedication(medicationRef: string, taken: boolean = true, subjectId?: string, familyId?: string): Promise<RealMedicationAdherence | null> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/medications/confirm`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          medication_ref: medicationRef,
          taken,
          taken_at: new Date().toISOString(),
          source: 'parent',
          subject_id: subjectId,
          family_id: familyId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to confirm medication');
      }

      return await response.json();
    } catch (error) {
      console.error('Error confirming medication:', error);
      return null;
    }
  }

  async getCareTasks(familyId?: string, subjectId?: string): Promise<RealCareTask[]> {
    try {
      const headers = await this.getAuthHeaders();
      let url = `${this.getApiUrl()}/api/v1/care/tasks`;
      
      if (familyId && subjectId) {
        url = `${this.getApiUrl()}/api/v1/families/${familyId}/subjects/${subjectId}/care-tasks`;
      } else if (familyId) {
        url = `${this.getApiUrl()}/api/v1/families/${familyId}/care-tasks`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        console.error('Failed to fetch care tasks:', response.status);
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching care tasks:', error);
      return [];
    }
  }

  async createCareTask(title: string, detail?: string, priority: string = 'routine', subjectId?: string, familyId?: string): Promise<RealCareTask | null> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/care/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title,
          detail,
          priority,
          subject_id: subjectId,
          family_id: familyId,
          due_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create care task');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating care task:', error);
      return null;
    }
  }

  async getNotifications(familyId?: string): Promise<RealNotification[]> {
    try {
      const headers = await this.getAuthHeaders();
      let url = `${this.getApiUrl()}/api/v1/notifications`;
      
      if (familyId) {
        url = `${this.getApiUrl()}/api/v1/families/${familyId}/notifications`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        console.error('Failed to fetch notifications:', response.status);
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  async createNotification(eventType: string, payload: any, recipientId?: string, familyId?: string): Promise<RealNotification | null> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/notifications`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event_type: eventType,
          payload,
          recipient_id: recipientId,
          family_id: familyId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create notification');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }

  async getInsights(familyId?: string): Promise<RealInsight[]> {
    try {
      const headers = await this.getAuthHeaders();
      let url = `${this.getApiUrl()}/api/v1/insights`;
      
      if (familyId) {
        url = `${this.getApiUrl()}/api/v1/families/${familyId}/insights`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        console.error('Failed to fetch insights:', response.status);
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching insights:', error);
      return [];
    }
  }

  async getHealthMetrics(subjectId?: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      let url = `${this.getApiUrl()}/api/v1/health/metrics`;
      
      if (subjectId) {
        url = `${this.getApiUrl()}/api/v1/health/metrics?subject_id=${subjectId}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        console.error('Failed to fetch health metrics:', response.status);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching health metrics:', error);
      return null;
    }
  }

  async getEmergencySummary(subjectId: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/subjects/${subjectId}/emergency-summary`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        console.error('Failed to fetch emergency summary:', response.status);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching emergency summary:', error);
      return null;
    }
  }

  async getAppointments(familyId?: string, subjectId?: string): Promise<any[]> {
    try {
      const headers = await this.getAuthHeaders();
      let url = `${this.getApiUrl()}/api/v1/appointments`;
      
      if (familyId && subjectId) {
        url = `${this.getApiUrl()}/api/v1/families/${familyId}/subjects/${subjectId}/appointments`;
      } else if (familyId) {
        url = `${this.getApiUrl()}/api/v1/families/${familyId}/appointments`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        console.error('Failed to fetch appointments:', response.status);
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching appointments:', error);
      return [];
    }
  }

  async createAppointment(data: any, familyId?: string, subjectId?: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/appointments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...data,
          family_id: familyId,
          subject_id: subjectId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create appointment');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating appointment:', error);
      return null;
    }
  }

  async createDocument(filenestFileId: string, classification: string = 'unclassified', subjectId?: string, familyId?: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/documents`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filenest_file_id: filenestFileId,
          classification,
          subject_id: subjectId,
          family_id: familyId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create document');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating document:', error);
      return null;
    }
  }

  async createConversation(familyId: string, subjectId?: string, title?: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/conversations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          family_id: familyId,
          subject_id: subjectId,
          title
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }

  async sendAIMessage(conversationId: string, query: string, subjectId?: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/ai/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          conversation_id: conversationId,
          query,
          subject_id: subjectId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send AI message');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending AI message:', error);
      return null;
    }
  }

  // ========================================================================================
  // WEARABLES API (Garmin, Fitbit, Apple Health)
  // ========================================================================================

  async getWearableProviders(): Promise<WearableProviderItem[]> {
    try {
      const response = await fetch(`${this.getApiUrl()}/api/v1/wearables/providers`);
      if (!response.ok) return [];
      const json = await response.json();
      return json.providers || [];
    } catch (error) {
      console.warn('Failed to load wearable providers:', error);
      return [];
    }
  }

  async connectWearable(provider: string, subjectId?: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/wearables/connect`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ provider, subject_id: subjectId })
      });
      if (!response.ok) throw new Error('Failed to initiate wearable connection');
      return await response.json();
    } catch (error) {
      console.error('Connect wearable error:', error);
      return null;
    }
  }

  async completeWearableCallback(provider: string, subjectId?: string, code?: string, state?: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/wearables/callback`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          provider,
          subject_id: subjectId,
          code: code || 'auth_code_pkce',
          state: state || 'sample_state'
        })
      });
      if (!response.ok) throw new Error('Failed to complete wearable callback');
      return await response.json();
    } catch (error) {
      console.error('Wearable callback error:', error);
      return null;
    }
  }

  async getWearableConnections(subjectId?: string): Promise<WearableConnectionItem[]> {
    try {
      const url = subjectId
        ? `${this.getApiUrl()}/api/v1/wearables/connections?subject_id=${subjectId}`
        : `${this.getApiUrl()}/api/v1/wearables/connections`;
      const response = await fetch(url);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.warn('Failed to load wearable connections:', error);
      return [];
    }
  }

  async getWearableActivity(subjectId?: string, limit = 10): Promise<WearableActivityItem[]> {
    try {
      const url = subjectId
        ? `${this.getApiUrl()}/api/v1/wearables/activity?subject_id=${subjectId}&limit=${limit}`
        : `${this.getApiUrl()}/api/v1/wearables/activity?limit=${limit}`;
      const response = await fetch(url);
      if (!response.ok) return [];
      const json = await response.json();
      return json.data || [];
    } catch (error) {
      console.warn('Failed to fetch wearable activity:', error);
      return [];
    }
  }

  async disconnectWearable(connectionId: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/wearables/${connectionId}/disconnect`, {
        method: 'POST',
        headers
      });
      if (!response.ok) throw new Error('Failed to disconnect wearable');
      return await response.json();
    } catch (error) {
      console.error('Disconnect wearable error:', error);
      return null;
    }
  }

  async getWearableHealthSummary(subjectId?: string): Promise<WearableHealthSummary | null> {
    try {
      const url = subjectId
        ? `${this.getApiUrl()}/api/v1/subjects/${subjectId}/health-summary`
        : `${this.getApiUrl()}/api/v1/wearables/health-summary`;
      const response = await fetch(url);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.warn('Failed to fetch health summary:', error);
      return null;
    }
  }

  async syncHealthConnectTelemetry(subjectId?: string, telemetry?: { steps?: number; heart_rate?: number; sleep_minutes?: number }): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/wearables/sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          provider: 'health_connect',
          subject_id: subjectId,
          source_app: 'Google Fit',
          telemetry
        })
      });
      if (!response.ok) throw new Error('Failed to sync Health Connect telemetry');
      return await response.json();
    } catch (error) {
      console.error('Sync Health Connect error:', error);
      return null;
    }
  }

  async getSubjectVitals(subjectId?: string): Promise<any> {
    try {
      const url = subjectId
        ? `${this.getApiUrl()}/api/v1/subjects/${subjectId}/vitals`
        : `${this.getApiUrl()}/api/v1/wearables/vitals`;
      const response = await fetch(url);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.warn('Failed to fetch vitals:', error);
      return null;
    }
  }

  async simulateWearableStale(hoursOld = 14, subjectId?: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/wearables/simulate-stale`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ hours_old: hoursOld, subject_id: subjectId })
      });
      return await response.json();
    } catch (error) {
      console.error('Simulate stale error:', error);
      return null;
    }
  }

  async simulateWearableOutage(): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/wearables/simulate-outage`, {
        method: 'POST',
        headers,
        body: JSON.stringify({})
      });
      return await response.json();
    } catch (error) {
      console.error('Simulate outage error:', error);
      return null;
    }
  }

  async restoreWearableOutage(): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/wearables/restore-outage`, {
        method: 'POST',
        headers,
        body: JSON.stringify({})
      });
      return await response.json();
    } catch (error) {
      console.error('Restore outage error:', error);
      return null;
    }
  }
}

export interface WearableProviderItem {
  id: string;
  name: string;
  category: string;
  description: string;
  badge?: string;
  auth_type: string;
  status: string;
  supported_scopes: string[];
}

export interface WearableConnectionItem {
  id: string;
  subject_id: string;
  provider: string;
  connection_status: string;
  device_type: string;
  device_id?: string;
  source?: string;
  last_sync_at?: string;
  disconnected_at?: string | null;
  sync_status: string;
  is_stale: boolean;
  created_at: string;
}

export interface WearableActivityItem {
  id: string;
  subject_id: string;
  steps: number;
  heart_rate: number;
  sleep_minutes?: number;
  date: string;
  source: string;
  last_sync_at: string;
  device_id?: string;
}

export interface WearableHealthSummary {
  subject_id: string;
  steps: number;
  heart_rate: number;
  sleep_minutes?: number;
  date?: string;
  source?: string;
  last_sync_at?: string;
  hours_since_sync: number;
  is_stale: boolean;
  sync_status: string;
  data_availability_issue: boolean;
  is_health_alert: boolean;
  wearable_status: 'connected' | 'delayed' | 'unavailable';
  stale_warning?: string | null;
  is_outage?: boolean;
  clinical_data_usable?: boolean;
  family_data_usable?: boolean;
  wearables_card_title?: string;
  message?: string;
}

export const realDataService = new RealDataService();