import { FamilyMember } from '../types';
import { INITIAL_PEOPLE } from '../data/mockData';
import { DrGodlyApiClient } from './api-client/client';
import { CONFIG } from '../constants/config';
import { authService } from './auth/authService';

export interface AddParentPayload {
  name: string;
  relationship?: string;
  city?: string;
  countryCode?: string;
  timezone?: string;
  age?: number;
  phone?: string;
}

export class ApiFamilyService {
  public client: DrGodlyApiClient;
  public familyId: string | null = null;
  private localMembers: FamilyMember[] = [...INITIAL_PEOPLE];
  private subjectIdMap: Record<string, string> = {};
  private ensureFamilyPromise: Promise<string> | null = null;
  private getFamilyMembersPromise: Promise<FamilyMember[]> | null = null;

  constructor(baseUrl: string = CONFIG.apiUrl) {
    this.client = new DrGodlyApiClient({ baseUrl });
  }

  private isUUID(val?: string | null): boolean {
    if (!val) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  }

  public resetFamilyCache(): void {
    this.familyId = null;
    this.ensureFamilyPromise = null;
    this.getFamilyMembersPromise = null;
    this.subjectIdMap = {};
  }

  public async ensureFamily(): Promise<string> {
    if (this.familyId) return this.familyId;
    if (this.ensureFamilyPromise) return this.ensureFamilyPromise;

    this.ensureFamilyPromise = (async () => {
      try {
        const families = await this.client.families.list();
        if (families && Array.isArray(families) && families.length > 0) {
          this.familyId = families[0].id || families[0].family_id;
          return this.familyId!;
        }

        const family = await this.client.families.create({
          name: 'KinGuardian Family',
          home_timezone: 'Asia/Kolkata'
        });
        this.familyId = family.id;
        return this.familyId!;
      } catch (err) {
        console.warn('ApiFamilyService: Failed to ensure family on backend, fallback to default:', err);
        this.familyId = 'aa7bb110-fc9f-4f95-be60-a796f24ac1a1';
        return this.familyId;
      } finally {
        this.ensureFamilyPromise = null;
      }
    })();

    return this.ensureFamilyPromise;
  }

  private decodeSubjectReference(reference?: string | null) {
    if (!reference) return {};
    try {
      return JSON.parse(reference);
    } catch {
      return { name: reference };
    }
  }

  async getFamilyMembers(): Promise<FamilyMember[]> {
    if (this.getFamilyMembersPromise) return this.getFamilyMembersPromise;

    this.getFamilyMembersPromise = (async () => {
      try {
        const famId = await this.ensureFamily();
        const [homeData, circleMembers] = await Promise.allSettled([
          this.client.families.getHome(famId),
          this.client.families.listMembers(famId)
        ]);

        const subjects = homeData.status === 'fulfilled' && homeData.value?.subjects ? homeData.value.subjects : [];
        const members = circleMembers.status === 'fulfilled' && Array.isArray(circleMembers.value) ? circleMembers.value : [];

        const backendMembers: FamilyMember[] = [];

        if (Array.isArray(subjects) && subjects.length > 0) {
          subjects.forEach((s: any, idx: number) => {
            const registered = this.decodeSubjectReference(s.external_patient_ref);
            const relLower = (registered.relationship || s.relationship || '').toLowerCase();
            const isDad = relLower.includes('father') || relLower.includes('dad');
            const isMom = relLower.includes('mother') || relLower.includes('mom');

            const personId = s.id || (isDad ? 'dad' : (isMom ? 'mom' : `subject-${idx}`));
            if (s.id) {
              this.subjectIdMap[personId] = s.id;
              this.subjectIdMap[s.id] = s.id;
              if (isDad) {
                this.subjectIdMap['dad'] = s.id;
              }
              if (isMom) {
                this.subjectIdMap['mom'] = s.id;
              }
              if (registered.name) {
                this.subjectIdMap[registered.name.toLowerCase()] = s.id;
              }
            }

            const matchedInitial = this.localMembers.find(
              (m) => m.id === personId || (registered.name && m.name.toLowerCase() === registered.name.toLowerCase())
            );

            const dynamicName =
              registered.name ||
              s.display_name ||
              matchedInitial?.name ||
              (registered.relationship ? registered.relationship : (isDad ? 'Father' : (isMom ? 'Mother' : 'Care Subject')));

            const dynamicRelation =
              registered.relationship ||
              s.relationship ||
              (isDad ? 'Father' : (isMom ? 'Mother' : 'Care Subject'));

            const defaultAvatar = isDad ? INITIAL_PEOPLE[0].avatarUrl : (isMom ? INITIAL_PEOPLE[1].avatarUrl : (idx % 2 === 0 ? INITIAL_PEOPLE[0].avatarUrl : INITIAL_PEOPLE[1].avatarUrl));

            backendMembers.push({
              id: personId,
              backendSubjectId: s.id || s.subject_id,
              name: dynamicName,
              relation: dynamicRelation,
              relationship: dynamicRelation,
              age: registered.age || matchedInitial?.age || (isDad ? 68 : (isMom ? 62 : 64)),
              city: registered.city || s.city || 'Chennai',
              country: registered.country || s.country_code || 'IN',
              timezone: registered.timezone || s.preferred_timezone || 'Asia/Kolkata',
              location: `${registered.city || s.city || 'Chennai'}, ${registered.country || 'India'}`,
              avatarUrl: matchedInitial?.avatarUrl || defaultAvatar,
              wellbeingStatus: s.latest_feeling === 'unwell' || s.latest_feeling === 'critical' ? 'attention' : 'doing-well',
              currentStatus: s.vital_summary?.blood_pressure ? `BP: ${s.vital_summary.blood_pressure}` : 'Doing well • Vitals stable',
              lastCheckIn: 'Recently'
            });
          });
        }

        // Also merge any circle members who are not yet represented
        if (Array.isArray(members) && members.length > 0) {
          members.forEach((m: any, mIdx: number) => {
            const rawName = m.display_name || m.name || (m.email ? m.email.split('@')[0] : `Member ${mIdx + 1}`);
            const cleanName = rawName.replace(/\s*\((coordinator|parent|caregiver)\)/i, '').trim();
            const exists = backendMembers.some(
              (bm) => bm.name.toLowerCase() === cleanName.toLowerCase() || (bm.backendSubjectId && bm.backendSubjectId === m.profile_id)
            );

            if (!exists) {
              const memberRole = (m.role || 'member').toLowerCase();
              const relation = memberRole.charAt(0).toUpperCase() + memberRole.slice(1);
              backendMembers.push({
                id: m.profile_id || m.id || `member-${mIdx}`,
                backendSubjectId: m.profile_id || m.id,
                name: cleanName,
                relation: relation,
                relationship: relation,
                age: memberRole === 'parent' ? 68 : (memberRole === 'coordinator' ? 36 : 30),
                city: memberRole === 'coordinator' ? 'London' : 'Chennai',
                country: memberRole === 'coordinator' ? 'UK' : 'IN',
                timezone: memberRole === 'coordinator' ? 'Europe/London' : 'Asia/Kolkata',
                location: memberRole === 'coordinator' ? 'London, UK' : 'Chennai, India',
                avatarUrl: memberRole === 'coordinator' ? INITIAL_PEOPLE[2].avatarUrl : (mIdx % 2 === 0 ? INITIAL_PEOPLE[0].avatarUrl : INITIAL_PEOPLE[1].avatarUrl),
                wellbeingStatus: 'doing-well',
                currentStatus: `${relation} • Active member`,
                lastCheckIn: 'Just now'
              });
            }
          });
        }

        if (backendMembers.length > 0) {
          this.localMembers = backendMembers;
          return backendMembers;
        }
      } catch (err) {
        console.warn('ApiFamilyService: Failed to fetch from backend, using local state:', err);
      } finally {
        this.getFamilyMembersPromise = null;
      }
      return this.localMembers;
    })();

    return this.getFamilyMembersPromise;
  }

  async resolveSubjectId(personId?: string): Promise<string> {
    if (personId && this.isUUID(personId)) {
      return personId;
    }
    if (personId && this.subjectIdMap[personId]) {
      return this.subjectIdMap[personId];
    }
    // Refresh members from backend to populate subjectIdMap
    await this.getFamilyMembers();
    if (personId && this.subjectIdMap[personId]) {
      return this.subjectIdMap[personId];
    }
    // Fallback to first available valid UUID subject ID
    const validUuid = Object.values(this.subjectIdMap).find((id) => this.isUUID(id));
    return validUuid || '';
  }

  async addParent(payload: AddParentPayload): Promise<FamilyMember> {
    const isDad = payload.relationship?.toLowerCase().includes('father') || payload.relationship?.toLowerCase().includes('dad');
    const relationName = payload.relationship || (isDad ? 'Father' : 'Mother');

    let createdSubject: any = null;
    try {
      const familyId = await this.ensureFamily();
      const refPayload = {
        name: payload.name.trim(),
        age: payload.age || 65,
        city: payload.city || 'Chennai',
        country: payload.countryCode || 'IN',
        relationship: relationName,
        uid: Date.now().toString(36)
      };
      createdSubject = await this.client.subjects.create(familyId, {
        external_patient_ref: JSON.stringify(refPayload).slice(0, 255),
        preferred_timezone: payload.timezone || 'Asia/Kolkata'
      });
      console.log('ApiFamilyService: Successfully persisted parent to database:', createdSubject);
    } catch (err) {
      console.warn('ApiFamilyService: Error persisting parent to backend DB, updating local state:', err);
    }

    const newMemberId = createdSubject?.id || `parent-${Date.now()}`;
    if (createdSubject?.id) {
      this.subjectIdMap[newMemberId] = createdSubject.id;
      this.subjectIdMap[createdSubject.id] = createdSubject.id;
      this.subjectIdMap[payload.name.trim().toLowerCase()] = createdSubject.id;
      if (isDad) {
        this.subjectIdMap['dad'] = createdSubject.id;
      } else if (!this.subjectIdMap['mom']) {
        this.subjectIdMap['mom'] = createdSubject.id;
      }
      this.getFamilyMembersPromise = null;
    }

    const newMember: FamilyMember = {
      id: newMemberId,
      backendSubjectId: createdSubject?.id,
      name: payload.name,
      relation: relationName,
      relationship: relationName,
      age: payload.age || 65,
      city: payload.city || 'Chennai',
      country: payload.countryCode || 'IN',
      timezone: payload.timezone || 'Asia/Kolkata',
      location: `${payload.city || 'Chennai'}, India`,
      avatarUrl: isDad ? INITIAL_PEOPLE[0].avatarUrl : INITIAL_PEOPLE[1].avatarUrl,
      wellbeingStatus: 'doing-well',
      currentStatus: 'Doing well • Vitals stable',
      lastCheckIn: 'Just added'
    };

    this.localMembers.push(newMember);
    return newMember;
  }

  async updateCheckIn(personId: string, status: 'Good' | 'Tired' | 'Unwell'): Promise<FamilyMember> {
    const subjectUuid = await this.resolveSubjectId(personId);

    const feelingMapping: Record<string, 'great' | 'good' | 'neutral' | 'unwell' | 'critical'> = {
      'Good': 'good',
      'Tired': 'neutral',
      'Unwell': 'unwell'
    };

    try {
      const famId = await this.ensureFamily();
      await this.client.checkins.submit({
        family_id: famId,
        subject_id: subjectUuid,
        feeling: feelingMapping[status] || 'good',
        mood: status,
        notes: `Logged ${status} check-in via mobile application.`
      });
      console.log(`ApiFamilyService: Persisted check-in (${status}) in PostgreSQL for subject ${subjectUuid}`);
    } catch (err) {
      console.warn('ApiFamilyService: Error submitting check-in to backend:', err);
    }

    const idx = this.localMembers.findIndex((m) => m.id === personId || m.backendSubjectId === personId);
    if (idx !== -1) {
      const updated: FamilyMember = {
        ...this.localMembers[idx],
        wellbeingStatus: status === 'Good' ? 'doing-well' : 'attention',
        currentStatus: `Logged check-in: feeling ${status}`,
        lastCheckIn: 'Just now'
      };
      this.localMembers[idx] = updated;
      return updated;
    }

    return {
      id: personId,
      name: 'Parent',
      relation: 'Parent',
      relationship: 'Parent',
      age: 65,
      city: 'Chennai',
      country: 'IN',
      timezone: 'Asia/Kolkata',
      location: 'Chennai, India',
      avatarUrl: INITIAL_PEOPLE[0].avatarUrl,
      wellbeingStatus: status === 'Good' ? 'doing-well' : 'attention',
      currentStatus: `Logged check-in: feeling ${status}`,
      lastCheckIn: 'Just now'
    };
  }

  async listFamilyCircleMembers(): Promise<any[]> {
    try {
      const famId = await this.ensureFamily();
      const members = await this.client.families.listMembers(famId);
      return members || [];
    } catch (err) {
      console.warn('ApiFamilyService: Failed to list members from backend:', err);
      return [];
    }
  }

  async inviteMember(payload: {
    email: string;
    name?: string;
    role?: 'parent' | 'coordinator' | 'caregiver' | 'observer';
    relationship?: string;
    phone?: string;
    city?: string;
    age?: number;
  }): Promise<any> {
    const famId = await this.ensureFamily();
    const result = await this.client.families.addMember(famId, {
      email: payload.email.trim().toLowerCase(),
      name: payload.name?.trim(),
      role: payload.role || 'parent'
    });
    console.log('ApiFamilyService: Invited member successfully:', result);
    this.resetFamilyCache();
    await this.getFamilyMembers();
    return result;
  }

  async verifyCurrentUserMembership(): Promise<{ profile: any; memberships: any[]; grants: any[] } | null> {
    try {
      const token = await authService.getAccessToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${CONFIG.apiUrl}/api/v1/auth/me`, { headers });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('ApiFamilyService: Error verifying current user membership:', err);
      return null;
    }
  }

  async listConsents(): Promise<any[]> {
    try {
      const familyId = await this.ensureFamily();
      const subjectId = await this.resolveSubjectId('dad');
      return await this.client.consents.list(familyId, subjectId);
    } catch (err) {
      console.warn('ApiFamilyService: Error listing consents:', err);
      return [];
    }
  }

  async updateConsent(approved: boolean): Promise<boolean> {
    try {
      const familyId = await this.ensureFamily();
      const subjectId = await this.resolveSubjectId('dad');
      if (!approved) {
        const consents = await this.client.consents.list(familyId, subjectId);
        for (const c of consents) {
          if (c.status === 'active') {
            await this.client.consents.revoke(c.id);
          }
        }
      } else {
        const me = await this.verifyCurrentUserMembership();
        const profileId = me?.profile?.id;
        if (profileId) {
          await this.client.consents.grant({
            family_id: familyId,
            subject_id: subjectId,
            grantee_profile_id: profileId,
            scope: {
              vitals: true,
              medications: true,
              documents: true,
              messaging: true,
              appointments: true
            }
          });
        }
      }
      return true;
    } catch (err) {
      console.warn('ApiFamilyService: Error updating consent in backend:', err);
      return false;
    }
  }
}
