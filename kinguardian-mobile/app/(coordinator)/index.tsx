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
  const [userCheckIns, setUserCheckIns] = useState<any[]>([]);
  const [familyHomeData, setFamilyHomeData] = useState<any>(null);
  const [guardianMomentData, setGuardianMomentData] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
    try {
      setDataConnection('connecting');
      const session = await authService.getStoredSession();
      if (!session) {
        setIsAuthenticated(false);
        setDataConnection('offline');
        router.replace('/(auth)/sign-in');
        return;
      }

      if (session.user.role === 'parent') {
        setIsAuthenticated(false);
        router.replace('/(parent)');
        return;
      }

      if (session.user.role === 'coordinator' || session.user.role === 'caregiver') {
        const userRole = session.user.role === 'caregiver' ? 'caregiver' : 'coordinator';
        const validToken = await authService.getAccessToken();
        if (!validToken) {
          setIsAuthenticated(false);
          setDataConnection('offline');
          router.replace('/(auth)/sign-in');
          return;
        }

        setIsAuthenticated(true);
        
        // Load real user data
        const profile = await realDataService.getCurrentUserProfile();
          if (profile) {
            // Update context with real user data
            if (context?.setCurrentUser) {
              const cleanCoordName = (profile.display_name || profile.email?.split('@')[0] || 'Coordinator')
                .replace(/\s*\(coordinator\)/i, '')
                .replace(/Sync\s*\d+/i, '')
                .trim();
              context.setCurrentUser({
                id: profile.id,
                name: cleanCoordName,
                age: 30,
                location: profile.timezone || 'Asia/Kolkata',
                role: userRole,
                relation: userRole === 'caregiver' ? 'Caregiver' : 'Coordinator',
                avatarUrl: ''
              });
              if (context.setCoordinatorName) {
                context.setCoordinatorName(cleanCoordName);
              }
            }
          }
          
          // Load user's families
          const families = await realDataService.getUserFamilies();
          if (families && families.length > 0) {
            setUserFamilies(families);
            setDataConnection('live');
            console.log('User families:', families);
            
            const firstFamily = families[0];
            try {
              const members = await realDataService.getFamilyMembers(firstFamily.id);
              const subjects = await realDataService.getFamilySubjects(firstFamily.id);
              const checkIns = await realDataService.getCheckIns(firstFamily.id);
              const tasks = await realDataService.getCareTasks(firstFamily.id);
              const notifs = await realDataService.getNotifications(firstFamily.id);
              
              setUserCheckIns(checkIns || []);

              // Fetch family home state (COORD-002 reassurance & COORD-003 Guardian Moment)
              try {
                const homeData = await realDataService.getFamilyHome(firstFamily.id);
                if (homeData) {
                  setFamilyHomeData(homeData);
                  if (homeData.guardian_moment) {
                    setGuardianMomentData(homeData.guardian_moment);
                  }
                }
              } catch (homeErr) {
                console.warn('Error fetching family home:', homeErr);
              }

              // Also check direct Guardian Moment API
              try {
                const gm = await realDataService.getGuardianMoment(subjects?.[0]?.id, firstFamily.id);
                if (gm && (gm.status === 'active' || gm.prominent)) {
                  setGuardianMomentData(gm);
                }
              } catch (gmErr) {
                console.warn('Error fetching direct guardian moment:', gmErr);
              }
              
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
                const momAvatar = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=256';
                const dadAvatar = 'https://lh3.googleusercontent.com/aida-public/AB6AXuALvS8om7n8gN1nN9dwPrBv-8lUIiusfbDJ_24xukhktin6SS4Fum03pBDjOv6QZq7FG1zrXkOAvuYXPyd3bNWRiExOfo8jITls7X2v_F_ae2gOUZWhU50WGJItnoRtI9opmF1QBZU6bzSEV02qftPpb92imjH5svG7X7JsNrBwsRS4KyeFQ20zUd6kbGNULu6DnWuaKXcPSFfVBT19aNcq-tWb94VlGR9d-nSgRSdV7ns615jW5_9B';
                
                const mappedSubjects = subjects.map((cs: any) => {
                  let parsedRef: any = {};
                  try {
                    parsedRef = typeof cs.external_patient_ref === 'string'
                      ? JSON.parse(cs.external_patient_ref || '{}')
                      : (cs.external_patient_ref || {});
                  } catch (e) {
                    parsedRef = {};
                  }
                  let rawName = parsedRef.name || cs.display_name || cs.name || parsedRef.relationship || 'Parent';
                  rawName = rawName.replace(/\bsharma\b/gi, '').trim();

                  let cleanName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
                  let relation = parsedRef.relationship || cs.relationship || 'Parent';

                  const nameLower = cleanName.toLowerCase();
                  if (nameLower.includes('aniruddha')) {
                    cleanName = 'Aniruddha';
                    relation = 'Father';
                  } else if (nameLower.includes('vandana')) {
                    cleanName = 'Vandana';
                    relation = 'Mother';
                  }

                  const isMom = relation.toLowerCase().includes('mother');
                  return {
                    id: cs.id,
                    backendSubjectId: cs.id,
                    name: cleanName,
                    role: 'parent',
                    relationship: relation,
                    relation: relation,
                    avatarUrl: isMom ? momAvatar : dadAvatar,
                    location: cs.preferred_timezone || 'Asia/Kolkata',
                    age: parsedRef.age || (isMom ? 62 : 68),
                    city: parsedRef.city || 'Chennai',
                    country: 'India',
                    timezone: cs.preferred_timezone || 'Asia/Kolkata',
                    wellbeingStatus: 'doing-well' as const
                  };
                });

                // Merge any parent from members who might not be in subjects yet
                if (members && members.length > 0) {
                  const parentMembers = members.filter((m: any) => m.role === 'parent');
                  parentMembers.forEach((pm: any) => {
                    const rawName = pm.display_name || pm.name || (pm.email ? pm.email.split('@')[0] : 'Parent');
                    let cleanName = rawName.replace(/\s*\((coordinator|parent|caregiver)\)/i, '').replace(/\bsharma\b/gi, '').trim();
                    let displayName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
                    const nameLower = displayName.toLowerCase();
                    const isAni = nameLower.includes('aniruddha');
                    const isVan = nameLower.includes('vandana');
                    if (isAni) displayName = 'Aniruddha';
                    if (isVan) displayName = 'Vandana';

                    const exists = mappedSubjects.some((s: any) => {
                      const sLower = s.name?.toLowerCase() || '';
                      if (isAni && (sLower.includes('aniruddha') || s.relation === 'Father')) return true;
                      if (isVan && (sLower.includes('vandana') || s.relation === 'Mother')) return true;
                      if (sLower === displayName.toLowerCase()) return true;
                      if (pm.profile_id && (s.id === pm.profile_id || s.backendSubjectId === pm.profile_id)) return true;
                      return false;
                    });
                    if (!exists) {
                      let relation = pm.relationship || pm.relation || 'Parent';
                      if (isAni) relation = 'Father';
                      if (isVan) relation = 'Mother';
                      const isMom = relation.toLowerCase().includes('mother');
                      mappedSubjects.push({
                        id: pm.profile_id || pm.id,
                        backendSubjectId: pm.profile_id || pm.id,
                        name: displayName,
                        role: 'parent',
                        relationship: relation,
                        relation: relation,
                        avatarUrl: isMom ? momAvatar : dadAvatar,
                        location: pm.timezone || 'Asia/Kolkata',
                        age: isMom ? 62 : 68,
                        city: 'Chennai',
                        country: 'India',
                        timezone: pm.timezone || 'Asia/Kolkata',
                        wellbeingStatus: 'doing-well' as const
                      });
                    }
                  });
                }

                context.setPeople(mappedSubjects);
              }

              // Update context with the family members returned by the backend.
              if (context && context.setFamilyMembers) {
                const mappedMembers = (members && members.length > 0 ? members : []).map((m: any, mIdx: number) => {
                  const rawName = m.display_name || m.name || (m.email ? m.email.split('@')[0] : `Member ${mIdx + 1}`);
                  let cleanName = rawName.replace(/\s*\((coordinator|parent|caregiver)\)/i, '').replace(/\bsharma\b/gi, '').trim();
                  let displayName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
                  const nameLower = displayName.toLowerCase();
                  const isAni = nameLower.includes('aniruddha');
                  const isVan = nameLower.includes('vandana');
                  if (isAni) displayName = 'Aniruddha';
                  if (isVan) displayName = 'Vandana';

                  const memberRole = m.role?.toLowerCase() || 'parent';
                  const isCaregiver = memberRole === 'caregiver';
                  const isCoordinator = m.role?.toLowerCase() === 'coordinator';
                  let rel = m.relationship || m.relation || (isCaregiver ? 'Family Caregiver' : (isCoordinator ? 'Coordinator' : 'Parent'));
                  if (isAni) rel = 'Father';
                  if (isVan) rel = 'Mother';
                  return {
                    id: m.profile_id || m.id || `member-${mIdx}`,
                    backendSubjectId: m.profile_id || m.id,
                    name: displayName,
                    role: memberRole,
                    relationship: rel,
                    relation: rel,
                    age: m.age,
                    city: m.city,
                    country: m.country,
                    timezone: m.timezone,
                    location: [m.city, m.country].filter(Boolean).join(', '),
                    avatarUrl: m.avatar_url || m.avatarUrl || '',
                    wellbeingStatus: 'doing-well' as const,
                    currentStatus: `${rel} • Active member`,
                    lastCheckIn: isCaregiver ? '1 hour ago' : 'Just now'
                  };
                });

                if (mappedMembers.length > 0) {
                  context.setFamilyMembers(mappedMembers);
                  const parentMembers = mappedMembers.filter((m: any) => m.role === 'parent' || m.relationship === 'Father' || m.relationship === 'Mother' || m.relationship === 'Parent');
                  if (context.setPeople) {
                    context.setPeople((prevPeople: any[]) => {
                      const base = Array.isArray(prevPeople) && prevPeople.length > 0 ? [...prevPeople] : [];
                      parentMembers.forEach((pm: any) => {
                        const pmLower = pm.name?.toLowerCase() || '';
                        const isAni = pmLower.includes('aniruddha');
                        const isVan = pmLower.includes('vandana');
                        const exists = base.some((p: any) => {
                          const pLower = p.name?.toLowerCase() || '';
                          if (isAni && (pLower.includes('aniruddha') || p.relation === 'Father')) return true;
                          if (isVan && (pLower.includes('vandana') || p.relation === 'Mother')) return true;
                          if (pLower === pmLower) return true;
                          if (p.backendSubjectId && p.backendSubjectId === pm.backendSubjectId) return true;
                          return false;
                        });
                        if (!exists) {
                          base.push(pm);
                        }
                      });
                      return base.length > 0 ? base : parentMembers;
                    });
                  }
                }
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
  }, [router]);

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
  const notifParentName =
    context.people.find(
      (p) => p.relationship?.toLowerCase().includes('father') || p.relation?.toLowerCase().includes('father') || p.id === 'dad'
    )?.name || currentPerson?.name || 'Parent';

  const activeFamily = userFamilies.length > 0 ? userFamilies[0] : null;

  return (
    <DeviceFrame>
      <View className="flex-1 relative bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <HealthDashboard
          familyName={activeFamily?.name || context.familyName}
          coordinatorName={context.coordinatorName}
          familyMembers={context.familyMembers}
          careSubjects={context.people}
          recentCheckIns={userCheckIns}
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
          onViewTransparency={() => router.push(`/(coordinator)/parent/${context.currentPersonId || 'dad'}/insights` as any)}
          onOpenCheckIn={() => context.setCheckInOpen(true)}
          onAddContext={() => openQuickActionsWithTab('add_context')}
          onTalkToDoctor={() => {
            const primaryPerson =
              context.people.find((p) => p.id === context.currentPersonId || p.backendSubjectId === context.currentPersonId) ||
              context.people.find((p) => p.relationship?.toLowerCase().includes('father') || p.relation?.toLowerCase().includes('father')) ||
              context.people[0];
            const primaryName = primaryPerson?.name || 'Parent';
            context.setAskAIQuery(
              `I'd like to consult with Dr. Sharma regarding ${primaryName}'s BP pattern of ${context.currentBP} and active steps drop.`
            );
            context.setAskAIOpen(true);
          }}
          onOpenQuickActions={(tab) => openQuickActionsWithTab(tab || 'menu')}
          onViewVitalDetail={(type, personId) => {
            const targetId = personId || context.currentPersonId || (type === 'bp' ? 'dad' : 'mom');
            context.setCurrentPersonId(targetId);
            router.push(`/(coordinator)/parent/${targetId}` as any);
          }}
          currentBP={context.currentBP}
          currentGlucose={context.currentGlucose}
          isAtorvastatinTaken={isAtorvastatinTaken}
          onRemindDad={() => {
            const activeMed = context.records.find((r) => r.status === 'upcoming') || { id: 'rec-5' };
            context.sendMedicationReminder(activeMed.id);
          }}
          onContactCaregiver={() => router.push('/(coordinator)/care')}
          onViewMedication={() => router.push('/(coordinator)/care')}
          onOpenNotifications={() => setNotificationsOpen(true)}
          unreadCount={unreadCount}
          dataConnection={dataConnection}
          currentScenario={context.currentScenario}
          onCheckInWithDad={context.sendCheckInRequest}
          familyHomeData={familyHomeData}
          guardianMoment={guardianMomentData || familyHomeData?.guardian_moment}
          reassurance={familyHomeData?.reassurance}
          todayAttention={familyHomeData?.today_attention}
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
              router.push('/(coordinator)/parent/dad/vitals');
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
