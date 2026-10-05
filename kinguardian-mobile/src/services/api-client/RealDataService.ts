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
  parent_name?: string;
  assigned_to_name?: string;
  parent_context_only?: boolean;
  detailed_clinical_emr_access?: boolean;
  scope?: string;
  instructions?: string;
  completion_note?: string;
  is_duplicate_suppressed?: boolean;
  deduplication_enforced?: boolean;
  notification_dispatched?: boolean;
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
      let headers = await this.getAuthHeaders();
      let response = await fetch(`${this.getApiUrl()}/api/v1/auth/me`, {
        method: 'GET',
        headers
      });

      if (!response.ok && response.status === 401) {
        const newToken = await authService.handle401();
        if (newToken) {
          headers = { ...headers, Authorization: `Bearer ${newToken}` };
          response = await fetch(`${this.getApiUrl()}/api/v1/auth/me`, {
            method: 'GET',
            headers
          });
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('Failed to fetch user profile:', response.status, errorText);
        return null;
      }

      const data = await response.json();
      return data.profile;
    } catch (error) {
      console.warn('Error fetching user profile:', error);
      return null;
    }
  }

  async getUserFamilies(): Promise<RealFamily[]> {
    try {
      let headers = await this.getAuthHeaders();
      let response = await fetch(`${this.getApiUrl()}/api/v1/families`, {
        method: 'GET',
        headers
      });

      if (!response.ok && response.status === 401) {
        const newToken = await authService.handle401();
        if (newToken) {
          headers = { ...headers, Authorization: `Bearer ${newToken}` };
          response = await fetch(`${this.getApiUrl()}/api/v1/families`, {
            method: 'GET',
            headers
          });
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('Failed to fetch families:', response.status, errorText);
        return [];
      }

      return await response.json();
    } catch (error) {
      console.warn('Error fetching families:', error);
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

  async getSingleCareTask(taskId: string): Promise<RealCareTask | null> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/care/tasks/${taskId}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch task: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching single care task:', error);
      return null;
    }
  }

  async createCareTask(title: string, detail?: string, priority: string = 'routine', subjectId?: string, familyId?: string): Promise<RealCareTask | null> {
    return this.createCareTaskFull({ title, detail, priority, subject_id: subjectId, family_id: familyId });
  }

  async createCareTaskFull(options: {
    title: string;
    detail?: string;
    priority?: string;
    subject_id?: string;
    family_id?: string;
    assigned_to?: string;
    due_at?: string;
    status?: string;
    idempotency_key?: string;
  }): Promise<RealCareTask | null> {
    try {
      const headers = await this.getAuthHeaders();
      if (options.idempotency_key) {
        (headers as any)['Idempotency-Key'] = options.idempotency_key;
      }
      const response = await fetch(`${this.getApiUrl()}/api/v1/care/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: options.title,
          detail: options.detail || "Pick up lab report from Apollo Diagnostics",
          priority: options.priority || 'routine',
          subject_id: options.subject_id,
          family_id: options.family_id,
          assigned_to: options.assigned_to,
          due_at: options.due_at || new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
          status: options.status || 'pending',
          idempotency_key: options.idempotency_key
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create care task: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating care task:', error);
      return null;
    }
  }

  async completeCareTask(taskId: string, completionNote?: string): Promise<RealCareTask | null> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/care/tasks/${taskId}/complete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          completed_at: new Date().toISOString(),
          completion_note: completionNote || 'Report collected and verified.',
          note: completionNote || 'Report collected and verified.'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to complete care task: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error completing care task:', error);
      return null;
    }
  }

  async evaluateOverdueTasks(): Promise<{ status: string; overdue_count: number; tasks: RealCareTask[] } | null> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/care/tasks/evaluate-overdue`, {
        method: 'POST',
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to evaluate overdue tasks: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error evaluating overdue tasks:', error);
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

  async markNotificationRead(notificationId: string): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers
      });
      return response.ok;
    } catch (error) {
      console.error('Error marking notification read:', error);
      return false;
    }
  }

  async sendMedicationReminder(medicationId: string = 'Atorvastatin 20mg'): Promise<RealNotification | null> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/medications/${encodeURIComponent(medicationId)}/remind`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ medication_id: medicationId })
      });
      if (!response.ok) {
        throw new Error('Failed to send medication reminder');
      }
      return await response.json();
    } catch (error) {
      console.error('Error sending medication reminder:', error);
      return null;
    }
  }

  async sendFamilyMessage(message: string, conversationId?: string): Promise<any | null> {
    try {
      const headers = await this.getAuthHeaders();
      const url = conversationId 
        ? `${this.getApiUrl()}/api/v1/conversations/${conversationId}/messages`
        : `${this.getApiUrl()}/api/v1/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ body: message })
      });
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
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

  async search(query: string): Promise<{ query: string; count: number; results: any[] }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        console.error('Failed to execute search:', response.status);
        return { query, count: 0, results: [] };
      }

      return await response.json();
    } catch (error) {
      console.error('Error executing search:', error);
      return { query, count: 0, results: [] };
    }
  }

  async getSubjectTimeline(subjectId?: string, cursor?: string, limit: number = 20): Promise<{
    events: any[];
    next_cursor: string | null;
    has_more: boolean;
    total?: number;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const sid = subjectId || 'dad';
      let url = `${this.getApiUrl()}/api/v1/subjects/${sid}/timeline?limit=${limit}`;
      if (cursor) {
        url += `&cursor=${encodeURIComponent(cursor)}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        console.error('Failed to fetch subject timeline:', response.status);
        return { events: [], next_cursor: null, has_more: false };
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching subject timeline:', error);
      return { events: [], next_cursor: null, has_more: false };
    }
  }

  async getEmergencySummary(subjectId: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/subjects/${subjectId}/emergency-summary`, {
        method: 'GET',
        headers
      });

      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        return {
          error: errorData.detail || 'Access denied: Consent has been revoked for this subject',
          status: 403,
          revoked: true
        };
      }

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

  async revokeConsent(targetOrEmail: string = "anjali@example.com", reason: string = 'User initiated revocation'): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const isEmail = targetOrEmail.includes('@');
      const body = isEmail
        ? { grantee_email: targetOrEmail, reason }
        : { grantee_email: "anjali@example.com", subject_id: targetOrEmail, reason };

      const response = await fetch(`${this.getApiUrl()}/api/v1/consents/revoke`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.detail || `Failed to revoke consent: ${response.status}`, status: response.status };
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error revoking consent:', error);
      return { error: error?.message || 'Network error', status: 500 };
    }
  }

  async getDocument(documentId: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/documents/${documentId}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.detail || `Failed to fetch document: ${response.status}`, status: response.status };
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error fetching document:', error);
      return { error: error?.message || 'Network error', status: 500 };
    }
  }

  async shareSummary(payload: {
    subjectId?: string;
    recipient: string;
    sections?: string[];
    note?: string;
  }): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/summary/share`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject_id: payload.subjectId || 'dad',
          recipient: payload.recipient,
          sections: payload.sections || ['medications', 'vitals', 'conditions'],
          note: payload.note || 'Shareable health summary'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.detail || `Failed to share summary: ${response.status}`, status: response.status };
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error sharing summary:', error);
      return { error: error?.message || 'Network error', status: 500 };
    }
  }

  async updateUserLanguage(language: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/profiles/me`, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ language })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.detail || `Failed to update language: ${response.status}`, status: response.status };
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error updating language:', error);
      return { error: error?.message || 'Network error', status: 500 };
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
      const payload: any = {
        doctor_name: data.doctor_name || data.doctorName,
        specialty: data.specialty,
        date: data.date,
        time: data.time,
        parent_time: data.parent_time || data.time,
        location: data.location || 'Apollo Hospital, Chennai',
        subject_id: data.subject_id || subjectId || 'dad',
        family_id: data.family_id || familyId
      };
      const response = await fetch(`${this.getApiUrl()}/api/v1/appointments`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.detail || `Failed to create appointment: ${response.status}`, status: response.status };
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      return { error: error?.message || 'Network error', status: 500 };
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
      const headers = await this.getAuthHeaders();
      const url = subjectId
        ? `${this.getApiUrl()}/api/v1/wearables/connections?subject_id=${encodeURIComponent(subjectId)}`
        : `${this.getApiUrl()}/api/v1/wearables/connections`;
      const response = await fetch(url, { headers });
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.warn('Failed to load wearable connections:', error);
      return [];
    }
  }

  async getWearableActivity(subjectId?: string, limit = 10): Promise<WearableActivityItem[]> {
    try {
      const headers = await this.getAuthHeaders();
      const url = subjectId
        ? `${this.getApiUrl()}/api/v1/wearables/activity?subject_id=${encodeURIComponent(subjectId)}&limit=${limit}`
        : `${this.getApiUrl()}/api/v1/wearables/activity?limit=${limit}`;
      const response = await fetch(url, { headers });
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
      const headers = await this.getAuthHeaders();
      const url = subjectId
        ? `${this.getApiUrl()}/api/v1/subjects/${encodeURIComponent(subjectId)}/health-summary`
        : `${this.getApiUrl()}/api/v1/wearables/health-summary`;
      const response = await fetch(url, { headers });
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
      const validSubjectId = subjectId || undefined;
      const response = await fetch(`${this.getApiUrl()}/api/v1/wearables/sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          provider: 'health_connect',
          subject_id: validSubjectId,
          source_app: 'Google Fit',
          telemetry
        })
      });
      if (!response.ok) {
        console.warn('Sync Health Connect responded with status:', response.status);
        return null;
      }
      return await response.json();
    } catch (error) {
      console.warn('Sync Health Connect warning (network or offline):', error);
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

  // =========================================================================
  // SECTION 14: FHIR / Clinical Record Integration Client Methods
  // =========================================================================

  async getParentSummary(subjectId?: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const sid = subjectId || 'dad';
      const response = await fetch(`${this.getApiUrl()}/api/v1/subjects/${sid}/summary`, {
        method: 'GET',
        headers
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.detail || `HTTP ${response.status}`, status: response.status };
      }
      return await response.json();
    } catch (error: any) {
      console.error('getParentSummary error:', error);
      return { error: error?.message || 'Network error', status: 500 };
    }
  }

  async getSubjectVitals(subjectId?: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const sid = subjectId || 'dad';
      const response = await fetch(`${this.getApiUrl()}/api/v1/subjects/${sid}/vitals`, {
        method: 'GET',
        headers
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.detail || `HTTP ${response.status}`, status: response.status };
      }
      return await response.json();
    } catch (error: any) {
      console.error('getSubjectVitals error:', error);
      return { error: error?.message || 'Network error', status: 500 };
    }
  }

  async getSubjectConditions(subjectId?: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const sid = subjectId || 'dad';
      const response = await fetch(`${this.getApiUrl()}/api/v1/subjects/${sid}/conditions`, {
        method: 'GET',
        headers
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.detail || `HTTP ${response.status}`, status: response.status };
      }
      return await response.json();
    } catch (error: any) {
      console.error('getSubjectConditions error:', error);
      return { error: error?.message || 'Network error', status: 500 };
    }
  }

  async getSubjectMedications(subjectId?: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const sid = subjectId || 'dad';
      const response = await fetch(`${this.getApiUrl()}/api/v1/subjects/${sid}/medications`, {
        method: 'GET',
        headers
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.detail || `HTTP ${response.status}`, status: response.status };
      }
      return await response.json();
    } catch (error: any) {
      console.error('getSubjectMedications error:', error);
      return { error: error?.message || 'Network error', status: 500 };
    }
  }

  async getSubjectLabs(subjectId?: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const sid = subjectId || 'dad';
      const response = await fetch(`${this.getApiUrl()}/api/v1/subjects/${sid}/labs`, {
        method: 'GET',
        headers
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.detail || `HTTP ${response.status}`, status: response.status };
      }
      return await response.json();
    } catch (error: any) {
      console.error('getSubjectLabs error:', error);
      return { error: error?.message || 'Network error', status: 500 };
    }
  }

  async getSubjectHealthProfile(subjectId?: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const sid = subjectId || 'dad';
      const response = await fetch(`${this.getApiUrl()}/api/v1/subjects/${sid}/health-profile`, {
        method: 'GET',
        headers
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.detail || `HTTP ${response.status}`, status: response.status };
      }
      return await response.json();
    } catch (error: any) {
      console.error('getSubjectHealthProfile error:', error);
      return { error: error?.message || 'Network error', status: 500 };
    }
  }

  // --- Section 19: Failure, Resilience, and Recovery ---
  async simulateDbDown(): Promise<{ status: number; data?: any; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/health/resilience/simulate-db-down`, {
        method: 'GET',
        headers
      });
      const data = await response.json().catch(() => ({}));
      return { status: response.status, data, error: data.detail };
    } catch (error: any) {
      return { status: 503, error: error?.message || 'Database unavailable' };
    }
  }

  async testRedisFallback(): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/resilience/redis-fallback`, {
        method: 'POST',
        headers
      });
      return await response.json();
    } catch (error: any) {
      return { error: error?.message, status: 500 };
    }
  }

  async testWorkerProcessOutbox(): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/resilience/worker-process-outbox`, {
        method: 'POST',
        headers
      });
      return await response.json();
    } catch (error: any) {
      return { error: error?.message, status: 500 };
    }
  }

  async testFhirTimeout(subjectId?: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const url = subjectId 
        ? `${this.getApiUrl()}/api/v1/resilience/fhir-summary?subject_id=${subjectId}`
        : `${this.getApiUrl()}/api/v1/resilience/fhir-summary`;
      const response = await fetch(url, {
        method: 'GET',
        headers
      });
      return await response.json();
    } catch (error: any) {
      return { error: error?.message, status: 500 };
    }
  }

  async ingestWearableValidated(telemetry: { steps: number; heart_rate: number; source?: string }): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/resilience/wearables-ingest`, {
        method: 'POST',
        headers,
        body: JSON.stringify(telemetry)
      });
      const data = await response.json().catch(() => ({}));
      return { status: response.status, ...data };
    } catch (error: any) {
      return { error: error?.message, status: 500 };
    }
  }

  async approveDocument(documentId: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/documents/${documentId}/approve`, {
        method: 'POST',
        headers
      });
      const data = await response.json().catch(() => ({}));
      return { status: response.status, ...data };
    } catch (error: any) {
      return { error: error?.message, status: 500 };
    }
  }

  // --- Section 20: End-to-End Business Journeys ---
  async triggerGuardianMomentInsight(subjectId?: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const url = subjectId 
        ? `${this.getApiUrl()}/api/v1/insights/guardian-moment?subject_id=${subjectId}`
        : `${this.getApiUrl()}/api/v1/insights/guardian-moment`;
      const response = await fetch(url, {
        method: 'POST',
        headers
      });
      return await response.json();
    } catch (error: any) {
      return { error: error?.message, status: 500 };
    }
  }

  async getGuardianMomentExplanation(insightId?: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const url = insightId
        ? `${this.getApiUrl()}/api/v1/insights/${insightId}/explain`
        : `${this.getApiUrl()}/api/v1/insights/guardian_moment/explain`;
      const response = await fetch(url, {
        method: 'GET',
        headers
      });
      return await response.json();
    } catch (error: any) {
      return { error: error?.message, status: 500 };
    }
  }

  async createLabReportDocument(filenestFileId?: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/documents/lab-report`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filenest_file_id: filenestFileId || `apollo_lab_${Date.now()}.pdf`
        })
      });
      return await response.json();
    } catch (error: any) {
      return { error: error?.message, status: 500 };
    }
  }

  async getAppointmentPreparation(appointmentId: string = 'current', subjectId?: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const url = subjectId
        ? `${this.getApiUrl()}/api/v1/appointments/${appointmentId}/preparation?subject_id=${subjectId}`
        : `${this.getApiUrl()}/api/v1/appointments/${appointmentId}/preparation`;
      const response = await fetch(url, {
        method: 'GET',
        headers
      });
      return await response.json();
    } catch (error: any) {
      return { error: error?.message, status: 500 };
    }
  }

  async shareAppointmentPreparation(appointmentId: string, recipient: string, sections?: string[]): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/appointments/${appointmentId}/share`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          recipient,
          sections: sections || ['summary', 'vitals', 'medications', 'questions']
        })
      });
      return await response.json();
    } catch (error: any) {
      return { error: error?.message, status: 500 };
    }
  }

  // TEST E2E-005: Caregiver Assigned - Task Ownership Propagation
  async runE2ETaskPropagation(title = "Dad morning vitals & hydration check", priority = "high"): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/resilience/e2e-task-propagation`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title, priority, complete_immediately: true })
      });
      return await response.json();
    } catch (error: any) {
      return { error: error?.message, status: 500 };
    }
  }

  // TEST E2E-006: Restore consent for coordinator
  async restoreConsent(granteeEmail = "anjali@example.com"): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/consents/restore`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ grantee_email: granteeEmail })
      });
      return await response.json();
    } catch (error: any) {
      return { error: error?.message, status: 500 };
    }
  }

  // TEST E2E-006: Check coordinator consent status
  async getCoordinatorConsentStatus(email = "anjali@example.com"): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/consents/coordinator-status?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers
      });
      return await response.json();
    } catch (error: any) {
      return { error: error?.message, status: 500, revoked: false };
    }
  }

  // TEST E2E-006: Real-time consent denial verification
  async testConsentAccessCheck(email = "anjali@example.com"): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/resilience/test-consent-denial`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      return { status: response.status, ...data };
    } catch (error: any) {
      return { error: error?.message, status: 500 };
    }
  }

  // TEST E2E-007: AI Service Unavailable simulation
  async simulateAiUnavailable(): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/resilience/simulate-ai-unavailable`, {
        method: 'POST',
        headers
      });
      return await response.json();
    } catch (error: any) {
      return { error: error?.message, status: 500 };
    }
  }

  // TEST E2E-007: Core care workflows status (Meds, Appts, Tasks without AI)
  async getCoreWorkflowsStatus(subjectId?: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const sub = subjectId ? `?subject_id=${encodeURIComponent(subjectId)}` : '';
      const response = await fetch(`${this.getApiUrl()}/api/v1/resilience/core-workflows${sub}`, {
        method: 'GET',
        headers
      });
      return await response.json();
    } catch (error: any) {
      return { error: error?.message, status: 500 };
    }
  }

  // TEST E2E-008: Wearable Service Unavailable simulation
  async simulateWearableUnavailable(subjectId?: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/resilience/simulate-wearable-unavailable`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ subject_id: subjectId })
      });
      return await response.json();
    } catch (error: any) {
      return { error: error?.message, status: 500 };
    }
  }

  // TEST ERR-006: Open Wearables Returns Malformed Response - Fetch Metrics (P1)
  async fetchWearableMetricsWithValidation(subjectId?: string, simulateMalformed: boolean = false): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/wearables/fetch-metrics`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subject_id: subjectId,
          simulate_malformed: simulateMalformed
        })
      });
      const data = await response.json();
      return { status: response.status, ...data };
    } catch (error: any) {
      return { error: error?.message, status: 500 };
    }
  }

  // --- COORD-001: Coordinator Onboarding & Family Context Creation ---
  async completeCoordinatorOnboarding(payload: {
    location?: string;
    timezone?: string;
    family_name?: string;
    force_new?: boolean;
    parent?: {
      name?: string;
      email?: string;
      relationship?: string;
      city?: string;
      age?: number;
      phone?: string;
      invite_method?: string;
    };
  }): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/coordinator/onboarding`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      return data;
    } catch (error: any) {
      console.error('Coordinator onboarding failed:', error);
      return { error: error?.message, status: 'error' };
    }
  }

  // --- COORD-002: Family Home State (Reassurance & Data Availability) ---
  async getFamilyHome(familyId: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/families/${familyId}/home`, {
        method: 'GET',
        headers
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (error: any) {
      console.error('Failed to fetch family home:', error);
      return null;
    }
  }

  // --- COORD-003: Guardian Moment Insight ---
  async getGuardianMoment(subjectId?: string, familyId?: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const params = new URLSearchParams();
      if (subjectId) params.append('subject_id', subjectId);
      if (familyId) params.append('family_id', familyId);
      const q = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`${this.getApiUrl()}/api/v1/insights/guardian-moment${q}`, {
        method: 'GET',
        headers
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (error: any) {
      console.error('Failed to get guardian moment:', error);
      return null;
    }
  }

  async dismissGuardianMoment(insightId: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.getApiUrl()}/api/v1/insights/${insightId}/dismiss`, {
        method: 'POST',
        headers
      });
      return await response.json().catch(() => ({ status: 'dismissed' }));
    } catch (error: any) {
      console.error('Failed to dismiss guardian moment:', error);
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