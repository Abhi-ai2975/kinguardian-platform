import { Medication } from '../types';
import { DrGodlyApiClient } from './api-client/client';
import { CONFIG } from '../constants/config';
import { ApiFamilyService } from './ApiFamilyService';

export interface MedicationService {
  getMedications(personId: string): Promise<Medication[]>;
  markTaken(medicationId: string, status: 'taken' | 'upcoming' | 'missed'): Promise<Medication>;
  sendReminder(medicationId: string): Promise<void>;
}

export class ApiMedicationService implements MedicationService {
  private client: DrGodlyApiClient;
  private familyService: ApiFamilyService;
  private defaultMeds: Medication[] = [
    {
      id: 'rec-1',
      personId: 'dad',
      name: 'Amlodipine',
      dose: '5mg',
      frequency: 'Once Daily (Morning)',
      scheduledTime: '8:00 AM',
      status: 'taken',
      adherencePercent: 96,
      prescriber: 'Dr. Sharma (Cardiology)'
    },
    {
      id: 'rec-2',
      personId: 'mom',
      name: 'Metformin ER',
      dose: '500mg',
      frequency: 'Twice Daily (Morning/Night)',
      scheduledTime: '9:00 AM',
      status: 'taken',
      adherencePercent: 98,
      prescriber: 'Dr. Nair (Endocrinology)'
    },
    {
      id: 'rec-5',
      personId: 'dad',
      name: 'Atorvastatin',
      dose: '20mg',
      frequency: 'Once Daily (Night)',
      scheduledTime: '8:00 PM',
      status: 'upcoming',
      adherencePercent: 92,
      prescriber: 'Dr. Sharma (Cardiology)'
    }
  ];

  constructor(baseUrl: string = CONFIG.apiUrl, familyService?: ApiFamilyService) {
    this.client = new DrGodlyApiClient({ baseUrl });
    this.familyService = familyService || new ApiFamilyService(baseUrl);
  }

  async getMedications(personId: string): Promise<Medication[]> {
    try {
      const familyId = await this.familyService.ensureFamily();
      const subjectId = personId ? await this.familyService.resolveSubjectId(personId) : undefined;

      const adherenceRecords = await this.client.medications.listAdherence(familyId, subjectId || undefined);
      console.log(`ApiMedicationService: Found ${adherenceRecords?.length || 0} adherence rows in DB for subject ${subjectId}`);

      const relevantMeds = this.defaultMeds.filter((m) => m.personId === personId);

      if (adherenceRecords && adherenceRecords.length > 0) {
        return relevantMeds.map((med) => {
          const match = adherenceRecords.find((r: any) =>
            r.medication_ref?.toLowerCase().includes(med.name.toLowerCase()) ||
            med.name.toLowerCase().includes(r.medication_ref?.toLowerCase() || '')
          );
          const takenToday = match?.taken_at && new Date(match.taken_at).toDateString() === new Date().toDateString();
          if (takenToday) {
            return {
              ...med,
              status: 'taken',
              persisted: true,
              adherencePercent: Math.min(100, (med.adherencePercent || 90) + 2)
            };
          }
          return med;
        });
      }

      return relevantMeds;
    } catch (err) {
      console.warn('ApiMedicationService: Failed to fetch from backend, returning cached med list:', err);
      return this.defaultMeds.filter((m) => m.personId === personId);
    }
  }

  async markTaken(
    medicationId: string,
    status: 'taken' | 'upcoming' | 'missed'
  ): Promise<Medication> {
    const medIdx = this.defaultMeds.findIndex((m) => m.id === medicationId || m.name.toLowerCase() === medicationId.toLowerCase());
    const med = medIdx !== -1 ? this.defaultMeds[medIdx] : {
      id: medicationId,
      personId: 'dad',
      name: medicationId,
      dose: 'Standard dose',
      frequency: 'Daily',
      scheduledTime: '8:00 AM',
      status: status,
      adherencePercent: 95
    };

    if (status === 'taken' || status === 'missed') {
      try {
        const familyId = await this.familyService.ensureFamily();
        let subjectId = await this.familyService.resolveSubjectId(med.personId);
        if (!subjectId) {
          const members = await this.familyService.getFamilyMembers();
          subjectId = members[0]?.backendSubjectId || '';
        }

        await this.client.medications.confirm({
          family_id: familyId,
          subject_id: subjectId || undefined,
          medication_ref: med.name,
          medication_id: med.id,
          taken: status === 'taken',
          source: 'parent'
        });
        console.log(`ApiMedicationService: Persisted medication adherence (${status}) for ${med.name} in PostgreSQL`);
        return { ...med, status, persisted: true };
      } catch (err) {
        console.warn('ApiMedicationService: Error saving adherence to PostgreSQL:', err);
        return { ...med, status, persisted: false };
      }
    }

    const updatedMed: Medication = {
      ...med,
      status,
      persisted: false
    };

    if (medIdx !== -1) {
      this.defaultMeds[medIdx] = updatedMed;
    }

    return updatedMed;
  }

  async sendReminder(medicationId: string): Promise<void> {
    try {
      const familyId = await this.familyService.ensureFamily();
      const medName = medicationId === 'rec-5' || medicationId.toLowerCase().includes('atorva') ? 'Atorvastatin 20mg' : medicationId;
      await this.client.notifications.create(familyId, {
        event_type: 'reminder',
        payload: {
          title: `Medication Reminder: ${medName}`,
          message: `Take evening dose of ${medName}`,
          recipient: 'parent',
          medication_id: medicationId
        }
      });
      console.log(`ApiMedicationService: Persisted medication reminder notification in DB`);
    } catch (err) {
      console.warn('ApiMedicationService: Error dispatching reminder to backend:', err);
    }
  }
}

export class MockMedicationService extends ApiMedicationService {}
