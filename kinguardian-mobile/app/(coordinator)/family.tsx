import { useContext, useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { AppContext } from '../../src/store/AppContext';
import { BottomNavBar } from '../../src/components/Navigation';
import { DeviceFrame } from '../../src/components/DeviceFrame';
import { SimulatorControls } from '../../src/components/SimulatorControls';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Pill,
  Clipboard,
  UserPlus,
  X,
  ShieldCheck,
  CheckCircle2,
  Users,
  Send
} from 'lucide-react-native';
import { authService } from '../../src/services/auth/authService';
import { CONFIG } from '../../src/constants/config';

export default function FamilyCoordinationRoute() {
  const context = useContext(AppContext);
  const router = useRouter();

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'parent' | 'caregiver' | 'coordinator'>('parent');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [liveMembers, setLiveMembers] = useState<any[]>([]);
  const [familyName, setFamilyName] = useState('Family Circle');

  const loadFamilyData = useCallback(async () => {
    try {
      const token = await authService.getAccessToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // 1. Get user families
      const famRes = await fetch(`${CONFIG.apiUrl}/api/v1/families`, { headers });
      if (famRes.ok) {
        const families = await famRes.json();
        if (families && families.length > 0) {
          const fam = families[0];
          setFamilyName(fam.name || 'Family Circle');
          // 2. Get members for this family
          const memRes = await fetch(`${CONFIG.apiUrl}/api/v1/families/${fam.id}/members`, { headers });
          if (memRes.ok) {
            const members = await memRes.json();
            setLiveMembers(members);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('FamilyCoordinationRoute: Error loading family data:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFamilyData();
  }, [loadFamilyData]);

  if (!context) return null;

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Missing Email', 'Please provide an email address for the invitee.');
      return;
    }

    setLoading(true);
    try {
      await context.inviteMember({
        email: inviteEmail.trim(),
        name: inviteName.trim(),
        role: inviteRole
      });

      context.showToast(`Invitation sent! ${inviteName} is now an active ${inviteRole}.`);
      setInviteModalOpen(false);
      // Reload family data
      await loadFamilyData();
    } catch (err: any) {
      Alert.alert('Invitation Error', err.message || 'Failed to send invitation.');
    } finally {
      setLoading(false);
    }
  };

  const fallbackAssignments = [
    {
      task: "Doctor appointment",
      assignee: context.people[1]?.name || 'Family Member',
      icon: Calendar,
      color: '#ff3b30',
      bgColor: '#fff5f5'
    },
    {
      task: 'Medication coordination',
      assignee: context.coordinatorName || 'Coordinator',
      icon: Pill,
      color: '#007aff',
      bgColor: '#eff6ff'
    },
    {
      task: 'Health summary review',
      assignee: context.people[0]?.name || 'Parent',
      icon: Clipboard,
      color: '#ff9500',
      bgColor: '#fff9e6'
    }
  ];

  const assignments = (context.careTasks && context.careTasks.length > 0)
    ? context.careTasks.map((t) => ({
        task: t.title,
        assignee: t.assignedTo || 'Caregiver',
        status: t.status,
        icon: t.title.toLowerCase().includes('med') ? Pill : (t.title.toLowerCase().includes('appointment') || t.title.toLowerCase().includes('visit') ? Calendar : Clipboard),
        color: t.priority === 'high' ? '#ff3b30' : (t.priority === 'medium' ? '#ff9500' : '#007aff'),
        bgColor: t.priority === 'high' ? '#fff5f5' : (t.priority === 'medium' ? '#fff9e6' : '#eff6ff')
      }))
    : fallbackAssignments;


  return (
    <DeviceFrame>
      <View className="flex-1 relative bg-[#f2f2f7]">
        {/* Header */}
        <View className="px-6 py-5 border-b border-neutral-100 bg-white flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-1 bg-neutral-100 rounded-full active:scale-90"
            >
              <ArrowLeft size={18} color="#8e8e93" />
            </TouchableOpacity>
            <View>
              <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                {familyName}
              </Text>
              <Text className="text-xl font-bold text-neutral-900 tracking-tight mt-0.5">
                Care Circle Network
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setInviteModalOpen(true)}
            activeOpacity={0.8}
            className="flex-row items-center gap-1.5 bg-[#007aff] px-3.5 py-2 rounded-xl shadow-xs"
          >
            <UserPlus size={14} color="#ffffff" strokeWidth={2.5} />
            <Text className="text-white text-xs font-bold">Invite Member</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1 px-5 pt-4 space-y-5"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadFamilyData(); }} />
          }
        >
          {/* Live Members List Inset Grouped */}
          <View className="space-y-2">
            <View className="flex-row items-center justify-between px-1">
              <Text className="text-xs font-bold uppercase text-neutral-400 tracking-wider">
                Active Family Members ({liveMembers.length > 0 ? liveMembers.length : 3})
              </Text>
              <Text className="text-[10px] font-bold text-[#007aff]">Live Sync: Connected</Text>
            </View>

            <View className="bg-white border border-neutral-100 rounded-2xl shadow-sm divide-y divide-neutral-200/80 overflow-hidden">
              {liveMembers.length > 0 ? (
                liveMembers.map((member) => {
                  const isParent = member.role === 'parent';
                  const isCoordinator = member.role === 'coordinator';

                  return (
                    <View key={member.id} className="p-4 flex-row items-center justify-between">
                      <View className="flex-row items-center gap-3">
                        <View
                          className={`w-10 h-10 rounded-full items-center justify-center ${
                            isParent ? 'bg-[#eefdf4]' : isCoordinator ? 'bg-[#eff6ff]' : 'bg-neutral-100'
                          }`}
                        >
                          <Users size={18} color={isParent ? '#34c759' : '#007aff'} />
                        </View>
                        <View>
                          <Text className="text-xs font-bold text-neutral-800">
                            {member.display_name}
                          </Text>
                          <Text className="text-[10px] text-neutral-400 font-medium">
                            {member.email || (isCoordinator ? 'Care Coordinator' : 'Care Circle Member')}
                          </Text>
                          {isParent && (
                            <View className="flex-row items-center gap-1 mt-1">
                              <CheckCircle2 size={10} color="#34c759" />
                              <Text className="text-[9px] text-[#34c759] font-bold">
                                4 Care Grants Active (Telemetry & Meds)
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <View className="flex-row items-center gap-2">
                        <View
                          className={`px-2.5 py-0.5 rounded-full ${
                            isParent ? 'bg-emerald-50 border border-emerald-100' : 'bg-blue-50'
                          }`}
                        >
                          <Text
                            className={`text-[8px] font-bold uppercase ${
                              isParent ? 'text-[#34c759]' : 'text-[#007aff]'
                            }`}
                          >
                            {member.role}
                          </Text>
                        </View>
                        <View className="w-2 h-2 rounded-full bg-[#34c759]" />
                      </View>
                    </View>
                  );
                })
              ) : context.people && context.people.length > 0 ? (
                context.people.map((person) => {
                  const isParent = person.role === 'parent' || person.relationship === 'Father' || person.relationship === 'Mother';

                  return (
                    <View key={person.id} className="p-4 flex-row items-center justify-between">
                      <View className="flex-row items-center gap-3">
                        <View
                          className={`w-10 h-10 rounded-full items-center justify-center ${
                            isParent ? 'bg-[#eefdf4]' : 'bg-[#eff6ff]'
                          }`}
                        >
                          <Users size={18} color={isParent ? '#34c759' : '#007aff'} />
                        </View>
                        <View>
                          <Text className="text-xs font-bold text-neutral-800">{person.name}</Text>
                          <Text className="text-[10px] text-neutral-400 font-semibold">
                            {person.location || 'Care Circle'} ({person.relationship || person.role || 'Member'})
                          </Text>
                          {isParent && (
                            <Text className="text-[9px] text-[#34c759] font-bold mt-0.5">
                              ✓ Care Grants Active
                            </Text>
                          )}
                        </View>
                      </View>
                      <View className="bg-blue-50 px-2.5 py-0.5 rounded-full">
                        <Text className="text-[8px] font-bold text-[#007aff] uppercase">
                          {person.role || 'Member'}
                        </Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View className="p-6 items-center justify-center">
                  <Text className="text-xs font-bold text-neutral-400">
                    No family members found yet. Tap "Invite Member" above.
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Responsibility matrix Inset Grouped */}
          <View className="space-y-2 mt-2">
            <Text className="text-xs font-bold uppercase text-neutral-400 tracking-wider pl-1">
              Responsibility Mapping
            </Text>

            <View className="bg-white border border-neutral-100 rounded-2xl shadow-sm divide-y divide-neutral-200/80 overflow-hidden">
              {assignments.map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <View key={idx} className="p-4 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                      <View
                        className="w-8 h-8 rounded-full items-center justify-center"
                        style={{ backgroundColor: item.bgColor }}
                      >
                        <IconComponent size={14} color={item.color} />
                      </View>
                      <Text className="text-xs font-bold text-neutral-800">{item.task}</Text>
                    </View>
                    <View className="bg-neutral-100 px-3 py-1 rounded-full">
                      <Text className="text-[9px] font-bold text-neutral-600">
                        &rarr; {item.assignee}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Chat Launcher CTA */}
          <TouchableOpacity
            onPress={() => router.push('/(coordinator)/family-chat')}
            className="w-full bg-[#007aff] py-3.5 rounded-xl flex-row items-center justify-center gap-2 active:opacity-90 shadow-sm mt-3"
          >
            <Text className="text-white font-bold text-sm">Open Family Chat</Text>
          </TouchableOpacity>

          <View className="h-28" />
        </ScrollView>

        {/* Invite Member Modal */}
        <Modal
          visible={inviteModalOpen}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setInviteModalOpen(false)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-[28px] p-6 pb-10 space-y-4 shadow-xl">
              <View className="flex-row items-center justify-between pb-2 border-b border-neutral-100">
                <View className="flex-row items-center gap-2">
                  <UserPlus size={20} color="#007aff" />
                  <Text className="text-base font-bold text-neutral-900">
                    Invite Parent / Family Member
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setInviteModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-neutral-100 items-center justify-center"
                >
                  <X size={16} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View className="space-y-3">
                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Full Name
                  </Text>
                  <TextInput
                    value={inviteName}
                    onChangeText={setInviteName}
                    placeholder="e.g. Family Member Name"
                    placeholderTextColor="#8e8e93"
                    className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs text-neutral-800 focus:border-[#007aff]"
                  />
                </View>

                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Email Address
                  </Text>
                  <TextInput
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    placeholder="e.g. ramesh@example.com"
                    placeholderTextColor="#8e8e93"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs text-neutral-800 focus:border-[#007aff]"
                  />
                </View>

                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Member Role
                  </Text>
                  <View className="flex-row gap-2">
                    {(['parent', 'caregiver', 'coordinator'] as const).map((r) => (
                      <TouchableOpacity
                        key={r}
                        onPress={() => setInviteRole(r)}
                        className={`flex-1 py-2.5 rounded-xl items-center border ${
                          inviteRole === r
                            ? 'bg-[#eff6ff] border-[#007aff]'
                            : 'bg-neutral-50 border-neutral-200'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold capitalize ${
                            inviteRole === r ? 'text-[#007aff]' : 'text-neutral-600'
                          }`}
                        >
                          {r}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {inviteRole === 'parent' && (
                  <View className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 space-y-1 mt-1">
                    <View className="flex-row items-center gap-1.5">
                      <ShieldCheck size={14} color="#34c759" />
                      <Text className="text-xs font-bold text-emerald-900">
                        Automated Care Grants Included:
                      </Text>
                    </View>
                    <Text className="text-[11px] text-emerald-700 leading-snug">
                      • Daily Check-ins (`checkins`){'\n'}
                      • Medication Adherence (`medications`){'\n'}
                      • Health Telemetry (`health.summary`){'\n'}
                      • Care Circle Chat (`messages`)
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  disabled={loading}
                  onPress={handleSendInvite}
                  className="w-full bg-[#007aff] py-3.5 rounded-xl flex-row items-center justify-center gap-2 mt-2 active:scale-95 shadow-sm"
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Send size={15} color="#ffffff" />
                      <Text className="text-white font-bold text-xs">
                        Send Parent Invitation & Grant Scopes
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <BottomNavBar
          activeTab="profile"
          currentScreen="health_dashboard"
          onTabChange={(tab) => {
            if (tab === 'home') router.push('/(coordinator)');
            else if (tab === 'parents') router.push('/(coordinator)/parents');
            else if (tab === 'ask') context.setAskAIOpen(true);
            else if (tab === 'care') router.push('/(coordinator)/care');
            else if (tab === 'profile') router.push('/(coordinator)/profile');
          }}
          onOpenQuickActions={() => context.setQuickActionsOpen(true)}
          onOpenAskAI={() => context.setAskAIOpen(true)}
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
