import { useContext, useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { AppContext } from '../../src/store/AppContext';
import { HealthDashboard } from '../../src/components/HealthDashboard';
import { BottomNavBar } from '../../src/components/Navigation';
import { QuickActionsModal } from '../../src/components/QuickActionsModal';
import { AskKinGuardianModal } from '../../src/components/AskKinGuardianModal';
import { CheckInModal } from '../../src/components/CheckInModal';

import { NotificationCenter } from '../../src/components/NotificationCenter';
import { DeviceFrame } from '../../src/components/DeviceFrame';
import { SimulatorControls } from '../../src/components/SimulatorControls';
import { useRouter } from 'expo-router';
import { authService } from '../../src/services/auth/authService';
import { realDataService } from '../../src/services/api-client/RealDataService';
import { confirmAction } from '../../src/utils/alert';

export default function CoordinatorDashboardRoute() {
  const context = useContext(AppContext);
  const router = useRouter();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [quickActionsTab, setQuickActionsTab] = useState<
    'menu' | 'log_bp' | 'add_med' | 'add_context' | 'add_appt'
  >('menu');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [dataConnection, setDataConnection] = useState<'connecting' | 'live' | 'offline'>('connecting');

  const handleLogout = async () => {
    try {
      await authService.logout();
      if (context) {
        context.setCurrentScreen('onboarding');
      }
      router.replace('/(auth)/sign-in');
    } catch (error) {
      console.error('Logout error:', error);
      if (context) {
        context.setCurrentScreen('onboarding');
      }
      router.replace('/(auth)/sign-in');
    }
  };
  const [userFamilies, setUserFamilies] = useState<any[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await authService.getStoredSession();
        if (session && (session.user.role === 'coordinator' || session.user.role === 'parent')) {
          setIsAuthenticated(true);
          
          // Load real user data
          const profile = await realDataService.getCurrentUserProfile();
          if (profile) {
            // Update context with real user data
            if (context?.setCurrentUser) {
              context.setCurrentUser({
                id: profile.id,
                name: profile.display_name,
                age: 30,
                location: profile.timezone || 'Asia/Kolkata',
                role: (profile.role === 'parent' ? 'parent' : 'coordinator'),
                relation: profile.role === 'coordinator' ? 'Coordinator' : 'Parent',
                avatarUrl: ''
              });
            }
          }
          
          // Load user's families
          const families = await realDataService.getUserFamilies();
          setUserFamilies(families);
          setDataConnection('live');
          console.log('User families:', families);
          
          // Load family members if user has families
          if (families && families.length > 0) {
            const firstFamily = families[0];
            try {
              const members = await realDataService.getFamilyMembers(firstFamily.id);
              const subjects = await realDataService.getFamilySubjects(firstFamily.id);
              const checkIns = await realDataService.getCheckIns(firstFamily.id);
              const tasks = await realDataService.getCareTasks(firstFamily.id);
              const notifs = await realDataService.getNotifications(firstFamily.id);
              
              console.log('Family members:', members);
              console.log('Care subjects:', subjects);
              console.log('Recent check-ins:', checkIns);
              console.log('Care tasks:', tasks);
              console.log('Notifications:', notifs);
              
              // Update context with real family data
              if (context && context.setFamilyName) {
                context.setFamilyName(firstFamily.name);
              }
              
              if (context && context.setPeople && subjects && subjects.length > 0) {
                context.setPeople(subjects.map((cs: any) => ({
                  id: cs.id,
                  name: JSON.parse(cs.external_patient_ref || '{}').name || 'Parent',
                  role: 'parent',
                  relationship: JSON.parse(cs.external_patient_ref || '{}').relationship || 'Family Member',
                  location: cs.preferred_timezone || 'India',
                  age: 60,
                  city: cs.preferred_timezone || 'India',
                  country: 'India',
                  timezone: cs.preferred_timezone || 'Asia/Kolkata',
                  wellbeingStatus: 'doing-well' as const
                })));
              }
              
            } catch (memberErr) {
              console.warn('Error loading family data:', memberErr);
            }
          }
          
        } else {
          setDataConnection('offline');
          router.replace('/(auth)/sign-in');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setDataConnection('offline');
        router.replace('/(auth)/sign-in');
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, [router, context]);

  if (!context || !authChecked || !isAuthenticated) {
    return (
      <View className="flex-1 bg-gradient-to-b from-slate-50 via-white to-slate-50 justify-center items-center">
        <Text className="text-slate-600">Loading...</Text>
      </View>
    );
  }

  const openQuickActionsWithTab = (
    tab: 'menu' | 'log_bp' | 'add_med' | 'add_context' | 'add_appt'
  ) => {
    setQuickActionsTab(tab);
    context.setQuickActionsOpen(true);
  };

  const currentObservation =
    context.observations[context.currentPersonId] || context.observations.dad;
  const currentPerson =
    context.people.find((p) => p.id === context.currentPersonId) || context.people[0];
  const isAtorvastatinTaken = context.medications.find((m) => m.id === 'rec-5')?.status === 'taken';

  const coordinatorNotifications = context.notifications.filter((n) => n.recipient !== 'parent');
  const unreadCount = coordinatorNotifications.filter((n) => !n.read).length;

  const activeFamily = userFamilies.length > 0 ? userFamilies[0] : null;

  return (
    <DeviceFrame>
      <View className="flex-1 relative bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <HealthDashboard
          familyName={activeFamily?.name || context.familyName}
          coordinatorName={context.coordinatorName}
          familyMembers={context.familyMembers}
          careSubjects={[]}
          recentCheckIns={[]}
          careTasks={context.careTasks}
          onLogout={() => {
            confirmAction(
              'Log Out',
              'Are you sure you want to log out of your account?',
              handleLogout,
              'Log Out'
            );
          }}
          observation={currentObservation}
          currentUserName={context.currentUser.name}
          people={context.people}
          currentPersonId={context.currentPersonId}
          onSelectPerson={context.setCurrentPersonId}
          onViewTransparency={() => router.push(`/parent/${context.currentPersonId}/insights`)}
          onOpenCheckIn={() => context.setCheckInOpen(true)}
          onAddContext={() => openQuickActionsWithTab('add_context')}
          onTalkToDoctor={() => {
            const primaryName = context.people.find((p) => p.id === context.currentPersonId)?.name || 'Parent';
            context.setAskAIQuery(
              `I'd like to consult with Dr. Sharma regarding ${primaryName}'s BP pattern of ${context.currentBP} and active steps drop.`
            );
            context.setAskAIOpen(true);
          }}
          onOpenQuickActions={(tab) => openQuickActionsWithTab(tab || 'menu')}
          onViewVitalDetail={(type, personId) => {
            const targetId = personId || context.currentPersonId || (type === 'bp' ? 'dad' : 'mom');
            context.setCurrentPersonId(targetId);
            router.push(`/parent/${targetId}`);
          }}
          currentBP={context.currentBP}
          currentGlucose={context.currentGlucose}
          isAtorvastatinTaken={isAtorvastatinTaken}
          onRemindDad={() => {
            const activeMed = context.records.find((r) => r.status === 'upcoming') || { id: 'rec-5' };
            context.sendMedicationReminder(activeMed.id);
          }}
          onContactCaregiver={() => router.push('/care')}
          onViewMedication={() => router.push('/care')}
          onOpenNotifications={() => setNotificationsOpen(true)}
          unreadCount={unreadCount}
          dataConnection={dataConnection}
          currentScenario={context.currentScenario}
          onCheckInWithDad={context.sendCheckInRequest}
        />

        <BottomNavBar
          activeTab="home"
          currentScreen="health_dashboard"
          onTabChange={(tab) => {
            if (tab === 'home') router.push('/(coordinator)');
            else if (tab === 'parents') router.push('/(coordinator)/parents');
            else if (tab === 'ask') context.setAskAIOpen(true);
            else if (tab === 'care') router.push('/(coordinator)/care');
            else if (tab === 'profile') router.push('/(coordinator)/profile');
          }}
          onOpenQuickActions={() => openQuickActionsWithTab('menu')}
          onOpenAskAI={() => context.setAskAIOpen(true)}
        />

        {/* Overlays */}
        <QuickActionsModal
          isOpen={context.quickActionsOpen}
          initialTab={quickActionsTab}
          onClose={() => context.setQuickActionsOpen(false)}
          onSelectAction={(actionType) => {
            if (actionType === 'ask') context.setAskAIOpen(true);
            else if (actionType === 'family') router.push('/(coordinator)/family-chat');
            else if (actionType === 'report') router.push('/(coordinator)/records');
          }}
          onLogVitalSuccess={context.handleManualBPLog}
          onAddMedicationSuccess={context.handleAddMedication}
          onAddAppointmentSuccess={context.handleAddAppointment}
          onAddContextSuccess={context.handleAddContextNote}
          onAddTaskSuccess={context.assignCareTask}
        />

        <AskKinGuardianModal
          isOpen={context.askAIOpen}
          onClose={() => context.setAskAIOpen(false)}
          initialQuery={context.askAIQuery}
          currentSubject={context.currentPersonId}
        />


        <CheckInModal
          isOpen={context.checkInOpen}
          person={currentPerson}
          onClose={() => context.setCheckInOpen(false)}
          onSendCheckIn={(msg) => context.showToast(`Delivered message: "${msg}"`)}
        />

        <NotificationCenter
          isOpen={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
          notifications={coordinatorNotifications}
          onMarkRead={context.handleMarkRead}
          onNavigateScreen={(screen) => {
            if (screen === 'vitals_detail') {
              router.push('/(coordinator)/parent/dad');
            } else if (screen === 'chat_view') {
              router.push('/(coordinator)/family-chat');
            } else if (screen === 'search_records') {
              router.push('/(coordinator)/records');
            } else if (screen === 'care_view') {
              router.push('/(coordinator)/care');
            } else if (screen === 'transparency_insight') {
              router.push('/(coordinator)/parent/dad/insights');
            }
          }}
          onClearAll={context.handleClearAllNotifications}
        />
      </View>
      <SimulatorControls
        onTriggerNotification={context.handleTriggerSimulation}
        onRefreshData={context.handleWearableSyncRefresh}
        isSyncing={context.isSyncing}
        currentLoopStep={context.currentLoopStep}
        onAdvanceLoop={context.handleAdvanceLoop}
        onResetLoop={context.handleResetLoop}
      />
    </DeviceFrame>
  );
}
