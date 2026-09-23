import { HealthEvent } from '../types';
import { INITIAL_HEALTH_RECORDS } from '../data/mockData';
import { DrGodlyApiClient } from './api-client/client';
import { CONFIG } from '../constants/config';
import { ApiFamilyService } from './ApiFamilyService';

export interface HealthEventService {
  getHealthEvents(personId: string): Promise<HealthEvent[]>;
  logVitalEvent(
    personId: string,
    vital: { systolic?: number; diastolic?: number; glucose?: number; note?: string }
  ): Promise<HealthEvent>;
}

export class ApiHealthEventService implements HealthEventService {
  private client: DrGodlyApiClient;
  private familyService: ApiFamilyService;
  private events: HealthEvent[] = [...INITIAL_HEALTH_RECORDS];

  constructor(baseUrl: string = CONFIG.apiUrl, familyService?: ApiFamilyService) {
    this.client = new DrGodlyApiClient({ baseUrl });
    this.familyService = familyService || new ApiFamilyService(baseUrl);
  }

  async getHealthEvents(personId: string): Promise<HealthEvent[]> {
    try {
      const familyId = await this.familyService.ensureFamily();
      const subjectId = personId ? await this.familyService.resolveSubjectId(personId) : undefined;

      const checkins = await this.client.checkins.list(familyId, subjectId || undefined);
      if (checkins && checkins.length > 0) {
        const liveEvents: HealthEvent[] = checkins.map((c: any) => {
          let title = 'Health Observation Logged';
          let subtitle = c.note || `${c.mood} check-in`;
          let category: any = 'symptoms';

          if (c.note?.includes('BP') || c.note?.includes('mmHg')) {
            title = 'Blood Pressure Reading';
            category = 'vitals';
          } else if (c.note?.includes('mg/dL') || c.note?.includes('sugar') || c.note?.includes('Glucose')) {
            title = 'Fasting Blood Glucose';
            category = 'vitals';
          } else if (c.mood) {
            title = `Daily Wellbeing Check-in (${c.mood})`;
          }

          return {
            id: c.id,
            personId,
            type: 'vital',
            title,
            subtitle,
            description: c.note,
            occurredAt: c.occurred_at || c.created_at || new Date().toISOString(),
            date: 'Recent',
            source: 'parent',
            severity: (c.severity === 'urgent' || c.severity === 'critical') ? 'important' : (c.severity === 'watch' ? 'attention' : 'normal'),
            category,
            details: c.note || 'Recorded in KinGuardian database.'
          };
        });

        // Merge live events with existing baseline records
        const combined = [...liveEvents, ...this.events.filter((e) => e.personId === personId && !liveEvents.some((l) => l.id === e.id))];
        this.events = combined;
        return combined;
      }
    } catch (err) {
      console.warn('ApiHealthEventService: Error fetching checkins from DB:', err);
    }
    return this.events.filter((e) => e.personId === personId);
  }

  async logVitalEvent(
    personId: string,
    vital: { systolic?: number; diastolic?: number; glucose?: number; note?: string }
  ): Promise<HealthEvent> {
    let title = 'Fasting Glucose Logged';
    let subtitle = `${vital.glucose} mg/dL • Manual Ingestion`;
    let noteText = vital.note || `Glucose: ${vital.glucose} mg/dL`;
    let severity = 'normal';

    if (vital.systolic && vital.diastolic) {
      title = 'Manual BP Logged';
      subtitle = `${vital.systolic}/${vital.diastolic} mmHg • Manual Ingestion`;
      noteText = vital.note ? `BP: ${vital.systolic}/${vital.diastolic} mmHg - ${vital.note}` : `BP: ${vital.systolic}/${vital.diastolic} mmHg`;
      if (vital.systolic >= 140 || vital.diastolic >= 90) {
        severity = 'watch';
      }
    }

    try {
      const familyId = await this.familyService.ensureFamily();
      let subjectId = await this.familyService.resolveSubjectId(personId);
      if (!subjectId) {
        const members = await this.familyService.getFamilyMembers();
        subjectId = members[0]?.backendSubjectId || '';
      }

      if (subjectId) {
        const createdCheckin = await this.client.checkins.submit({
          family_id: familyId,
          subject_id: subjectId,
          mood: 'Vital Log',
          feeling: 'good',
          notes: noteText,
          severity
        });
        console.log('ApiHealthEventService: Persisted vital observation to PostgreSQL checkins:', createdCheckin);
      }
    } catch (err) {
      console.warn('ApiHealthEventService: Error logging vital to PostgreSQL:', err);
    }

    const newEvent: HealthEvent = {
      id: `rec-manual-${Date.now()}`,
      personId,
      type: 'vital',
      title,
      subtitle,
      description: vital.note,
      occurredAt: new Date().toISOString(),
      date: 'Just now',
      source: 'coordinator',
      severity: severity as any,
      category: 'vitals',
      details: vital.note || 'Logged via KinGuardian companion portal.'
    };

    this.events.unshift(newEvent);
    return newEvent;
  }
}

export class MockHealthEventService extends ApiHealthEventService { }
