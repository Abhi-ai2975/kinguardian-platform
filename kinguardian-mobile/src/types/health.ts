export interface HealthEvent {
  id: string;
  personId: string;
  title: string;
  description?: string;
  severity?: 'normal' | 'attention' | 'important';

  type?:
    | 'vital'
    | 'medication'
    | 'appointment'
    | 'lab'
    | 'symptom'
    | 'document'
    | 'check-in'
    | 'ai-insight';
  occurredAt?: string;
  source?: 'parent' | 'coordinator' | 'caregiver' | 'doctor' | 'wearable' | 'medical-record' | 'ai';

  // Compatibility properties for timeline views
  category?: string;
  subtitle?: string;
  details?: string;
  tag?: string;
  date?: string;
  status?: string;
  iconBgColor?: string;
  iconColor?: string;
  icon?: string;
}

export interface HealthObservation {
  id: string;
  personId: string;
  badge: string;
  title: string;
  primaryStatement: string;
  highlightText: string;
  disclaimer: string;
  possibleFactors: {
    id: string;
    icon: string;
    title: string;
    description?: string;
  }[];
  dataConsidered: {
    icon: string;
    text: string;
    subdued?: boolean;
    color?: string;
  }[];
  transparency: {
    title: string;
    subtitle: string;
    clinicalReasoning: string;
    highlightMetric: string;
    confidenceText: string;
    confidenceLevel: 'high' | 'medium' | 'low';
    dataCountText: string;
    timePeriodText: string;
    dataSources: {
      name: string;
      icon: string;
      subtext: string;
      readingsCount: number;
      verified: boolean;
      focused?: boolean;
    }[];
    readingsHistory?: {
      date: string;
      time: string;
      systolic: number;
      diastolic: number;
      source: string;
      note?: string;
    }[];
  };
}
