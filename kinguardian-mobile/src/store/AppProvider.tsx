import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { AppContext } from './AppContext';
import {
  ActiveTab,
  ScreenView,
  HealthObservation,
  HealthRecordItem,
  Person,
  AppNotification,
  DocumentItem,
  SyncLog,
  ChatMessage,
  DemoUser,
  DemoRole,
  FamilyMember,
  Medication,
  Appointment,
  HealthEvent,
  HealthDocument,
  CareTask,
  AIInsight
} from '../types';
import {
  INITIAL_PEOPLE,
  INITIAL_OBSERVATIONS,
  INITIAL_HEALTH_RECORDS,
  INITIAL_RECENT_SEARCHES,
  INITIAL_NOTIFICATIONS,
  INITIAL_DOCUMENTS,
  INITIAL_SYNC_LOGS
} from '../data/mockData';
import { realDataService } from '../services/api-client/RealDataService';
import {
  ApiFamilyService,
  ApiMedicationService,
  ApiHealthEventService,
  ApiDocumentService,
  ApiChatService,
  ApiTaskService,
  ApiNotificationService
} from '../services';
import { authService } from '../services/auth/authService';

const familyService = new ApiFamilyService();
const medicationService = new ApiMedicationService(undefined, familyService);
const healthEventService = new ApiHealthEventService(undefined, familyService);
const documentService = new ApiDocumentService(undefined, familyService);
const chatService = new ApiChatService(undefined, familyService);
const taskService = new ApiTaskService(undefined, familyService);
const notificationService = new ApiNotificationService(undefined, familyService);

export const DEMO_USERS: DemoUser[] = [
  {
    id: 'ram',
    name: 'Coordinator',
    age: 36,
    location: 'London, UK',
    role: 'coordinator',
    relation: 'Coordinator',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBjb58pDYmLPOvRb2C93qIwVmN3Z3qZ__ljM1T9ZSdVoVI9ovH8x3UkvVX2km1jcc-lJDB8XKVXGhKX0bZL8qDi2s9jgC8eOKs1TubpaykQObp6xTg11e7t9fDFBiO9G_knt_Iu91RQ6oYuQGrd_EwUBKvQprl0XXO1mrgZ2LripRVXQ9ztlZOQr21ScUbgnP5iva9lVWOYFTQ4E6180FpDmnFn1lhIDcG8awhKsT88RjoTEgkPxtmV'
  },
  {
    id: 'aniruddha',
    name: 'Aniruddha',
    age: 68,
    location: 'Chennai, India',
    role: 'parent',
    relation: 'Father',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuALvS8om7n8gN1nN9dwPrBv-8lUIiusfbDJ_24xukhktin6SS4Fum03pBDjOv6QZq7FG1zrXkOAvuYXPyd3bNWRiExOfo8jITls7X2v_F_ae2gOUZWhU50WGJItnoRtI9opmF1QBZU6bzSEV02qftPpb92imjH5svG7X7JsNrBwsRS4KyeFQ20zUd6kbGNULu6DnWuaKXcPSFfVBT19aNcq-tWb94VlGR9d-nSgRSdV7ns615jW5_9B'
  },
  {
    id: 'vandana',
    name: 'Vandana',
    age: 64,
    location: 'Chennai, India',
    role: 'parent',
    relation: 'Mother',
    avatarUrl:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=256'
  }
];


const DEFAULT_MEDICATIONS: Medication[] = [
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

const DEFAULT_CARE_TASKS: CareTask[] = [
  {
    id: 'task-1',
    personId: 'dad',
    title: 'Verify afternoon hydration',
    status: 'completed',
    dueAt: 'Today, 2:00 PM',
    priority: 'high',
    assignedTo: 'Caregiver'
  },
  {
    id: 'task-2',
    personId: 'dad',
    title: 'Walk path verification inside house',
    status: 'pending',
    dueAt: 'Today, 5:30 PM',
    priority: 'medium',
    assignedTo: 'Caregiver'
  }
];

const DEFAULT_AI_INSIGHTS: AIInsight[] = [
  {
    id: 'ins-1',
    personId: 'dad',
    title: 'Midday Step Decreased by 35%',
    summary:
      "Daily physical activity decreased today. High correlation with local heat levels (39°C).",
    type: 'observation',
    severity: 'attention',
    timeframe: 'Today',
    sources: ['Apple Health']
  }
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<DemoUser>(DEMO_USERS[0]);
  const [coordinatorName, setCoordinatorName] = useState<string>('Coordinator');
  const [familyName, setFamilyName] = useState<string>('Family Circle');
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>(DEMO_USERS);

  const setCurrentUser = (user: DemoUser) => {
    setCurrentUserState(user);
    if (user.role === 'coordinator' && user.name) {
      const clean = user.name.replace(/\s*\(coordinator\)/i, '').trim() || user.name.trim();
      setCoordinatorName(clean);
    }
  };

  const [consentApproved, setConsentApproved] = useState<boolean>(true);

  const handleToggleConsent = (approved: boolean) => {
    setConsentApproved(approved);
    familyService.updateConsent(approved).catch((e) => {
      console.warn('Could not update consent in backend:', e);
    });
  };

  const handleSetConsentApproved = async (approved: boolean): Promise<void> => {
    setConsentApproved(approved);
    await runWithSyncLoader(async () => {
      try {
        const success = await familyService.updateConsent(approved);
        if (success) {
          showToast(
            approved
              ? 'Consent granted & recorded in database.'
              : 'Consent revoked: telemetry access blocked.'
          );
        }
      } catch (err) {
        console.warn('Error updating consent in database:', err);
      }
    });
  };

  const fetchAuditLog = async (): Promise<any[]> => {
    try {
      const familyId = await familyService.ensureFamily();
      if (familyId) {
        return await familyService.client.families.getAudit(familyId);
      }
    } catch (err) {
      console.warn('Error fetching audit log:', err);
    }
    return [];
  };

  const fetchDatabaseStats = async (): Promise<Record<string, number>> => {
    try {
      const res = await familyService.client.system.stats();
      if (res && res.tables) {
        return res.tables;
      }
    } catch (err) {
      console.warn('Error fetching db stats:', err);
    }
    return {};
  };

  const [currentScenario, setCurrentScenario] = useState<
    | 'normal'
    | 'medication-missed'
    | 'guardian-moment'
    | 'new-lab-report'
    | 'upcoming-appointment'
    | 'parent-feeling-unwell'
    | 'stale-sync'
  >('normal');

  const switchDemoUser = (userId: string) => {
    const user = demoUsers.find((u) => u.id === userId) || DEMO_USERS.find((u) => u.id === userId);
    if (!user) return;

    setCurrentUser(user);
    if (user.role === 'coordinator' || user.role === 'parent') {
      setAppMode(user.role);
    }

    if (user.role === 'coordinator') {
      setCurrentScreen('health_dashboard');
      setActiveTab('home');
    } else {
      const matchPerson = people.find(
        (p) => p.id === user.id || p.backendSubjectId === user.id || p.name.toLowerCase() === user.name.toLowerCase()
      );
      setCurrentPersonId(matchPerson ? matchPerson.id : 'dad');
      setCurrentScreen('parent_dashboard');
    }

    showToast(`Persona changed to: ${user.name} (${user.location})`);
  };
  // Navigation & Screen Management
  const [currentScreen, setCurrentScreen] = useState<ScreenView>('onboarding');
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [appMode, setAppMode] = useState<'coordinator' | 'parent'>('coordinator');

  // Data States
  const [people, setPeople] = useState<Person[]>(INITIAL_PEOPLE);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(INITIAL_PEOPLE);
  const caregiverName =
    familyMembers.find(
      (member) => member.role === 'caregiver' || member.relationship?.toLowerCase().includes('caregiver')
    )?.name || (currentUser.role === 'caregiver' ? currentUser.name : 'Caregiver');
  const [currentPersonId, setCurrentPersonId] = useState<string>('dad');
  const [observations, setObservations] =
    useState<Record<string, HealthObservation>>(INITIAL_OBSERVATIONS);
  const [records, setRecords] = useState<HealthRecordItem[]>(INITIAL_HEALTH_RECORDS);
  const [recentSearches, setRecentSearches] = useState<string[]>(INITIAL_RECENT_SEARCHES);

  // Interactive prototype states
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [documents, setDocuments] = useState<DocumentItem[]>(INITIAL_DOCUMENTS);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>(INITIAL_SYNC_LOGS);

  // Real-time Vitals Telemetry States
  const [currentBP, setCurrentBP] = useState('138/88 mmHg');
  const [currentGlucose, setCurrentGlucose] = useState('98');
  const [isSyncing, setIsSyncing] = useState(false);

  // Overlays
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [askAIOpen, setAskAIOpen] = useState(false);
  const [askAIQuery, setAskAIQuery] = useState<string>('');
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentLoopStep, setCurrentLoopStep] = useState(0);

  // Vital readings history stores
  const [bpHistory, setBpHistory] = useState<any[]>([
    { date: 'Today', time: '8:45 PM', systolic: 138, diastolic: 88, source: 'Omron Monitor' },
    { date: 'Aug 16', time: '8:30 PM', systolic: 136, diastolic: 86, source: 'Omron Monitor' },
    { date: 'Aug 15', time: '9:10 PM', systolic: 140, diastolic: 90, source: 'Apple Health' },
    { date: 'Aug 14', time: '8:15 PM', systolic: 134, diastolic: 84, source: 'Omron Monitor' }
  ]);

  const [glucoseHistory, setGlucoseHistory] = useState<any[]>([
    { date: 'Today', time: '8:00 AM', glucose: 98, source: 'Dexcom G7 CGM' },
    { date: 'Yesterday', time: '8:15 AM', glucose: 102, source: 'Dexcom G7 CGM' },
    { date: 'Aug 15', time: '8:00 AM', glucose: 94, source: 'Dexcom G7 CGM' },
    { date: 'Aug 14', time: '8:30 AM', glucose: 96, source: 'Dexcom G7 CGM' }
  ]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'user',
      senderName: 'Coordinator (You)',
      senderAvatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBjb58pDYmLPOvRb2C93qIwVmN3Z3qZ__ljM1T9ZSdVoVI9ovH8x3UkvVX2km1jcc-lJDB8XKVXGhKX0bZL8qDi2s9jgC8eOKs1TubpaykQObp6xTg11e7t9fDFBiO9G_knt_Iu91RQ6oYuQGrd_EwUBKvQprl0XXO1mrgZ2LripRVXQ9ztlZOQr21ScUbgnP5iva9lVWOYFTQ4E6180FpDmnFn1lhIDcG8awhKsT88RjoTEgkPxtmV',
      text: "KinGuardian noticed the parent's steps are down 35% over the past 5 days and evening BP spiked to 138/88 mmHg. Has the caregiver checked on the afternoon walks?",
      timestamp: '3:15 PM IST (9:45 AM BST)'
    },
    {
      id: '2',
      sender: 'family',
      senderName: 'Caregiver',
      senderAvatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=256',
      text: 'The local weather is very hot this week. I advised the parent to stay indoors and do light walking inside instead. I will check hydration and log a manual BP reading this evening.',
      timestamp: '3:22 PM IST (9:52 AM BST)'
    },
    {
      id: '3',
      sender: 'family',
      senderName: 'Parent',
      senderAvatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuALvS8om7n8gN1nN9dwPrBv-8lUIiusfbDJ_24xukhktin6SS4Fum03pBDjOv6QZq7FG1zrXkOAvuYXPyd3bNWRiExOfo8jITls7X2v_F_ae2gOUZWhU50WGJItnoRtI9opmF1QBZU6bzSEV02qftPpb92imjH5svG7X7JsNrBwsRS4KyeFQ20zUd6kbGNULu6DnWuaKXcPSFfVBT19aNcq-tWb94VlGR9d-nSgRSdV7ns615jW5_9B',
      text: 'I am feeling quite fine! Staying indoors and drinking enough water. Just took my morning medication.',
      timestamp: '3:30 PM IST (10:00 AM BST)'
    }
  ]);

  const [medications, setMedications] = useState<Medication[]>(DEFAULT_MEDICATIONS);

  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: 'appt-1',
      personId: 'dad',
      doctorName: 'Dr. Sharma',
      specialty: 'Cardiology',
      date: 'Tomorrow',
      time: '10:30 AM',
      location: 'Apollo Cardiology Center, Chennai',
      status: 'upcoming'
    },
    {
      id: 'appt-2',
      personId: 'mom',
      doctorName: 'Dr. Nair',
      specialty: 'Endocrinology',
      date: 'Next Monday',
      time: '4:00 PM',
      location: 'Apollo Metabolic Clinic, Adyar, Chennai',
      status: 'upcoming'
    }
  ]);

  const [careTasks, setCareTasks] = useState<CareTask[]>(DEFAULT_CARE_TASKS);

  const [aiInsights, setAiInsights] = useState<AIInsight[]>(DEFAULT_AI_INSIGHTS);

  // Load state on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const storedScenario = await AsyncStorage.getItem('kinguardian_scenario');
        if (storedScenario) setCurrentScenario(storedScenario as any);

        const storedBP = await AsyncStorage.getItem('kinguardian_bp');
        if (storedBP) setCurrentBP(storedBP);

        const storedPeople = await AsyncStorage.getItem('kinguardian_people');
        if (storedPeople) setPeople(JSON.parse(storedPeople));

        const storedMeds = await AsyncStorage.getItem('kinguardian_medications');
        if (storedMeds) {
          const parsedMeds = JSON.parse(storedMeds);
          setMedications(Array.isArray(parsedMeds) ? parsedMeds.filter((m: any) => !m.id?.startsWith('med-rx-')) : []);
        }

        const storedNotifs = await AsyncStorage.getItem('kinguardian_notifications');
        if (storedNotifs) setNotifications(JSON.parse(storedNotifs));

        const storedTasks = await AsyncStorage.getItem('kinguardian_tasks');
        if (storedTasks) setCareTasks(JSON.parse(storedTasks));

        const storedRecords = await AsyncStorage.getItem('kinguardian_records');
        if (storedRecords) setRecords(JSON.parse(storedRecords));
      } catch (err) {
        console.warn('Failed to load persisted offline state:', err);
      }

      await syncUserSession();
    };

    loadState();

    const unsubscribe = authService.onAuthChange(() => {
      syncUserSession();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const syncUserSession = async () => {
    try {
      const session = await authService.getStoredSession();
      if (session && session.user) {
        const u = session.user;
        const role = u.role === 'parent' ? 'parent' : (u.role === 'caregiver' ? 'caregiver' : 'coordinator');
        const cleanName =
          u.displayName?.replace(/\s*\((coordinator|parent|caregiver)\)/i, '').replace(/Sync\s*\d+/i, '').trim() ||
          (u.email ? u.email.split('@')[0] : (role === 'parent' ? 'Parent' : (role === 'caregiver' ? 'Caregiver' : 'Coordinator')));

        setCurrentUser({
          id: u.id,
          name: cleanName,
          age: role === 'parent' ? 68 : (role === 'caregiver' ? 28 : 36),
          location: u.timezone ? `${u.timezone}` : (role === 'parent' ? 'Asia/Kolkata' : 'Europe/London'),
          role,
          relation: role === 'parent' ? 'Parent' : (role === 'caregiver' ? 'Caregiver' : 'Coordinator'),
          avatarUrl: role === 'parent' ? (INITIAL_PEOPLE[0].avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2') : (INITIAL_PEOPLE[2].avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330'),
          email: u.email
        });
        setAppMode(role === 'parent' ? 'parent' : 'coordinator');
      }

      // Reset family cache so new user's family is fetched afresh
      familyService.resetFamilyCache();

      // Fetch family members first so subjects & mappings are populated
      const liveMembers = await familyService.getFamilyMembers();
      if (liveMembers && liveMembers.length > 0) {
        const parents = liveMembers.filter(
          (m) =>
            m.role === 'parent' ||
            m.relationship?.toLowerCase().includes('father') ||
            m.relationship?.toLowerCase().includes('mother') ||
            m.relationship?.toLowerCase().includes('parent') ||
            m.relation?.toLowerCase().includes('father') ||
            m.relation?.toLowerCase().includes('mother') ||
            m.relation?.toLowerCase().includes('parent')
        );
        const resolvedParents = parents.length > 0 ? parents : liveMembers;
        setPeople(resolvedParents);
        setFamilyMembers(liveMembers);

        const fatherPerson = resolvedParents.find(
          (p) =>
            p.relationship?.toLowerCase().includes('father') ||
            p.relation?.toLowerCase().includes('father')
        );
        if (fatherPerson) {
          setCurrentPersonId(fatherPerson.id);
        }
      }

      // Fetch circle members to discover coordinator & caregivers dynamically
      let circleMembersList: any[] = [];
      try {
        const circleMembers = await familyService.listFamilyCircleMembers();
        circleMembersList = Array.isArray(circleMembers) ? circleMembers : [];
        const coord = circleMembersList?.find((m: any) => m.role === 'coordinator');
        if (coord && (coord.display_name || coord.name || coord.email)) {
          const rawName = coord.display_name || coord.name || coord.email.split('@')[0];
          const cleanName = rawName.replace(/\s*\(coordinator\)/i, '').replace(/Sync\s*\d+/i, '').trim() || rawName.trim();
          setCoordinatorName(cleanName);
        } else if (session?.user?.role === 'coordinator') {
          const cleanName = session.user.displayName?.replace(/\s*\(coordinator\)/i, '').replace(/Sync\s*\d+/i, '').trim() || (session.user.email ? session.user.email.split('@')[0] : 'Coordinator');
          setCoordinatorName(cleanName);
        } else {
          setCoordinatorName('Coordinator');
        }
      } catch (coordErr) {
        console.warn('syncUserSession: Error discovering coordinator:', coordErr);
      }

      // Build dynamic demoUsers from authenticated user and live family members
      const dynamicDemoUsers: DemoUser[] = [];
      if (session?.user) {
        const u = session.user;
        const role = u.role === 'parent' ? 'parent' : (u.role === 'caregiver' ? 'caregiver' : 'coordinator');
        const cleanName = u.displayName?.replace(/\s*\((coordinator|parent|caregiver)\)/i, '').replace(/Sync\s*\d+/i, '').trim() || (u.email ? u.email.split('@')[0] : (role === 'parent' ? 'Parent' : (role === 'caregiver' ? 'Caregiver' : 'Coordinator')));
        dynamicDemoUsers.push({
          id: u.id,
          name: cleanName,
          age: role === 'parent' ? 68 : (role === 'caregiver' ? 28 : 36),
          location: u.timezone || (role === 'parent' ? 'Chennai, India' : 'London, UK'),
          role,
          relation: role === 'parent' ? 'Parent' : (role === 'caregiver' ? 'Caregiver' : 'Coordinator'),
          avatarUrl: role === 'parent' ? (INITIAL_PEOPLE[0].avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2') : (INITIAL_PEOPLE[2].avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330'),
          email: u.email
        });
      }

      if (liveMembers && liveMembers.length > 0) {
        liveMembers.forEach((lm) => {
          if (!dynamicDemoUsers.some((du) => du.id === lm.id || du.name.toLowerCase() === lm.name.toLowerCase())) {
            const isCaregiver = lm.role === 'caregiver' || lm.relation?.toLowerCase().includes('caregiver') || lm.relationship?.toLowerCase().includes('caregiver');
            const isParent = !isCaregiver && (lm.relation?.toLowerCase().includes('father') || lm.relation?.toLowerCase().includes('mother') || lm.relation?.toLowerCase().includes('parent') || lm.role === 'parent' || lm.relationship?.toLowerCase().includes('parent'));
            dynamicDemoUsers.push({
              id: lm.id,
              name: lm.name,
              age: lm.age || (isCaregiver ? 28 : 65),
              location: lm.location || `${lm.city || 'Chennai'}, ${lm.country || 'India'}`,
              role: isCaregiver ? 'caregiver' : (isParent ? 'parent' : 'coordinator'),
              relation: isCaregiver ? 'Caregiver' : (lm.relation || (isParent ? 'Parent' : 'Coordinator')),
              avatarUrl: isCaregiver
                ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256'
                : (lm.avatarUrl || INITIAL_PEOPLE[0].avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2')
            });
          }
        });
      }

      // Also ensure caregivers from circleMembers are present in dynamicDemoUsers and people
      if (circleMembersList.length > 0) {
        circleMembersList.forEach((cm: any) => {
          const mRole = (cm.role || '').toLowerCase();
          const rawName = cm.display_name || cm.name || (cm.email ? cm.email.split('@')[0] : 'Member');
          const cleanName = rawName.replace(/\s*\((coordinator|parent|caregiver)\)/i, '').replace(/Sync\s*\d+/i, '').trim();
          const isCaregiver = mRole === 'caregiver' || cm.relationship?.toLowerCase().includes('caregiver');

          if (isCaregiver) {
            const caregiverId = cm.profile_id || cm.id;
            if (!dynamicDemoUsers.some((du) => du.id === caregiverId || du.name.toLowerCase() === cleanName.toLowerCase())) {
              dynamicDemoUsers.push({
                id: caregiverId,
                name: cleanName,
                age: 28,
                location: `${cm.city || 'Chennai'}, ${cm.country || 'India'}`,
                role: 'caregiver',
                relation: 'Caregiver',
                avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256',
                email: cm.email
              });
            }

            // Also ensure caregiver is in people/familyMembers
            setPeople((prev) => {
              if (prev.some((p) => p.name.toLowerCase() === cleanName.toLowerCase() || p.id === caregiverId)) {
                return prev;
              }
              return [
                ...prev,
                {
                  id: caregiverId,
                  backendSubjectId: caregiverId,
                  name: cleanName,
                  relationship: 'Caregiver',
                  relation: 'Caregiver',
                  role: 'caregiver',
                  age: 28,
                  city: cm.city || 'Chennai',
                  country: cm.country || 'India',
                  timezone: cm.timezone || 'Asia/Kolkata',
                  location: `${cm.city || 'Chennai'}, ${cm.country || 'India'}`,
                  avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256',
                  wellbeingStatus: 'doing-well' as const,
                  currentStatus: 'Caregiver • Active in Care Circle',
                  lastCheckIn: 'Just now'
                }
              ];
            });
          }
        });
      }

      if (dynamicDemoUsers.length > 0) {
        setDemoUsers(dynamicDemoUsers);
      }

      const activeSubjectId = liveMembers?.[0]?.id || 'dad';

      // Parallel fetch all database resources
      const [liveTasks, liveMeds, liveDocs, liveMsgs, liveNotifs, liveEvents] = await Promise.allSettled([
        taskService.getTasks(),
        medicationService.getMedications(activeSubjectId),
        documentService.getDocuments(activeSubjectId),
        chatService.getMessages(),
        notificationService.getNotifications(),
        healthEventService.getHealthEvents(activeSubjectId)
      ]);

      if (liveTasks.status === 'fulfilled' && liveTasks.value?.length > 0) {
        setCareTasks(liveTasks.value);
      }
      if (liveMeds.status === 'fulfilled' && liveMeds.value?.length > 0) {
        setMedications(liveMeds.value);
      }
      if (liveDocs.status === 'fulfilled' && liveDocs.value?.length > 0) {
        setDocuments(liveDocs.value as any);
      }
      if (liveMsgs.status === 'fulfilled' && liveMsgs.value?.length > 0) {
        setChatMessages(liveMsgs.value);
      }
      if (liveNotifs.status === 'fulfilled' && liveNotifs.value?.length > 0) {
        setNotifications(liveNotifs.value);
      }
      if (liveEvents.status === 'fulfilled' && liveEvents.value?.length > 0) {
        setRecords(liveEvents.value as any);
      }

      // Fetch live appointments from PostgreSQL care_tasks
      try {
        const familyId = await familyService.ensureFamily();
        const subjectUuid = await familyService.resolveSubjectId(activeSubjectId);
        if (familyId && subjectUuid) {
          const appts = await familyService.client.appointments.list(familyId, subjectUuid);
          if (appts && appts.length > 0) {
            const liveAppts: Appointment[] = appts.map((a: any) => ({
              id: a.id,
              personId: activeSubjectId,
              doctorName: a.doctor || a.title,
              specialty: a.specialty || 'Consultation',
              date: a.datetime ? new Date(a.datetime).toLocaleDateString([], { month: 'short', day: 'numeric' }) : (a.time_ist || 'Tomorrow'),
              time: a.time_ist || (a.datetime ? new Date(a.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM'),
              location: a.location || a.detail || 'Apollo Hospital, Chennai',
              status: (a.status as any) || 'upcoming'
            }));
            setAppointments(liveAppts);
          }
        }
      } catch (apptErr) {
        console.warn('syncUserSession: Error fetching live appointments:', apptErr);
      }

      // Fetch live consent status from PostgreSQL consents table
      try {
        const consents = await familyService.listConsents();
        if (consents && consents.length > 0) {
          const hasActive = consents.some((c: any) => c.status === 'active');
          setConsentApproved(hasActive);
        }
      } catch (consentErr) {
        console.warn('syncUserSession: Error fetching live consent status:', consentErr);
      }
    } catch (apiErr) {
      console.warn('syncUserSession: Error synchronizing live database state:', apiErr);
    }
  };

  // Save state on changes
  useEffect(() => {
    const saveState = async () => {
      try {
        await AsyncStorage.setItem('kinguardian_scenario', currentScenario);
        await AsyncStorage.setItem('kinguardian_bp', currentBP);
        await AsyncStorage.setItem('kinguardian_people', JSON.stringify(people));
        await AsyncStorage.setItem('kinguardian_medications', JSON.stringify(medications));
        await AsyncStorage.setItem('kinguardian_notifications', JSON.stringify(notifications));
        await AsyncStorage.setItem('kinguardian_tasks', JSON.stringify(careTasks));
        await AsyncStorage.setItem('kinguardian_records', JSON.stringify(records));
      } catch (err) {
        console.warn('Failed to save offline state:', err);
      }
    };
    saveState();
  }, [currentScenario, currentBP, people, medications, notifications, careTasks, records]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  async function runWithSyncLoader<T>(callback: () => Promise<T>): Promise<T> {
    setIsSyncing(true);
    try {
      return await callback();
    } finally {
      setIsSyncing(false);
    }
  }

  const handleManualBPLog = async (vital: {
    systolic: number;
    diastolic: number;
    note: string;
  }) => {
    await runWithSyncLoader(async () => {
      const loggedEvent = await healthEventService.logVitalEvent('dad', {
        systolic: vital.systolic,
        diastolic: vital.diastolic,
        note: vital.note
      });
      setCurrentBP(`${vital.systolic}/${vital.diastolic} mmHg`);
      const newLog = {
        date: 'Today',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        systolic: vital.systolic,
        diastolic: vital.diastolic,
        source: `Manual Log (${coordinatorName})`,
        note: vital.note
      };
      setBpHistory((prev) => [newLog, ...prev]);
      setRecords((prev) => [loggedEvent, ...prev]);
      const parentName = people.find((person) => person.id === 'dad')?.name || 'Parent';
      showToast(`Logged BP ${vital.systolic}/${vital.diastolic} on behalf of ${parentName}.`);
    });
  };

  const handleManualGlucoseLog = async (val: number, note: string) => {
    await runWithSyncLoader(async () => {
      const loggedEvent = await healthEventService.logVitalEvent('mom', {
        glucose: val,
        note
      });
      setCurrentGlucose(val.toString());
      const newLog = {
        date: 'Today',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        glucose: val,
        source: `Manual Log (${coordinatorName})`,
        note
      };
      setGlucoseHistory((prev) => [newLog, ...prev]);
      setRecords((prev) => [loggedEvent, ...prev]);
      const parentName = people.find((person) => person.id === 'mom')?.name || 'Parent';
      showToast(`Logged fasting sugar ${val} mg/dL on behalf of ${parentName}.`);
    });
  };

  const handleConfirmMedication = async (id: string, name: string, taken: boolean) => {
    // 1. Immediate optimistic state update so parent UI updates instantaneously
    setMedications((prev) =>
      prev.map((m) =>
        m.id === id || m.name.toLowerCase().includes(name.toLowerCase()) || (id === 'rec-5' && m.id === 'rec-5')
          ? { ...m, status: taken ? 'taken' : 'upcoming' }
          : m
      )
    );

    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.id === id || rec.id === 'rec-5' || rec.title?.toLowerCase().includes(name.toLowerCase())) {
          return {
            ...rec,
            status: taken ? '✓ Taken • Confirmed at 8:05 PM' : 'Active • Scheduled 8:00 PM IST'
          };
        }
        return rec;
      })
    );

    // Mark parent medication reminder notifications as read
    setNotifications((prev) =>
      prev.map((n) =>
        n.recipient === 'parent' && n.category === 'medication_reminder'
          ? { ...n, read: true }
          : n
      )
    );

    await runWithSyncLoader(async () => {
      try {
        await medicationService.markTaken(id, taken ? 'taken' : 'upcoming');
      } catch (err) {
        console.warn('ApiMedicationService error syncing adherence:', err);
      }

      const activeUserName = currentUser?.name || 'Care Subject';
      const activeUserRole = currentUser?.relation || 'Parent';

      const newLog: SyncLog = {
        id: `slog-med-${Date.now()}`,
        time: '8:05 PM',
        device: 'Manual Checklist',
        status: 'synced',
        value: taken ? '✓ Confirmed at 8:05 PM' : `Unchecked: ${name}`,
        user: `${activeUserName} (${activeUserRole})`
      };
      setSyncLogs((prev) => [newLog, ...prev]);

      if (taken) {
        const medNotif: AppNotification = {
          id: `sim-notif-med-${Date.now()}`,
          title: 'Medication Adherence Sync',
          message: `${activeUserName}'s medication was confirmed.`,
          type: 'sync',
          time: '8:05 PM',
          read: false
        };
        setNotifications((prev) => [medNotif, ...prev]);
      }

      showToast(taken ? `Confirmed ${name} taken!` : `Reset ${name} status.`);
    });
  };

  const handleParentCheckIn = async (status: 'Good' | 'Tired' | 'Unwell') => {
    await runWithSyncLoader(async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const targetSubjectId = currentPersonId || 'dad';
      const updatedPerson = await familyService.updateCheckIn(targetSubjectId, status);
      const activeUserName = currentUser?.name || updatedPerson.name || 'Care Subject';
      const activeUserRole = currentUser?.relation || updatedPerson.relation || 'Parent';

      // Clear active check-in request notification
      setNotifications((prev) =>
        prev.map((n) =>
          n.recipient === 'parent' && n.category === 'kinguardian_request' ? { ...n, read: true } : n
        )
      );

      // If Good, clear the active guardian-moment scenario
      if (currentScenario === 'guardian-moment' && status === 'Good') {
        setCurrentScenario('normal');
        setCurrentBP('120/80 mmHg');
      }

      setPeople((prev) =>
        prev.map((p) => {
          if (p.id === targetSubjectId || p.id === 'dad') {
            return {
              ...updatedPerson,
              wellbeingStatus: status === 'Good' ? ('doing-well' as const) : ('attention' as const),
              currentStatus: status === 'Good' ? "I'm feeling okay." : `Feels ${status}`,
              lastCheckIn: 'Today'
            };
          }
          return p;
        })
      );

      const newLog: SyncLog = {
        id: `slog-checkin-${Date.now()}`,
        time: 'Just now',
        device: 'Wellbeing Sync',
        status: 'synced',
        value: `Check-in: ${activeUserName} feels ${status}`,
        user: `${activeUserName} (${activeUserRole})`
      };
      setSyncLogs((prev) => [newLog, ...prev]);

      let checkinNotif: AppNotification;
      if (status === 'Tired') {
        checkinNotif = {
          id: `sim-notif-check-${Date.now()}`,
          title: `Care Alert: ${activeUserName} (${activeUserRole})`,
          message:
            `${activeUserName} logged feeling Tired 😴. Tap to message family care circle.`,
          type: 'alert',
          time: 'Just now',
          read: false,
          actionScreen: 'chat_view'
        };
      } else if (status === 'Unwell') {
        checkinNotif = {
          id: `sim-notif-check-${Date.now()}`,
          title: `Critical Care Warning: ${activeUserName} Unwell`,
          message: `${activeUserName} logged feeling Unwell 🤒. Click to trigger emergency summary check.`,
          type: 'alert',
          time: 'Just now',
          read: false,
          actionScreen: 'health_dashboard'
        };
      } else {
        checkinNotif = {
          id: `sim-notif-check-${Date.now()}`,
          title: `Check-in Sync: ${activeUserName}`,
          message: `${activeUserName} checked in: Feeling Good 😊. All active sync metrics normal.`,
          type: 'info',
          time: 'Just now',
          read: false
        };
      }

      setNotifications((prev) => [checkinNotif, ...prev]);
      showToast(`Logged status: Feeling ${status}`);
    });
  };

  const addParent = async (payload: {
    name: string;
    relationship?: string;
    city?: string;
    countryCode?: string;
    timezone?: string;
    age?: number;
    phone?: string;
  }) => {
    await runWithSyncLoader(async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const newMember = await familyService.addParent(payload);
      setPeople((prev) => {
        const filtered = prev.filter(
          (p) => p.id !== newMember.id && (!newMember.backendSubjectId || p.backendSubjectId !== newMember.backendSubjectId)
        );
        return [...filtered, newMember];
      });
      showToast(`Connected ${payload.name} (${payload.relationship || 'Parent'}) successfully.`);
    });
  };

  const inviteMember = async (payload: {
    email: string;
    name?: string;
    role?: 'parent' | 'coordinator' | 'caregiver' | 'observer';
    relationship?: string;
    phone?: string;
    city?: string;
    age?: number;
  }) => {
    return await runWithSyncLoader(async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const res = await familyService.inviteMember(payload);
      const updatedMembers = await familyService.getFamilyMembers();
      setPeople(updatedMembers);
      showToast(`Invited ${payload.name || payload.email} as ${payload.role || 'parent'}`);
      return res;
    });
  };

  const handleUploadDocument = async (newDoc: DocumentItem) => {
    await runWithSyncLoader(async () => {
      const uploadedDoc = await documentService.uploadDocument(newDoc);
      setDocuments((prev) => [uploadedDoc, ...prev]);

      const isPrescription =
        newDoc.category === 'Prescription' || (newDoc as any).classification === 'Prescription';

      const docRecord: HealthRecordItem = {
        id: `rec-doc-${Date.now()}`,
        category: 'documents',
        personId: 'dad',
        title: `OCR Snapshot Ingested: ${newDoc.name}`,
        subtitle: `${newDoc.uploader} • Description: ${newDoc.summary}`,
        date: 'Just now',
        status: 'Parsed',
        tag: 'Camera Ingest',
        icon: 'description',
        iconBgColor: 'bg-[#d9e3f6]',
        iconColor: 'text-[#464554]'
      };
      setRecords((prev) => [docRecord, ...prev]);

      // If this is a prescription, create a review task for coordinator (NOT an active daily medicine until reviewed)
      if (isPrescription) {
        const rxTask: CareTask = {
          id: `task-rx-${Date.now()}`,
          personId: 'dad',
          title: `Review Prescription: ${newDoc.name}`,
          status: 'pending',
          dueAt: 'Tomorrow, 10:00 AM',
          priority: 'high',
          assignedTo: coordinatorName
        };
        setCareTasks((prev) => [rxTask, ...prev]);
      }

      const activeUserName = currentUser?.name || 'Care Subject';
      const activeUserRole = currentUser?.relation || 'Parent';

      const newLog: SyncLog = {
        id: `slog-doc-${Date.now()}`,
        time: 'Just now',
        device: 'Camera Ingestion',
        status: 'synced',
        value: `Document snapshot upload finalized: ${newDoc.name}`,
        user: `${activeUserName} (${activeUserRole})`
      };
      setSyncLogs((prev) => [newLog, ...prev]);

      const docNotif: AppNotification = {
        id: `sim-notif-doc-${Date.now()}`,
        title: `New ${newDoc.category || (newDoc as any).classification || 'Document'} Uploaded`,
        message: `${activeUserName} uploaded a new ${newDoc.category || (newDoc as any).classification || 'document'} (${newDoc.name}). Review required.`,
        type: 'info',
        time: 'Just now',
        read: false,
        actionScreen: 'search_records',
        recipient: 'coordinator',
        category: 'document'
      };
      setNotifications((prev) => [docNotif, ...prev]);
      if ((newDoc as any).customToast) {
        showToast((newDoc as any).customToast);
      } else {
        showToast('Document transmitted to Care Circle Vault!');
      }
    });
  };

  const handleAddMedication = async (med: { name: string; dosage: string; person: string }) => {
    const pId = med.person.toLowerCase().includes('mom') ? 'mom' : 'dad';
    const newMedId = `rec-${Date.now()}`;
    const newMed: Medication = {
      id: newMedId,
      personId: pId,
      name: med.name,
      dose: med.dosage,
      frequency: 'Daily',
      scheduledTime: '9:00 AM',
      status: 'upcoming',
      adherencePercent: 100,
      prescriber: 'Assigned by Care Coordinator'
    };
    setMedications((prev) => [newMed, ...prev]);

    const medRec: HealthRecordItem = {
      id: `med-${Date.now()}`,
      category: 'medications',
      personId: pId,
      title: med.name,
      subtitle: `${med.dosage} • Prescribed medication`,
      date: 'Today',
      status: 'Active schedule',
      tag: med.person,
      icon: 'pill',
      iconBgColor: 'bg-[#86f2e4]/30',
      iconColor: 'text-[#006a61]'
    };
    setRecords((prev) => [medRec, ...prev]);

    try {
      await medicationService.markTaken(newMedId, 'upcoming');
    } catch (e) {
      console.warn('Could not record medication state to backend:', e);
    }
    showToast(`Added ${med.name} dosage schedule.`);
  };

  const handleAddAppointment = async (appt: {
    specialty: string;
    doctor: string;
    date: string;
    time: string;
  }) => {
    const apptRec: HealthRecordItem = {
      id: `appt-${Date.now()}`,
      category: 'appointments',
      personId: currentPersonId,
      title: `${appt.specialty} Consultation`,
      subtitle: `${appt.doctor} • ${appt.date} at ${appt.time}`,
      date: appt.date,
      status: 'Scheduled',
      tag: people.find((p) => p.id === currentPersonId)?.name || 'Care Subject',
      icon: 'calendar',
      iconBgColor: 'bg-rose-50',
      iconColor: 'text-[#ff3b30]'
    };
    setRecords((prev) => [apptRec, ...prev]);

    const newAppt: Appointment = {
      id: `appt-new-${Date.now()}`,
      personId: currentPersonId,
      doctorName: appt.doctor,
      specialty: appt.specialty,
      date: appt.date,
      time: appt.time,
      location: 'Apollo Clinic, Chennai',
      status: 'upcoming'
    };
    setAppointments((prev) => [newAppt, ...prev]);

    // Persist appointment & care task to PostgreSQL database
    try {
      const familyId = await familyService.ensureFamily();
      const subjectId = await familyService.resolveSubjectId(currentPersonId);
      if (familyId && subjectId) {
        await familyService.client.appointments.create(familyId, subjectId, {
          title: `Appointment: ${appt.specialty} with ${appt.doctor}`,
          detail: `Clinic visit scheduled with ${appt.doctor} (${appt.specialty}) at ${appt.time} on ${appt.date}. Location: Apollo Clinic, Chennai.`,
          scheduled_at_ist: `${appt.date} 10:00 AM`,
          preparation_notes: [
            'Carry previous blood test reports',
            'Bring current prescription medications',
            'Fasting recommended if morning visit'
          ]
        });
      }

      // Also persist to appointments table with dual timezone handling (TEST UX-001)
      await realDataService.createAppointment({
        subject_id: subjectId || 'dad',
        doctor_name: appt.doctor,
        specialty: appt.specialty,
        date: appt.date,
        time: appt.time,
        location: 'Apollo Hospital, Chennai'
      });

      const createdTask = await taskService.createTask({
        id: `task-appt-${Date.now()}`,
        personId: currentPersonId,
        title: `${appt.specialty} with ${appt.doctor}`,
        status: 'pending',
        dueAt: `${appt.date} · ${appt.time}`,
        priority: 'high',
        assignedTo: 'Care Coordinator'
      });
      setCareTasks((prev) => [createdTask, ...prev]);
    } catch (e) {
      console.warn('Could not persist appointment care task to backend:', e);
    }

    showToast(`Scheduled ${appt.specialty} appointment with ${appt.doctor}.`);
  };

  const handleAddContextNote = async (note: string) => {
    await runWithSyncLoader(async () => {
      try {
        const loggedEvent = await healthEventService.logVitalEvent(currentPersonId, {
          note
        });
        setRecords((prev) => [loggedEvent as HealthRecordItem, ...prev]);
      } catch (e) {
        console.warn('Failed to log context note to backend:', e);
        const noteRec: HealthRecordItem = {
          id: `symptom-${Date.now()}`,
          category: 'symptoms',
          personId: currentPersonId,
          title: 'Proxy caregiver log',
          subtitle: note,
          date: 'Just now',
          status: 'Shared',
          tag: people.find((person) => person.id === currentPersonId)?.name || 'Parent',
          icon: 'add_comment',
          iconBgColor: 'bg-[#e6eeff]',
          iconColor: 'text-[#2a14b4]'
        };
        setRecords((prev) => [noteRec, ...prev]);
      }
      showToast('Injected context note to clinical history.');
    });
  };

  // --- USER SPECIFIED STATE MUTATIONS ---
  const markMedicationTaken = async (medicationId: string) => {
    await runWithSyncLoader(async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const updated = await medicationService.markTaken(medicationId, 'taken');
      setMedications((prev) =>
        prev.map((m) => (m.id === medicationId ? updated : m))
      );

      if (updated.persisted === false) {
        showToast(`${updated.name} could not be saved. Please try again.`);
        return;
      }

      // Mark parent medication reminders as read
      setNotifications((prev) =>
        prev.map((n) =>
          n.recipient === 'parent' && n.category === 'medication_reminder'
            ? { ...n, read: true }
            : n
        )
      );

      // Update coordinator records view status to "✓ Confirmed at 8:05 PM"
      setRecords((prev) =>
        prev.map((rec) => {
          if (rec.id === medicationId || rec.id === 'rec-5') {
            return {
              ...rec,
              status: '✓ Confirmed at 8:05 PM'
            };
          }
          return rec;
        })
      );

      // Ingest a new coordinator notification
      const medNotif: AppNotification = {
        id: `sync-notif-med-${Date.now()}`,
        title: 'Medication Adherence Sync',
        message: `${people.find((person) => person.id === 'dad')?.name || 'Parent'}'s medication was confirmed.`,
        type: 'sync',
        time: '8:05 PM',
        read: false
      };
      setNotifications((prev) => [medNotif, ...prev]);

      showToast(`Medication ${updated.name} marked as taken.`);
    });
  };

  const markMedicationMissed = async (medicationId: string) => {
    await runWithSyncLoader(async () => {
      const updated = await medicationService.markTaken(medicationId, 'missed');
      setMedications((prev) =>
        prev.map((m) => (m.id === medicationId ? { ...m, status: 'missed' } : m))
      );
      showToast(`Medication ${updated.name} marked as missed.`);
    });
  };

  const sendMedicationReminder = async (medicationId: string) => {
    await runWithSyncLoader(async () => {
      await medicationService.sendReminder(medicationId);
      const med = medications.find((m) => m.id === medicationId);

      const parentNotif: AppNotification = {
        id: `scen-notif-remind-${Date.now()}`,
        title: `${coordinatorName} sent you a reminder. ❤️`,
        message: `Did you take your ${med?.name || 'evening medication'}?`,
        type: 'reminder',
        time: 'Just now',
        read: false,
        recipient: 'parent',
        category: 'medication_reminder'
      };
      setNotifications((prev) => [parentNotif, ...prev]);
      showToast('Reminder sent');
    });
  };

  const addCheckIn = async (status: 'Good' | 'Tired' | 'Unwell') => {
    await handleParentCheckIn(status);
  };

  const uploadDocument = async (newDoc: HealthDocument) => {
    await handleUploadDocument(newDoc);
  };

  const completeCareTask = async (taskId: string) => {
    await runWithSyncLoader(async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await taskService.completeTask(taskId);
      setCareTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'completed' } : t))
      );
      const task = careTasks.find((t) => t.id === taskId);

      const newLog: SyncLog = {
        id: `slog-task-${Date.now()}`,
        time: 'Just now',
        device: 'Care Team portal',
        status: 'synced',
        value: `Task completed: ${task?.title || 'Care Task'}`,
        user: caregiverName
      };
      setSyncLogs((prev) => [newLog, ...prev]);
      showToast('Task marked as completed in database.');
    });
  };

  const assignCareTask = async (task: CareTask) => {
    await runWithSyncLoader(async () => {
      const created = await taskService.createTask(task);
      setCareTasks((prev) => [...prev, created]);
      const newLog: SyncLog = {
        id: `slog-task-${Date.now()}`,
        time: 'Just now',
        device: 'Coordinator portal',
        status: 'synced',
        value: `Assigned new task: ${task.title} to ${task.assignedTo}`,
        user: coordinatorName
      };
      setSyncLogs((prev) => [newLog, ...prev]);
      showToast(`Assigned task: ${task.title}`);
    });
  };

  const sendFamilyMessage = (text: string) => {
    handleSendMessage(text);
  };

  const addHealthEvent = (event: HealthEvent) => {
    setRecords((prev) => [event as HealthRecordItem, ...prev]);
    showToast(`Health Event recorded: ${event.title}`);
  };

  const handleTriggerSimulation = (type: 'bp_spike' | 'missed_med' | 'cgm_sync' | 'suresh_log') => {
    let newNotif: AppNotification;

    if (type === 'bp_spike') {
      setCurrentBP('142/90 mmHg');
      const newLog = {
        date: 'Today',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        systolic: 142,
        diastolic: 90,
        source: 'Omron Monitor',
        note: 'Simulated BP spike'
      };
      setBpHistory((prev) => [newLog, ...prev]);

      const primaryName = people[0]?.name || 'Care Subject';
      newNotif = {
        id: `sim-notif-${Date.now()}`,
        title: `BP Spiking Alert (${primaryName})`,
        message:
          `${primaryName}’s evening blood pressure increased to 142/90 mmHg. KinGuardian suggests checking room temperature.`,
        type: 'alert',
        time: 'Just now',
        read: false,
        actionText: 'Analyze Vitals',
        actionScreen: 'vitals_detail',
        actionData: 'dad'
      };
    } else if (type === 'missed_med') {
      const primaryName = people[0]?.name || 'Care Subject';
      newNotif = {
        id: `sim-notif-${Date.now()}`,
        title: 'Medication Non-Adherence Alert',
        message:
          `${primaryName} has not checked off morning dose. (Scheduled 2h ago).`,
        type: 'reminder',
        time: 'Just now',
        read: false,
        actionText: 'View Med Schedule',
        actionScreen: 'care_view'
      };
    } else if (type === 'cgm_sync') {
      setCurrentGlucose('108');
      const newLog = {
        date: 'Today',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        glucose: 108,
        source: 'Dexcom G7 CGM',
        note: 'Continuous stream sync'
      };
      setGlucoseHistory((prev) => [newLog, ...prev]);

      newNotif = {
        id: `sim-notif-${Date.now()}`,
        title: 'CGM Sensor Stream Ingestion',
        message:
          `${people.find((person) => person.id === 'mom')?.name || 'Parent'}'s fasting glucose is 108 mg/dL. All metabolic trend markers are optimal.`,
        type: 'sync',
        time: 'Just now',
        read: false,
        actionText: 'View CGM Graph',
        actionScreen: 'vitals_detail',
        actionData: 'mom'
      };
    } else {
      newNotif = {
        id: `sim-notif-${Date.now()}`,
        title: `Caregiver Update: ${caregiverName}`,
        message: `${caregiverName} completed the parent's morning walking path. Vitals logged normal.`,
        type: 'info',
        time: 'Just now',
        read: false,
        actionText: 'Open Chat',
        actionScreen: 'chat_view'
      };
    }

    setNotifications((prev) => [newNotif, ...prev]);
    showToast(`Simulation triggered: ${newNotif.title}`);
  };

  const handleWearableSyncRefresh = () => {
    setIsSyncing(true);
    showToast('Starting cloud synchronization...');
    setTimeout(() => {
      setIsSyncing(false);
      showToast('Ingested 4 connected devices.');
      const newLog: SyncLog = {
        id: `slog-refresh-${Date.now()}`,
        time: 'Just now',
        device: 'Cloud Gateway',
        status: 'synced',
        value: 'Completed ambulatory sensor sweeps: 0 errors',
        user: 'System Ingest'
      };
      setSyncLogs((prev) => [newLog, ...prev]);
    }, 1500);
  };

  const handleSendMessage = async (text: string) => {
    try {
      const newMsg = await chatService.sendMessage(text);
      setChatMessages((prev) => [...prev, newMsg]);
    } catch (err) {
      console.warn('ApiChatService: Error sending message:', err);
    }
  };

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await notificationService.markRead(id);
    } catch (err) {
      console.warn('Error marking notification read in DB:', err);
    }
  };

  const handleClearAllNotifications = async () => {
    setNotifications([]);
    try {
      await notificationService.clearAll();
    } catch (err) {
      console.warn('Error clearing notifications in DB:', err);
    }
  };

  const handleResetLoop = () => {
    setCurrentLoopStep(0);
    setCurrentBP('138/88 mmHg');
    setObservations(INITIAL_OBSERVATIONS);
    showToast('Walkthrough simulation reset.');
  };

  const handleAdvanceLoop = () => {
    const nextStep = currentLoopStep === 7 ? 0 : currentLoopStep + 1;
    setCurrentLoopStep(nextStep);

    if (nextStep === 0) {
      handleResetLoop();
      return;
    }

    if (nextStep === 1) {
      setCurrentBP('142/90 mmHg');
      const newLog = {
        date: 'Today',
        time: 'Just now',
        systolic: 142,
        diastolic: 90,
        source: 'Omron Monitor',
        note: 'Walkthrough Spike'
      };
      setBpHistory((prev) => [newLog, ...prev]);
      showToast('Step 1: BP spike event logged in Chennai.');
    } else if (nextStep === 2) {
      const primaryName = people[0]?.name || 'Care Subject';
      const logItem: SyncLog = {
        id: `loop-slog-${Date.now()}`,
        time: 'Just now',
        device: 'Omron Monitor',
        status: 'synced',
        value: 'Elevated BP reading stored: 142/90 mmHg',
        user: `${primaryName} (Parent)`
      };
      setSyncLogs((prev) => [logItem, ...prev]);
      showToast('Step 2: Shared state database updated.');
    } else if (nextStep === 3) {
      const primaryName = people[0]?.name || 'Care Subject';
      setObservations((prev) => ({
        ...prev,
        dad: {
          ...prev.dad,
          primaryStatement:
            `I noticed ${primaryName}'s BP rose to 142/90 mmHg. The data shows this is different from usual pattern. You may want to discuss this with their doctor.`,
          highlightText:
            'Systolic readings rose by 12% alongside a 35% decrease in outdoor step recovery.'
        }
      }));
      showToast('Step 3: KinGuardian AI clinical reasoning computed.');
    } else if (nextStep === 4) {
      const primaryName = people[0]?.name || 'Care Subject';
      const loopNotif: AppNotification = {
        id: `loop-notif-${Date.now()}`,
        title: `Care Alert: ${primaryName}`,
        message:
          `I noticed ${primaryName}’s BP rose to 142/90 mmHg. The data shows this is different from usual pattern. You may want to discuss this with their doctor.`,
        type: 'alert',
        time: 'Just now',
        read: false,
        actionScreen: 'chat_view'
      };
      setNotifications((prev) => [loopNotif, ...prev]);
      showToast(`Step 4: ${coordinatorName} notified.`);
    } else if (nextStep === 5) {
      setActiveTab('care');
      setCurrentScreen('care_view');
      const primaryName = people[0]?.name || 'Care Subject';
      const msgCoord = {
        id: `loop-msg-coord-${Date.now()}`,
        sender: 'user' as const,
        senderName: `${coordinatorName} (You)`,
        senderAvatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBjb58pDYmLPOvRb2C93qIwVmN3Z3qZ__ljM1T9ZSdVoVI9ovH8x3UkvVX2km1jcc-lJDB8XKVXGhKX0bZL8qDi2s9jgC8eOKs1TubpaykQObp6xTg11e7t9fDFBiO9G_knt_Iu91RQ6oYuQGrd_EwUBKvQprl0XXO1mrgZ2LripRVXQ9ztlZOQr21ScUbgnP5iva9lVWOYFTQ4E6180FpDmnFn1lhIDcG8awhKsT88RjoTEgkPxtmV',
        text: `Caregiver, KinGuardian just flagged ${primaryName}'s BP is 142/90! Please check on them.`,
        timestamp: 'Just now'
      };
      setChatMessages((prev) => [...prev, msgCoord]);
      showToast(`Step 5: ${coordinatorName} messages caregiver.`);
    } else if (nextStep === 6) {
      const primaryName = people[0]?.name || 'Care Subject';
      const msgSuresh = {
        id: `loop-msg-sur-${Date.now()}`,
        sender: 'family' as const,
        senderName: `${caregiverName} (Caregiver)`,
        senderAvatar:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256',
        text: `Hello ${coordinatorName}, I am with ${primaryName} now. Provided hydration and cooling. Checking vitals now.`,
        timestamp: 'Just now'
      };
      setChatMessages((prev) => [...prev, msgSuresh]);
      showToast(`Step 6: Caregiver verified ${primaryName}, logs normal BP.`);
    } else if (nextStep === 7) {
      setCurrentBP('124/80 mmHg');
      const logItem: SyncLog = {
        id: `loop-slog-res-${Date.now()}`,
        time: 'Just now',
        device: 'Manual check',
        status: 'synced',
        value: `${caregiverName} verified BP 124/80 (Normal)`,
        user: caregiverName
      };
      setSyncLogs((prev) => [logItem, ...prev]);
      setObservations(INITIAL_OBSERVATIONS);
      showToast('Step 7: Shared state returns to normal. Loop complete!');
    }
  };

  const switchScenario = (scenario: typeof currentScenario) => {
    setCurrentScenario(scenario);

    // Reset loop walkthrough state if they change scenario manually to avoid UI conflicts
    setCurrentLoopStep(0);

    // Reset base arrays to initial values first
    let newMeds: Medication[] = [...DEFAULT_MEDICATIONS];
    let newNotifs: AppNotification[] = [...INITIAL_NOTIFICATIONS];
    let newTasks: CareTask[] = [...DEFAULT_CARE_TASKS];
    let newInsights: AIInsight[] = [...DEFAULT_AI_INSIGHTS];
    let newBP = '120/80 mmHg';
    let newPeople = [...INITIAL_PEOPLE];

    if (scenario === 'normal') {
      newPeople = newPeople.map((p) => {
        if (p.id === 'dad') {
          return {
            ...p,
            wellbeingStatus: 'doing-well' as const,
            currentStatus: 'All vitals steady & medications taken',
            lastCheckIn: 'Today 9:15 AM'
          };
        }
        if (p.id === 'mom') {
          return {
            ...p,
            wellbeingStatus: 'doing-well' as const,
            currentStatus: 'All vitals steady & medications taken'
          };
        }
        return p;
      });
      showToast('Scenario: Calming Normal activated.');
    } else if (scenario === 'medication-missed') {
      newPeople = newPeople.map((p) => {
        if (p.id === 'dad') {
          return {
            ...p,
            wellbeingStatus: 'attention' as const,
            currentStatus: 'Atorvastatin missed tonight',
            lastCheckIn: 'Today 9:15 AM'
          };
        }
        return p;
      });
      // Flag parent Atorvastatin as missed
      const missedParentName = people.find((p) => p.id === 'dad')?.name || 'Parent';
      newMeds = newMeds.map((m) => (m.id === 'rec-5' ? { ...m, status: 'missed' } : m));
      // Add notification alert
      newNotifs.unshift({
        id: `scen-notif-missed-${Date.now()}`,
        title: 'Adherence Alert: Evening Atorvastatin',
        message:
          `I noticed ${missedParentName} missed his evening Atorvastatin dose. The data shows this is different from ${missedParentName}’s usual pattern. You may want to discuss this with his doctor.`,
        type: 'alert',
        time: 'Just now',
        read: false,
        recipient: 'coordinator',
        category: 'medication'
      });
      // Add care task
      newTasks.unshift({
        id: `scen-task-missed-${Date.now()}`,
        personId: 'dad',
        title: 'Investigate missed Atorvastatin dose',
        status: 'pending',
        dueAt: 'Today · Urgent',
        priority: 'high',
        assignedTo: caregiverName
      });
      showToast('Scenario: Medication Missed activated.');
    } else if (scenario === 'guardian-moment') {
      newBP = '142/90 mmHg';
      newPeople = newPeople.map((p) => {
        if (p.id === 'dad') {
          return {
            ...p,
            wellbeingStatus: 'attention' as const,
            currentStatus: 'BP Spiking (142/90 mmHg)',
            lastCheckIn: 'Today 9:15 AM'
          };
        }
        return p;
      });
      const primaryName = people[0]?.name || 'Care Subject';
      // Add BP Spike notification
      newNotifs.unshift({
        id: `scen-notif-guard-${Date.now()}`,
        title: 'Care Alert: BP Spike',
        message:
          `I noticed ${primaryName}’s systolic blood pressure rose to 142/90 mmHg. The data shows this is different from usual pattern. You may want to discuss this with their doctor.`,
        type: 'alert',
        time: 'Just now',
        read: false,
        recipient: 'coordinator',
        category: 'health_change'
      });
      // Add care task
      newTasks.unshift({
        id: `scen-task-guard-${Date.now()}`,
        personId: 'dad',
        title: `Verify ${primaryName} hydration levels & cooling`,
        status: 'pending',
        dueAt: 'Today · Urgent',
        priority: 'high',
        assignedTo: 'Caregiver'
      });
      // Add insight
      newInsights.unshift({
        id: `scen-ins-guard-${Date.now()}`,
        personId: 'dad',
        title: 'Systolic Blood Pressure Spike',
        summary:
          `I noticed ${primaryName}'s blood pressure spiked to 142/90 mmHg. The data shows this is different from usual pattern. You may want to discuss this with their doctor.`,
        type: 'observation',
        severity: 'attention',
        timeframe: 'Just now',
        sources: ['Omron Monitor Sync']
      });
      showToast('Scenario: Guardian Moment activated.');
    } else if (scenario === 'new-lab-report') {
      const primaryName = people[0]?.name || 'Care Subject';
      newPeople = newPeople.map((p) => {
        if (p.id === 'dad') {
          return {
            ...p,
            wellbeingStatus: 'attention' as const,
            currentStatus: 'New metabolic panel results available',
            lastCheckIn: 'Today 9:15 AM'
          };
        }
        return p;
      });
      // Add document notification
      newNotifs.unshift({
        id: `scen-notif-doc-${Date.now()}`,
        title: 'Clinical Document Uploaded',
        message:
          `I noticed 6 new lab results in the report. The data shows creatinine has a slight elevation from ${primaryName}’s baseline. You may want to discuss this with their doctor.`,
        type: 'sync',
        time: 'Just now',
        read: false,
        recipient: 'coordinator',
        category: 'document'
      });
      // Add care task
      newTasks.unshift({
        id: `scen-task-doc-${Date.now()}`,
        personId: 'dad',
        title: 'Review Cardiac Metabolic Panel Report',
        status: 'pending',
        dueAt: 'Today · 5 PM',
        priority: 'medium',
        assignedTo: coordinatorName
      });
      showToast('Scenario: New Lab Report Ingestion activated.');
    } else if (scenario === 'upcoming-appointment') {
      const primaryName = people[0]?.name || 'Care Subject';
      newPeople = newPeople.map((p) => {
        if (p.id === 'dad') {
          return {
            ...p,
            wellbeingStatus: 'doing-well' as const,
            currentStatus: 'Cardiology video visit tomorrow',
            lastCheckIn: 'Today 9:15 AM'
          };
        }
        return p;
      });
      // Add appointment notification
      newNotifs.unshift({
        id: `scen-notif-appt-${Date.now()}`,
        title: 'Telehealth Visit Reminder',
        message:
          `I noticed ${primaryName} has a Cardiology telehealth video visit tomorrow at 4:00 PM IST with Dr. Sharma.`,
        type: 'reminder',
        time: '1 hour ago',
        read: false,
        recipient: 'coordinator',
        category: 'appointment'
      });
      // Add care task
      newTasks.unshift({
        id: `scen-task-appt-${Date.now()}`,
        personId: 'dad',
        title: 'Prepare consultation summaries and print CMP metrics',
        status: 'pending',
        dueAt: 'Today · 6 PM',
        priority: 'medium',
        assignedTo: coordinatorName
      });
      showToast('Scenario: Upcoming Appointment activated.');
    } else if (scenario === 'parent-feeling-unwell') {
      const primaryName = people[0]?.name || 'Care Subject';
      newBP = '138/88 mmHg';
      newPeople = newPeople.map((p) => {
        if (p.id === 'dad') {
          return {
            ...p,
            wellbeingStatus: 'attention' as const,
            currentStatus: 'Feeling Unwell',
            lastCheckIn: 'Today 11:15 AM'
          };
        }
        return p;
      });
      // Add checkin notification
      newNotifs.unshift({
        id: `scen-notif-feel-${Date.now()}`,
        title: 'Daily Check-In Alert',
        message:
          `I noticed ${primaryName} submitted a check-in feeling Unwell. The data shows this is different from usual pattern. You may want to discuss this with their doctor.`,
        type: 'alert',
        time: 'Just now',
        read: false,
        recipient: 'coordinator',
        category: 'parent_check-in'
      });
      // Add care task
      newTasks.unshift({
        id: `scen-task-feel-${Date.now()}`,
        personId: 'dad',
        title: `Call ${primaryName} and perform check-in`,
        status: 'pending',
        dueAt: 'Today · Urgent',
        priority: 'high',
        assignedTo: 'Caregiver'
      });
      showToast('Scenario: Parent Feeling Unwell activated.');
    } else if (scenario === 'stale-sync') {
      showToast('Scenario: 14h Stale Wearable Sync activated (Data availability notice).');
    } else {
      showToast('Scenario: Calming Normal activated.');
    }

    setMedications(newMeds);
    setNotifications(newNotifs);
    setCareTasks(newTasks);
    setAiInsights(newInsights);
    setCurrentBP(newBP);
    setPeople(newPeople);
  };

  const sendCheckInRequest = () => {
    const checkinNotif: AppNotification = {
      id: `scen-notif-req-${Date.now()}`,
      title: 'Check-in Request 🛡️',
      message: `${coordinatorName} wants to know how you are feeling today. Tap to check-in.`,
      type: 'reminder',
      time: 'Just now',
      read: false,
      recipient: 'parent',
      category: 'kinguardian_request'
    };
    setNotifications((prev) => [checkinNotif, ...prev]);
    showToast(`Check-in request sent to ${people.find((p) => p.id === 'dad')?.name || 'Parent'}.`);
  };

  return (
    <AppContext.Provider
      value={{
        // --- USER SPECIFIED SHARED STATE SYSTEM ---
        currentUser,
        setCurrentUser,
        currentRole: (currentUser.role as DemoRole) || appMode,
        familyMembers,
        setFamilyMembers,
        selectedParent: people.find((p) => p.id === currentPersonId) || people[0],
        medications,
        appointments,
        healthEvents: records,
        documents,
        careTasks,
        notifications,
        aiInsights,
        messages: chatMessages,

        // --- USER SPECIFIED STATE MUTATIONS ---
        markMedicationTaken,
        markMedicationMissed,
        sendMedicationReminder,
        addCheckIn,
        uploadDocument,
        completeCareTask,
        assignCareTask,
        sendFamilyMessage,
        addHealthEvent,
        addParent,
        inviteMember,
        syncUserSession,

        // --- PROTOTYPE NAVIGATION AND UI HELPERS (For compatibility) ---
        demoUsers,
        switchDemoUser,
        coordinatorName,
        setCoordinatorName,
        familyName,
        setFamilyName,
        appMode,
        setAppMode,
        currentScreen,
        setCurrentScreen,
        activeTab,
        setActiveTab,
        currentPersonId,
        setCurrentPersonId,
        people,
        setPeople,
        observations,
        records,
        recentSearches,
        setRecentSearches,
        syncLogs,
        chatMessages,
        currentBP,
        currentGlucose,
        isSyncing,
        bpHistory,
        glucoseHistory,
        quickActionsOpen,
        setQuickActionsOpen,
        askAIOpen,
        setAskAIOpen,
        askAIQuery,
        setAskAIQuery,
        checkInOpen,
        setCheckInOpen,
        toastMessage,
        showToast,
        handleManualBPLog,
        handleManualGlucoseLog,
        handleConfirmMedication,
        handleParentCheckIn,
        handleUploadDocument,
        handleAddMedication,
        handleAddAppointment,
        handleAddContextNote,
        handleTriggerSimulation,
        handleWearableSyncRefresh,
        handleSendMessage,
        handleMarkRead,
        handleClearAllNotifications,
        currentLoopStep,
        handleAdvanceLoop,
        handleResetLoop,
        consentApproved,
        setConsentApproved: handleToggleConsent,
        handleSetConsentApproved,
        fetchAuditLog,
        fetchDatabaseStats,
        syncBackendData: async () => {
          await syncUserSession();
        },
        currentScenario,
        switchScenario,
        sendCheckInRequest
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
