import { useContext, useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { AppContext } from '../../src/store/AppContext';
import { ParentModeDashboard } from '../../src/components/ParentModeDashboard';
import { ParentBottomNavBar } from '../../src/components/Navigation';
import { ParentVoiceModal } from '../../src/components/ParentVoiceModal';
import { ParentCameraModal } from '../../src/components/ParentCameraModal';
import { NotificationCenter } from '../../src/components/NotificationCenter';
import { DeviceFrame } from '../../src/components/DeviceFrame';
import { SimulatorControls } from '../../src/components/SimulatorControls';
import { useRouter } from 'expo-router';
import { authService } from '../../src/services/auth/authService';
import { realDataService } from '../../src/services/api-client/RealDataService';

export default function ParentDashboardRoute() {
  const context = useContext(AppContext);
  const router = useRouter();

  const [parentVoiceOpen, setParentVoiceOpen] = useState(false);
  const [parentCameraOpen, setParentCameraOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await authService.getStoredSession();
        if (session && (session.user.role === 'parent' || session.user.role === 'coordinator')) {
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
                role: (profile.role === 'coordinator' ? 'coordinator' : 'parent'),
                relation: profile.role === 'coordinator' ? 'Coordinator' : 'Parent',
                avatarUrl: ''
              });
            }
          }
          
          // Load user's families
          const families = await realDataService.getUserFamilies();
          console.log('User families:', families);

          if (families && families.length > 0) {
            try {
              const members = await realDataService.getFamilyMembers(families[0].id);
              const subjects = await realDataService.getFamilySubjects(families[0].id);
              
              // Get first subject for check-ins and meds
              const firstSubject = subjects.length > 0 ? subjects[0] : null;
              
              const checkIns = await realDataService.getCheckIns(families[0].id, firstSubject?.id);
              const meds = await realDataService.getMedicationAdherence(families[0].id, firstSubject?.id);
              
              const coord = members?.find((m: any) => m.role === 'coordinator');
              if (coord) {
                const rawName = coord.display_name || (coord as any).name || (coord.email ? coord.email.split('@')[0] : '');
                if (rawName && context?.setCoordinatorName) {
                  const cleanName = rawName.replace(/\s*\(coordinator\)/i, '').trim().split(' ')[0] || rawName.trim();
                  context.setCoordinatorName(cleanName);
                }
              }
              
              // Set family name
              if (context?.setFamilyName) {
                context.setFamilyName(families[0].name);
              }
              
              // Update people with care subjects
              if (context?.setPeople && subjects && subjects.length > 0) {
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
              
              console.log('Care subjects:', subjects);
              console.log('Recent check-ins:', checkIns);
              console.log('Medication adherence:', meds);
              
            } catch (memberErr) {
              console.warn('Parent index: error finding coordinator name:', memberErr);
            }
          }
          
        } else {
          router.replace('/(auth)/sign-in');
        }
      } catch (error) {
        console.error('Auth check error:', error);
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

  const isAtorvastatinTaken =
    context.records
      .find((r) => r.id === 'rec-5')
      ?.status?.toLowerCase()
      .includes('taken') || false;

  const parentNotifications = context.notifications.filter((n) => n.recipient === 'parent');
  const unreadCount = parentNotifications.filter((n) => !n.read).length;

  // Resolve current active parent subject
  const currentParentSubject =
    context.people.find((p) => p.id === context.currentPersonId || p.backendSubjectId === context.currentPersonId) ||
    context.people.find((p) => p.role === 'parent' || p.relationship === 'Father' || p.relationship === 'Mother') ||
    context.people[0];

  const parentSubjectId = currentParentSubject?.id || 'dad';

  return (
    <DeviceFrame>
      <View className="flex-1 relative bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <ParentModeDashboard
          medications={context.records.filter(
            (r) => r.category === 'medications' && (r.personId === parentSubjectId || r.personId === 'dad' || !r.personId)
          )}
          onConfirmMedication={context.handleConfirmMedication}
          onCheckIn={context.handleParentCheckIn}
          onOpenVoice={() => setParentVoiceOpen(true)}
          dadStatus={currentParentSubject?.currentStatus || ''}
          isAtorvastatinTaken={isAtorvastatinTaken}
          onOpenNotifications={() => setNotificationsOpen(true)}
          unreadCount={unreadCount}
        />

        <ParentVoiceModal
          isOpen={parentVoiceOpen}
          onClose={() => setParentVoiceOpen(false)}
          onConfirmTimeline={(msg) => {
            context.handleAddContextNote(`Voice Check-in: ${msg}`);
          }}
        />

        <ParentCameraModal
          isOpen={parentCameraOpen}
          onClose={() => setParentCameraOpen(false)}
          onUploadDocument={context.handleUploadDocument}
        />

        <NotificationCenter
          isOpen={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
          notifications={parentNotifications}
          onMarkRead={context.handleMarkRead}
          onNavigateScreen={(screen) => {
            if (screen === 'chat_view') {
              router.push('/(parent)/ask');
            } else if (screen === 'care_view') {
              router.push('/(parent)/medicines');
            }
          }}
          onClearAll={context.handleClearAllNotifications}
        />

        <ParentBottomNavBar
          activeTab="home"
          onTabChange={(tab) => {
            if (tab === 'medicines') router.push('/(parent)/medicines');
            else if (tab === 'ask') router.push('/(parent)/ask');
            else if (tab === 'profile') router.push('/(parent)/profile');
          }}
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
