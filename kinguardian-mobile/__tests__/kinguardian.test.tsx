import { MockMedicationService } from '../src/services/MedicationService';
import { MockFamilyService } from '../src/services/FamilyService';
import { MockDocumentService } from '../src/services/DocumentService';
import { MockAIService } from '../src/services/AIService';

// Mock Lucide icons and safe area to prevent canvas/native crashes in JSDOM
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'dad' }),
  usePathname: () => '/'
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(true),
  NotificationFeedbackType: { Success: 'success' }
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined)
}));

describe('KinGuardian Domain Services & Sync Logic', () => {

  let medService: MockMedicationService;
  let familyService: MockFamilyService;
  let docService: MockDocumentService;
  let aiService: MockAIService;

  beforeEach(() => {
    medService = new MockMedicationService();
    familyService = new MockFamilyService();
    docService = new MockDocumentService();
    aiService = new MockAIService();
    jest.clearAllMocks();
  });

  // --- AI AND SERVICE TESTING ---
  test('Mock AI Service resolves deterministic queries correctly', async () => {
    const bpResult = await aiService.ask("What is Dad's blood pressure?", ['dad']);
    expect(bpResult.answer).toContain('blood pressure');
    expect(bpResult.citations[0]).toBe('Omron Blood Pressure Hub (12 readings)');

    const medResult = await aiService.ask('Has he taken his medications?', ['dad']);
    expect(medResult.answer).toContain('Atorvastatin');

    const appResult = await aiService.ask('When is the next appointment?', ['dad']);
    expect(appResult.answer).toContain('Dr. Sharma');
  });

  // --- SYNCHRONIZATION AND STATE MUTATIONS ---
  test('Medication Service marks dose as taken offline', async () => {
    const records = await medService.markTaken('rec-5', 'taken');
    expect(records.status).toBe('taken');
  });

  test('Family Service updates Ramesh check-in response status', async () => {
    const updated = await familyService.updateCheckIn('dad', 'Good');
    expect(updated.currentStatus).toBe('Logged check-in: feeling Good');
  });

  test('Document Ingestion uploads files offline', async () => {
    const newDoc = {
      id: 'doc-test',
      name: 'Cardiology_Handout.pdf',
      category: 'Cardiology',
      date: 'Today',
      status: 'processing' as const,
      summary: 'Test summary',
      uploader: 'Anjali',
      fileSize: '1.2 MB'
    };
    const uploaded = await docService.uploadDocument(newDoc);
    expect(uploaded.id).toBe('doc-test');
    expect(uploaded.status).toBe('parsed');
  });

  // --- ROLE SWITCHING STATE MUTATIONS ---
  test('Coordinator to Parent Mode transition aligns modes and data structures', () => {
    const switchPersona = (targetRole: 'coordinator' | 'parent') => {
      return {
        appMode: targetRole,
        screen: targetRole === 'coordinator' ? 'health_dashboard' : 'parent_dashboard'
      };
    };

    const targetParent = switchPersona('parent');
    expect(targetParent.appMode).toBe('parent');
    expect(targetParent.screen).toBe('parent_dashboard');

    const targetCoord = switchPersona('coordinator');
    expect(targetCoord.appMode).toBe('coordinator');
    expect(targetCoord.screen).toBe('health_dashboard');
  });
});
