import React from 'react';
import TestRenderer from 'react-test-renderer';
import { HealthDashboard } from '../src/components/HealthDashboard';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }) }));
jest.mock('../src/services/health/GoogleFitService', () => ({
  googleFitService: { startRealTimeStreaming: jest.fn(), stopRealTimeStreaming: jest.fn(), subscribe: jest.fn(() => jest.fn()) }
}));

it('debug dump', () => {
  let tree: any;
  TestRenderer.act(() => {
    tree = TestRenderer.create(
    <HealthDashboard
      observation={{ title: 'x', highlightText: 'y' } as any}
      currentUserName="Coordinator"
      people={[{ id: 'dad', name: 'Dad', role: 'parent' as const, relationship: 'Father', location: 'Chennai, India', age: 68, wellbeingStatus: 'doing-well' as const }] as any}
      currentPersonId="dad"
      onSelectPerson={jest.fn()}
      onViewTransparency={jest.fn()}
      onOpenCheckIn={jest.fn()}
      onTalkToDoctor={jest.fn()}
      onOpenQuickActions={jest.fn()}
      onViewVitalDetail={jest.fn()}
      currentBP="120/80"
      currentGlucose="98"
      isAtorvastatinTaken={false}
      onRemindDad={jest.fn()}
      onContactCaregiver={jest.fn()}
      onViewMedication={jest.fn()}
      onOpenNotifications={jest.fn()}
      unreadCount={1}
    />
    );
  });
  const s = JSON.stringify(tree.toJSON());
  console.log('HAS_MEDICATION>>>', s.includes('Medication'));
  console.log('HAS_CARE_TASKS>>>', s.includes("Today's Care tasks"));
  console.log('HAS_PENDING>>>', s.includes('Pending'));
  console.log('HAS_APPOINTMENT>>>', s.includes('Appointment'));
  console.log('HAS_OPTIMAL>>>', s.includes('All Statuses Optimal'));
  console.log('LEN>>>', s.length);
  expect(true).toBe(true);
});
