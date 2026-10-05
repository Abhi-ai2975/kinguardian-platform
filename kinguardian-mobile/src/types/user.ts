export interface User {
  id: string;
  name: string;
  role: 'coordinator' | 'parent' | 'caregiver' | 'doctor';
  age: number;
  city: string;
  country: string;
  timezone: string;
  phone?: string;
  avatar?: string;
}

export type DemoRole = 'coordinator' | 'parent' | 'caregiver';

export interface DemoUser {
  id: string;
  name: string;
  age: number;
  location: string;
  role: DemoRole;
  relation: string;
  avatarUrl: string;
  email?: string;
}
