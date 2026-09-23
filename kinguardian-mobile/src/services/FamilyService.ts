import { FamilyMember } from '../types';
import { INITIAL_PEOPLE } from '../data/mockData';

export const getDelay = () => Math.floor(Math.random() * (700 - 200 + 1)) + 200;
export const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms || getDelay()));

export interface FamilyService {
  getFamilyMembers(): Promise<FamilyMember[]>;
  updateCheckIn(personId: string, status: 'Good' | 'Tired' | 'Unwell'): Promise<FamilyMember>;
}

export class MockFamilyService implements FamilyService {
  private members = [...INITIAL_PEOPLE];

  async getFamilyMembers(): Promise<FamilyMember[]> {
    await delay();
    return this.members;
  }

  async updateCheckIn(
    personId: string,
    status: 'Good' | 'Tired' | 'Unwell'
  ): Promise<FamilyMember> {
    await delay();
    const idx = this.members.findIndex((m) => m.id === personId);
    if (idx === -1) throw new Error('Family member not found');

    const updated: FamilyMember = {
      ...this.members[idx],
      wellbeingStatus: status === 'Good' ? 'doing-well' : 'attention',
      currentStatus: `Logged check-in: feeling ${status}`,
      lastCheckIn: 'Just now'
    };
    this.members[idx] = updated;
    return updated;
  }
}
