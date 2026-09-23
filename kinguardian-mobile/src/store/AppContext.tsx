import { createContext } from 'react';
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

export interface AppContextType {
  // --- USER SPECIFIED SHARED STATE SYSTEM ---
  currentUser: DemoUser;
  setCurrentUser: (user: DemoUser) => void;
  currentRole: DemoRole;
  familyMembers: FamilyMember[];
  selectedParent: FamilyMember;
  medications: Medication[];
  appointments: Appointment[];
  healthEvents: HealthEvent[];
  documents: HealthDocument[];
  careTasks: CareTask[];
  notifications: AppNotification[];
  aiInsights: AIInsight[];
  messages: ChatMessage[];

  // --- USER SPECIFIED STATE MUTATIONS ---
  markMedicationTaken(medicationId: string): void;
  markMedicationMissed(medicationId: string): void;
  sendMedicationReminder(medicationId: string): void;
  addCheckIn(status: 'Good' | 'Tired' | 'Unwell'): void;
  uploadDocument(newDoc: HealthDocument): void;
  completeCareTask(taskId: string): void;
  assignCareTask(task: CareTask): void;
  sendFamilyMessage(text: string): void;
  addHealthEvent(event: HealthEvent): void;
  addParent(payload: { name: string; relationship?: string; city?: string; countryCode?: string; timezone?: string; age?: number; phone?: string; }): Promise<void>;
  inviteMember(payload: { email: string; name?: string; role?: 'parent' | 'coordinator' | 'caregiver' | 'observer'; relationship?: string; phone?: string; city?: string; age?: number; }): Promise<any>;
  syncUserSession: () => Promise<void>;

  // --- PROTOTYPE NAVIGATION AND UI HELPERS (For compatibility) ---
  appMode: 'coordinator' | 'parent';
  setAppMode: (mode: 'coordinator' | 'parent') => void;
  currentScreen: ScreenView;
  setCurrentScreen: (screen: ScreenView) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentPersonId: string;
  setCurrentPersonId: (id: string) => void;
  people: Person[];
  setPeople: React.Dispatch<React.SetStateAction<Person[]>>;
  observations: Record<string, HealthObservation>;
  records: HealthRecordItem[];
  recentSearches: string[];
  setRecentSearches: React.Dispatch<React.SetStateAction<string[]>>;
  syncLogs: SyncLog[];
  chatMessages: ChatMessage[];
  currentBP: string;
  currentGlucose: string;
  isSyncing: boolean;
  bpHistory: any[];
  glucoseHistory: any[];
  quickActionsOpen: boolean;
  setQuickActionsOpen: (open: boolean) => void;
  askAIOpen: boolean;
  setAskAIOpen: (open: boolean) => void;
  askAIQuery: string;
  setAskAIQuery: (query: string) => void;
  checkInOpen: boolean;
  setCheckInOpen: (open: boolean) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  demoUsers: DemoUser[];
  switchDemoUser: (userId: string) => void;
  coordinatorName: string;
  setCoordinatorName: (name: string) => void;
  familyName: string;
  setFamilyName: (name: string) => void;

  // Backward compatible mutations
  handleManualBPLog: (vital: { systolic: number; diastolic: number; note: string }) => void;
  handleManualGlucoseLog: (val: number, note: string) => void;
  handleConfirmMedication: (id: string, name: string, taken: boolean) => void;
  handleParentCheckIn: (status: 'Good' | 'Tired' | 'Unwell') => void;
  handleUploadDocument: (newDoc: DocumentItem) => void;
  handleAddMedication: (med: { name: string; dosage: string; person: string }) => void;
  handleAddAppointment: (appt: {
    specialty: string;
    doctor: string;
    date: string;
    time: string;
  }) => void;
  handleAddContextNote: (note: string) => void;
  handleTriggerSimulation: (type: 'bp_spike' | 'missed_med' | 'cgm_sync' | 'suresh_log') => void;
  handleWearableSyncRefresh: () => void;
  handleSendMessage: (text: string) => void;
  handleMarkRead: (id: string) => void;
  handleClearAllNotifications: () => void;
  currentLoopStep: number;
  handleAdvanceLoop: () => void;
  handleResetLoop: () => void;
  consentApproved: boolean;
  setConsentApproved: (approved: boolean) => void;
  handleSetConsentApproved: (approved: boolean) => Promise<void>;
  fetchAuditLog: () => Promise<any[]>;
  fetchDatabaseStats: () => Promise<Record<string, number>>;
  syncBackendData: () => Promise<void>;
  currentScenario:
    | 'normal'
    | 'medication-missed'
    | 'guardian-moment'
    | 'new-lab-report'
    | 'upcoming-appointment'
    | 'parent-feeling-unwell'
    | 'stale-sync';
  switchScenario: (
    scenario:
      | 'normal'
      | 'medication-missed'
      | 'guardian-moment'
      | 'new-lab-report'
      | 'upcoming-appointment'
      | 'parent-feeling-unwell'
      | 'stale-sync'
  ) => void;
  sendCheckInRequest: () => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
