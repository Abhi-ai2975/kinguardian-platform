export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  age: number;
  city: string;
  country: string;
  timezone: string;
  avatar?: string;
  wellbeingStatus: 'doing-well' | 'attention' | 'important' | 'offline';
  lastCheckIn?: string;

  // Compatibility properties for dashboard layers
  role?: string;
  relation?: string;
  avatarUrl?: string;
  currentStatus?: string;
  conditions?: string[];
  location?: string;
  backendSubjectId?: string;
}
