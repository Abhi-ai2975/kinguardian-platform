/**
 * Functional and Unit Test Suite for Coordinator Scenarios:
 * - COORD-001 (P1): New coordinator onboarding flow, creating family context and routing to Coordinator Home.
 * - COORD-002 (P1): Parent has no recent events -> Home displays appropriate reassurance and data-availability state without false alerts.
 * - COORD-003 (P0): Guardian Moment exists for Dad -> Home displays prominent, actionable card citing underlying quantitative data.
 * - COORD-004 (P1): Dad medication due today -> Medication status and next action visible on Home without navigating through raw clinical records.
 * - COORD-005 (P1): Dad has appointment tomorrow -> Upcoming appointment shows local parent time and timezone context.
 * - COORD-006 (P1): Multiple notifications exist -> Notifications grouped intelligently, can be opened/dismissed.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../src/services/auth/authService';
import { realDataService } from '../src/services/api-client/RealDataService';
import { HealthDashboard } from '../src/components/HealthDashboard';
import { OnboardingScreen } from '../src/components/OnboardingScreen';
import { NotificationCenter } from '../src/components/NotificationCenter';
import { formatAppointmentTimeForCoordinator } from '../src/utils/timezone';

// Mock router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  })
}));

// Mock GoogleFitService streaming
jest.mock('../src/services/health/GoogleFitService', () => ({
  googleFitService: {
    startRealTimeStreaming: jest.fn(),
    stopRealTimeStreaming: jest.fn(),
    subscribe: jest.fn(() => jest.fn())
  }
}));

describe('Coordinator Functional Scenarios (COORD-001 - COORD-006)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await authService.clearSession();
    jest.clearAllMocks();
  });

  // =========================================================================
  // TEST COORD-001: New Coordinator Onboarding Flow & Family Context Creation
  // =========================================================================
  describe('COORD-001: New Coordinator Onboarding & Family Context', () => {
    it('creates family context and membership when completeCoordinatorOnboarding is called', async () => {
      const mockApiResponse = {
        status: 'completed',
        message: 'Coordinator onboarding completed successfully',
        family_id: 'fam-uuid-101',
        membership_id: 'mem-uuid-101',
        route: '/(coordinator)',
        membership_created: true
      };

      jest.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockApiResponse)
        } as any)
      );

      const result = await realDataService.completeCoordinatorOnboarding({
        location: 'UK',
        timezone: 'Europe/London',
        family_name: 'Sharma Family Care Circle',
        parent: {
          name: 'Dad',
          relationship: 'Father',
          city: 'Chennai',
          age: 68
        }
      });

      expect(result.status).toBe('completed');
      expect(result.membership_created).toBe(true);
      expect(result.route).toBe('/(coordinator)');
      expect(result.family_id).toBe('fam-uuid-101');
    });

    it('completes the interactive OnboardingScreen steps and triggers onComplete to Coordinator Home', async () => {
      const onCompleteMock = jest.fn();
      jest.spyOn(realDataService, 'completeCoordinatorOnboarding').mockResolvedValueOnce({
        status: 'completed',
        family_id: 'fam-test-123'
      });

      // Render at final step 7 (Connected screen)
      const { getByText } = await render(<OnboardingScreen initialStep={7} onComplete={onCompleteMock} />);

      expect(getByText('Connected!')).toBeTruthy();
      expect(getByText(/You're now connected to your family/i)).toBeTruthy();

      const connectButton = getByText('Connect Parents');
      fireEvent.press(connectButton);

      await waitFor(() => {
        expect(onCompleteMock).toHaveBeenCalledWith(
          expect.objectContaining({
            userLoc: 'UK',
            parentLoc: 'India'
          })
        );
      });
    });
  });

  // =========================================================================
  // TEST COORD-002: Parent Has No Recent Events -> Reassurance & Data Availability State
  // =========================================================================
  describe('COORD-002: Parent Has No Recent Events -> Reassurance State', () => {
    it('displays reassurance state and data-availability indicator without any false alerts', async () => {
      const mockObservation = {
        title: 'Morning Routine Optimal',
        highlightText: 'Dad completed morning medication and vital check-in on schedule.'
      };

      const mockPeople = [
        {
          id: 'dad',
          name: 'Dad',
          role: 'parent' as const,
          relationship: 'Father',
          location: 'Chennai, India',
          age: 68,
          wellbeingStatus: 'doing-well' as const
        }
      ];

      const { getByTestId, getByText, queryByTestId, queryByText } = await render(
        <HealthDashboard
          observation={mockObservation as any}
          currentUserName="Coordinator"
          people={mockPeople as any}
          currentPersonId="dad"
          onSelectPerson={jest.fn()}
          onViewTransparency={jest.fn()}
          onOpenCheckIn={jest.fn()}
          onTalkToDoctor={jest.fn()}
          onOpenQuickActions={jest.fn()}
          onViewVitalDetail={jest.fn()}
          currentBP="120/80"
          currentGlucose="98"
          isAtorvastatinTaken={true}
          onRemindDad={jest.fn()}
          onContactCaregiver={jest.fn()}
          onViewMedication={jest.fn()}
          onOpenNotifications={jest.fn()}
          unreadCount={0}
          currentScenario="normal"
          recentCheckIns={[]} // No recent events
        />
      );

      // Verify Reassurance Card is rendered
      const reassuranceCard = getByTestId('reassurance-card');
      expect(reassuranceCard).toBeTruthy();
      expect(getByText('All Statuses Optimal')).toBeTruthy();
      expect(getByText('Zero False Alerts')).toBeTruthy();
      expect(getByText(/Routine is stable with no urgent notifications/i)).toBeTruthy();

      // Verify Data Availability State is confirmed
      const dataAvailability = getByTestId('data-availability-indicator');
      expect(dataAvailability).toBeTruthy();
      expect(getByText(/Data Available • Routine Monitoring Active/i)).toBeTruthy();
      expect(getByText(/Absence of notifications represents reassuring normal status/i)).toBeTruthy();

      // Ensure NO false alert / alert warning card is displayed
      expect(queryByTestId('guardian-moment-card')).toBeNull();
      expect(queryByText('Vitals threshold alert')).toBeNull();
    });
  });

  // =========================================================================
  // TEST COORD-003: Guardian Moment Exists for Dad -> Prominent, Actionable, Citing Data
  // =========================================================================
  describe('COORD-003: Guardian Moment Exists for Dad', () => {
    it('displays prominent and actionable Guardian Moment card citing underlying quantitative data', async () => {
      const mockObservation = {
        title: 'Morning Routine Optimal',
        highlightText: 'Vitals stable.'
      };

      const mockPeople = [
        {
          id: 'dad',
          name: 'Dad',
          role: 'parent' as const,
          relationship: 'Father',
          location: 'Chennai, India',
          age: 68,
          wellbeingStatus: 'doing-well' as const
        }
      ];

      const mockGuardianMoment = {
        id: 'gm-test-1',
        title: 'Step activity decrease detected',
        summary: 'Activity dropped 34% below 30-day baseline over the last 5 days for Dad.',
        observation: 'Daily steps decreased from 5,200 to 3,420 steps/day. Normal vital patterns rule out acute cardiac event.',
        sources: 'Wearable activity telemetry (Google Fit / Health Connect API); Daily symptom check-in',
        confidence: 0.95,
        citations: [
          { source: 'Wearable Telemetry (Google Fit / Health Connect API)', metric: '-34.2% drop' },
          { source: 'Daily Symptom Check-in', note: 'Fatigue reported' },
          { source: '30-Day Activity Baseline', value: '5,200 → 3,420 steps/day' }
        ]
      };

      const onCheckInMock = jest.fn();
      const onViewTransparencyMock = jest.fn();
      const onTalkToDoctorMock = jest.fn();

      const { getByTestId, getByText } = await render(
        <HealthDashboard
          observation={mockObservation as any}
          currentUserName="Coordinator"
          people={mockPeople as any}
          currentPersonId="dad"
          onSelectPerson={jest.fn()}
          onViewTransparency={onViewTransparencyMock}
          onOpenCheckIn={jest.fn()}
          onTalkToDoctor={onTalkToDoctorMock}
          onOpenQuickActions={jest.fn()}
          onViewVitalDetail={jest.fn()}
          currentBP="120/80"
          currentGlucose="98"
          isAtorvastatinTaken={true}
          onRemindDad={jest.fn()}
          onContactCaregiver={jest.fn()}
          onViewMedication={jest.fn()}
          onOpenNotifications={jest.fn()}
          unreadCount={1}
          guardianMoment={mockGuardianMoment}
          onCheckInWithDad={onCheckInMock}
        />
      );

      // 1. Prominent visual presence
      const gmCard = getByTestId('guardian-moment-card');
      expect(gmCard).toBeTruthy();
      expect(getByText('Guardian Moment • Dad')).toBeTruthy();
      expect(getByText('AI Observation • 95% Confidence')).toBeTruthy();
      expect(getByText('Step activity decrease detected')).toBeTruthy();

      // 2. Summary cites underlying quantitative data
      expect(getByText(/Activity dropped 34% below 30-day baseline over the last 5 days for Dad/i)).toBeTruthy();
      expect(getByText(/Daily steps decreased from 5,200 to 3,420 steps\/day/i)).toBeTruthy();
      expect(getByText(/Wearable Telemetry \(Google Fit \/ Health Connect API\)/i)).toBeTruthy();
      expect(getByText('-34.2% drop')).toBeTruthy();
      expect(getByText('5,200 → 3,420 steps/day')).toBeTruthy();
      expect(getByText('Fatigue reported')).toBeTruthy();

      // 3. Actionable controls
      const checkInButton = getByTestId('guardian-moment-checkin-button');
      expect(checkInButton).toBeTruthy();
      fireEvent.press(checkInButton);
      expect(onCheckInMock).toHaveBeenCalledTimes(1);

      const reviewTrendButton = getByTestId('guardian-moment-trend-button');
      expect(reviewTrendButton).toBeTruthy();
      fireEvent.press(reviewTrendButton);
      expect(onViewTransparencyMock).toHaveBeenCalledTimes(1);

      const consultDoctorButton = getByTestId('guardian-moment-consult-button');
      expect(consultDoctorButton).toBeTruthy();
      fireEvent.press(consultDoctorButton);
      expect(onTalkToDoctorMock).toHaveBeenCalledTimes(1);

      const dismissButton = getByTestId('guardian-moment-dismiss-button');
      expect(dismissButton).toBeTruthy();
    });
  });

  // =========================================================================
  // TEST COORD-004: Dad Medication Due Today -> Status & Next Action on Home
  // =========================================================================
  describe('COORD-004: Dad Medication Due Today', () => {
    const mockPeople = [
      {
        id: 'dad',
        name: 'Dad',
        role: 'parent' as const,
        relationship: 'Father',
        location: 'Chennai, India',
        age: 68,
        wellbeingStatus: 'doing-well' as const
      }
    ];

    const baseProps = {
      observation: { title: 'Medication due today', highlightText: 'Evening dose pending.' } as any,
      currentUserName: 'Coordinator',
      people: mockPeople as any,
      currentPersonId: 'dad',
      onSelectPerson: jest.fn(),
      onViewTransparency: jest.fn(),
      onOpenCheckIn: jest.fn(),
      onTalkToDoctor: jest.fn(),
      onOpenQuickActions: jest.fn(),
      onViewVitalDetail: jest.fn(),
      currentBP: '120/80',
      currentGlucose: '98',
      onContactCaregiver: jest.fn(),
      onViewMedication: jest.fn(),
      onOpenNotifications: jest.fn(),
      unreadCount: 1
    };

    it('shows medication due status and a direct next action on Home without navigating to raw clinical records', async () => {
      const onRemindDadMock = jest.fn();

      const { getByText } = await render(
        <HealthDashboard
          {...baseProps}
          isAtorvastatinTaken={false}
          onRemindDad={onRemindDadMock}
        />
      );

      // 1. Medication status visible directly on Home (Today's Care tasks)
      expect(getByText('Medication')).toBeTruthy();
      expect(getByText(/Atorvastatin 20mg • Evening dosage/i)).toBeTruthy();
      expect(getByText('Pending')).toBeTruthy();

      // 2. Next action available inline - no navigation through raw clinical records
      const remindButton = getByText(/Remind .* to take Atorvastatin/i);
      expect(remindButton).toBeTruthy();
      fireEvent.press(remindButton);
      expect(onRemindDadMock).toHaveBeenCalledTimes(1);

      // 3. Full medication record remains one tap away (status + quick action only on Home)
      expect(getByText('Medications & Adherence')).toBeTruthy();
    });

    it('shows Taken status and hides the reminder action once medication is confirmed', async () => {
      const { getByText, queryByText } = await render(
        <HealthDashboard
          {...baseProps}
          isAtorvastatinTaken={true}
          onRemindDad={jest.fn()}
        />
      );

      expect(getByText('Taken')).toBeTruthy();
      expect(queryByText(/Remind .* to take Atorvastatin/i)).toBeNull();
    });
  });

  // =========================================================================
  // TEST COORD-005: Dad Has Appointment Tomorrow -> Parent Local Time & Timezone Context
  // =========================================================================
  describe('COORD-005: Dad Has Appointment Tomorrow', () => {
    it('shows the upcoming appointment on Home in parent local time with timezone context', async () => {
      const mockPeople = [
        {
          id: 'dad',
          name: 'Dad',
          role: 'parent' as const,
          relationship: 'Father',
          location: 'Chennai, India',
          age: 68,
          wellbeingStatus: 'doing-well' as const
        }
      ];

      const { getByText } = await render(
        <HealthDashboard
          observation={{ title: 'Appointment tomorrow', highlightText: 'Cardiology follow-up.' } as any}
          currentUserName="Coordinator"
          people={mockPeople as any}
          currentPersonId="dad"
          onSelectPerson={jest.fn()}
          onViewTransparency={jest.fn()}
          onOpenCheckIn={jest.fn()}
          onTalkToDoctor={jest.fn()}
          onOpenQuickActions={jest.fn()}
          onViewVitalDetail={jest.fn()}
          currentBP="120/80"
          currentGlucose="98"
          isAtorvastatinTaken={true}
          onRemindDad={jest.fn()}
          onContactCaregiver={jest.fn()}
          onViewMedication={jest.fn()}
          onOpenNotifications={jest.fn()}
          unreadCount={0}
          currentScenario="upcoming-appointment"
        />
      );

      // Appointment shown on Home with parent-local (Chennai) time and IST timezone context
      expect(getByText('Appointment')).toBeTruthy();
      expect(getByText(/Tomorrow 4:00 PM IST/i)).toBeTruthy();
      expect(getByText('Scheduled')).toBeTruthy();
      expect(getByText(/Prepare for appointment/i)).toBeTruthy();
    });

    it('formats dual timezone display: coordinator sees IST with BST/GMT context, parent sees plain local time', () => {
      const result = formatAppointmentTimeForCoordinator('4:00 PM', 'Europe/London');

      // Parent (Chennai) sees plain local time; coordinator sees IST plus their own timezone
      expect(result.parentDisplay).toBe('4:00 PM');
      expect(result.coordinatorDisplay).toMatch(/^4:00 PM IST \((11:30 AM BST|10:30 AM GMT)\)$/);
      expect(result.dualDisplay).toContain('4:00 PM IST');
      expect(result.dualDisplay).toMatch(/London: (11:30 AM BST|10:30 AM GMT)/);
    });
  });

  // =========================================================================
  // TEST COORD-006: Multiple Notifications Exist -> Grouping, Open, Dismiss
  // =========================================================================
  describe('COORD-006: Multiple Notifications Exist', () => {
    const mockNotifications = [
      {
        id: 'n1',
        title: 'Dad medication reminder',
        message: 'Dad has Atorvastatin due at 8:00 PM IST.',
        type: 'reminder' as const,
        time: '10:25 AM',
        read: false,
        actionText: 'View medication',
        actionScreen: 'medications' as any,
        actionData: { subjectId: 'dad' }
      },
      {
        id: 'n2',
        title: 'Dad checked in',
        message: 'Dad completed his morning check-in feeling good.',
        type: 'info' as const,
        time: '9:05 AM',
        read: false
      },
      {
        id: 'n3',
        title: 'Dad vitals synced',
        message: 'Wearable sync completed for Dad - BP 120/80.',
        type: 'sync' as const,
        time: '8:00 AM',
        read: false
      },
      {
        id: 'n4',
        title: 'Appointment tomorrow',
        message: 'Cardiology video visit tomorrow at 4:00 PM IST.',
        type: 'info' as const,
        time: '7:30 AM',
        read: false,
        actionScreen: 'appointments' as any
      }
    ];

    it('groups multiple Dad notifications intelligently and keeps other notifications separate', async () => {
      const { getByText, queryByText } = await render(
        <NotificationCenter
          isOpen={true}
          onClose={jest.fn()}
          notifications={mockNotifications as any}
          onMarkRead={jest.fn()}
          onNavigateScreen={jest.fn()}
          onClearAll={jest.fn()}
        />
      );

      expect(getByText('Notification Center')).toBeTruthy();
      // Intelligent grouping: 3 Dad notifications collapsed into one group entry
      expect(getByText('3 updates about Dad')).toBeTruthy();
      // Grouped items are collapsed initially
      expect(queryByText('Dad medication reminder')).toBeNull();
      // Non-Dad notification rendered individually
      expect(getByText('Appointment tomorrow')).toBeTruthy();
    });

    it('expands the group, marks grouped notifications read, and opens a notification with navigation', async () => {
      const onMarkReadMock = jest.fn();
      const onNavigateMock = jest.fn();
      const onCloseMock = jest.fn();

      const { getByText } = await render(
        <NotificationCenter
          isOpen={true}
          onClose={onCloseMock}
          notifications={mockNotifications as any}
          onMarkRead={onMarkReadMock}
          onNavigateScreen={onNavigateMock}
          onClearAll={jest.fn()}
        />
      );

      // Expand the Dad group -> all grouped notifications marked read
      fireEvent.press(getByText('3 updates about Dad'));
      expect(onMarkReadMock).toHaveBeenCalledWith('n1');
      expect(onMarkReadMock).toHaveBeenCalledWith('n2');
      expect(onMarkReadMock).toHaveBeenCalledWith('n3');

      // Individual notifications now visible
      expect(getByText('Dad medication reminder')).toBeTruthy();
      expect(getByText('Hide updates')).toBeTruthy();

      // Opening a notification with an action navigates and closes the center
      fireEvent.press(getByText('Dad medication reminder'));
      expect(onMarkReadMock).toHaveBeenCalledWith('n1');
      expect(onNavigateMock).toHaveBeenCalledWith('medications', { subjectId: 'dad' });
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it('dismisses all notifications via Clear All', async () => {
      const onClearAllMock = jest.fn();

      const { getByText } = await render(
        <NotificationCenter
          isOpen={true}
          onClose={jest.fn()}
          notifications={mockNotifications as any}
          onMarkRead={jest.fn()}
          onNavigateScreen={jest.fn()}
          onClearAll={onClearAllMock}
        />
      );

      fireEvent.press(getByText('Clear All'));
      expect(onClearAllMock).toHaveBeenCalledTimes(1);
    });

    it('shows an appropriate empty state when no notifications exist', async () => {
      const { getByText, queryByText } = await render(
        <NotificationCenter
          isOpen={true}
          onClose={jest.fn()}
          notifications={[]}
          onMarkRead={jest.fn()}
          onNavigateScreen={jest.fn()}
          onClearAll={jest.fn()}
        />
      );

      expect(getByText('No notifications yet')).toBeTruthy();
      expect(queryByText('Clear All')).toBeNull();
    });
  });
});
