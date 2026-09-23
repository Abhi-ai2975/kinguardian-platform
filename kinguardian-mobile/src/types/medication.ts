export interface Medication {
  id: string;
  personId: string;
  name: string;
  dose: string;
  frequency: string;
  scheduledTime: string;
  status: 'taken' | 'upcoming' | 'missed';
  adherencePercent: number;
  prescriber?: string;
  persisted?: boolean;
}
