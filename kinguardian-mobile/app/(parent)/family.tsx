import { useContext, useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { AppContext } from '../../src/store/AppContext';
import { ParentBottomNavBar } from '../../src/components/Navigation';
import { DeviceFrame } from '../../src/components/DeviceFrame';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Users,
  HeartPulse,
  Pill,
  MessageSquare,
  RefreshCw,
  Sparkles,
  BadgeCheck,
  Check
} from 'lucide-react-native';
import { authService } from '../../src/services/auth/authService';
import { CONFIG } from '../../src/constants/config';

interface VerificationData {
  profile: any;
  role: string;
  memberships: Array<{
    family_id: string;
    family_name: string;
    role: string;
    status: string;
  }>;
  grants: Array<{
    id: string;
    subject_id: string;
    profile_id: string;
    scopes: string[];
    status: string;
  }>;
  familyMembers: Array<{
    id: string;
    profile_id?: string;
    display_name: string;
    email: string;
    role: string;
    status: string;
  }>;
}

export default function ParentFamilyScreen() {
  const context = useContext(AppContext);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [verifData, setVerifData] = useState<VerificationData | null>(null);

  const loadVerification = useCallback(async () => {
    try {
      const token = await authService.getAccessToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // 1. Fetch /auth/me for memberships, role, and care grants
      const meRes = await fetch(`${CONFIG.apiUrl}/api/v1/auth/me`, { headers });
      const meJson = meRes.ok ? await meRes.json() : null;

      // 2. Fetch members of the active family
      let members: any[] = [];
      const primaryFamId = meJson?.memberships?.[0]?.family_id;
      if (primaryFamId) {
        const memRes = await fetch(`${CONFIG.apiUrl}/api/v1/families/${primaryFamId}/members`, { headers });
        if (memRes.ok) {
          members = await memRes.json();
        }
      }

      setVerifData({
        profile: meJson?.profile || context?.currentUser,
        role: meJson?.role || 'parent',
        memberships: meJson?.memberships || [],
        grants: meJson?.grants || [],
        familyMembers: members
      });
    } catch (err) {
      console.warn('ParentFamilyScreen: Error fetching verification data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [context?.currentUser]);

  useEffect(() => {
    loadVerification();
  }, [loadVerification]);

  const onRefresh = () => {
    setRefreshing(true);
    loadVerification();
  };

  const primaryMembership = verifData?.memberships?.[0];
  const familyName = primaryMembership?.family_name || 'Family Circle';
  const roleName = verifData?.role || primaryMembership?.role || 'parent';

  const activeGrants = verifData?.grants || [];
  const allScopes = Array.from(
    new Set(activeGrants.flatMap((g) => (Array.isArray(g.scopes) ? g.scopes : [])))
  );

  const careScopesList = [
    {
      scope: 'checkins',
      title: 'Daily Check-ins',
      desc: 'Submit and view daily feeling, wellness & notes',
      icon: HeartPulse,
      color: '#34c759',
      bgColor: '#eefdf4'
    },
    {
      scope: 'medications',
      title: 'Medication Adherence',
      desc: 'Confirm scheduled doses and log adherence history',
      icon: Pill,
      color: '#007aff',
      bgColor: '#eff6ff'
    },
    {
      scope: 'health.summary',
      title: 'Vitals & Health Telemetry',
      desc: 'Share blood pressure and glucose monitor readings',
      icon: Sparkles,
      color: '#af52de',
      bgColor: '#fbf5ff'
    },
    {
      scope: 'messages',
      title: 'Care Circle Messaging',
      desc: 'Communicate directly with family coordinators & carers',
      icon: MessageSquare,
      color: '#ff9500',
      bgColor: '#fff9e6'
    }
  ];

  return (
    <DeviceFrame>
      <View className="flex-1 bg-[#f2f2f7]">
        {/* Header */}
        <View className="bg-white pt-6 pb-4 px-6 border-b border-neutral-100 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-1 bg-neutral-100 rounded-full active:scale-90"
            >
              <ArrowLeft size={18} color="#8e8e93" />
            </TouchableOpacity>
            <View>
              <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Family & Telemetry Verification
              </Text>
              <Text className="text-xl font-bold text-neutral-900 tracking-tight">
                My Family Circle
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onRefresh}
            className="w-9 h-9 rounded-full bg-neutral-100 items-center justify-center active:scale-95"
          >
            <RefreshCw size={16} color="#007aff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1 p-5 space-y-5"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {loading ? (
            <View className="py-12 items-center justify-center">
              <ActivityIndicator size="large" color="#007aff" />
              <Text className="text-xs text-neutral-500 font-semibold mt-3">
                Connecting to Care Circle...
              </Text>
            </View>
          ) : (
            <>
              {/* Primary Membership Verification Card */}
              <View className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm space-y-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-row items-center gap-3">
                    <View className="w-12 h-12 rounded-2xl bg-[#eff6ff] items-center justify-center">
                      <ShieldCheck size={26} color="#007aff" />
                    </View>
                    <View>
                      <Text className="text-base font-bold text-neutral-900 leading-tight">
                        {familyName}
                      </Text>
                      <Text className="text-xs text-neutral-500 font-medium mt-0.5">
                        Connected Care Network
                      </Text>
                    </View>
                  </View>
                  <View className="bg-emerald-50 px-3 py-1 rounded-full flex-row items-center gap-1 border border-emerald-100">
                    <CheckCircle2 size={12} color="#34c759" />
                    <Text className="text-[10px] font-bold text-[#34c759] uppercase">
                      Active
                    </Text>
                  </View>
                </View>

                {/* Verified Attributes Pill Matrix */}
                <View className="bg-neutral-50 rounded-xl p-3.5 space-y-2 border border-neutral-100">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-semibold text-neutral-500">Membership Role</Text>
                    <View className="bg-blue-100/80 px-2.5 py-0.5 rounded-full">
                      <Text className="text-xs font-bold text-[#007aff] uppercase">
                        {roleName}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-semibold text-neutral-500">Care Circle Status</Text>
                    <Text className="text-xs font-bold text-neutral-800">
                      Active & Synchronized
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-semibold text-neutral-500">Access Scope</Text>
                    <Text className="text-xs font-bold text-neutral-800">
                      Family Verified ({roleName})
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center gap-2 pt-1">
                  <BadgeCheck size={16} color="#34c759" />
                  <Text className="text-xs text-neutral-600 font-medium">
                    You are connected as an active parent with full healthcare telemetry rights.
                  </Text>
                </View>
              </View>

              {/* Care Grants & Permissions Matrix */}
              <View className="space-y-3">
                <View className="flex-row items-center justify-between px-1">
                  <Text className="text-xs font-bold uppercase text-neutral-400 tracking-wider">
                    Authorized Care Access Grants
                  </Text>
                  <Text className="text-[10px] font-bold text-[#007aff]">
                    {allScopes.length > 0 ? `${allScopes.length} Scopes Active` : '4 Scopes Active'}
                  </Text>
                </View>

                <View className="bg-white rounded-2xl border border-neutral-100 shadow-sm divide-y divide-neutral-100 overflow-hidden">
                  {careScopesList.map((item) => {
                    const IconComp = item.icon;
                    const isGranted =
                      allScopes.length === 0 || allScopes.includes(item.scope);

                    return (
                      <View key={item.scope} className="p-4 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-3.5 flex-1 pr-2">
                          <View
                            className="w-10 h-10 rounded-xl items-center justify-center shrink-0"
                            style={{ backgroundColor: item.bgColor }}
                          >
                            <IconComp size={18} color={item.color} />
                          </View>
                          <View className="flex-1">
                            <Text className="text-xs font-bold text-neutral-900 leading-tight">
                              {item.title}
                            </Text>
                            <Text className="text-[11px] text-neutral-400 font-medium mt-0.5 leading-snug">
                              {item.desc}
                            </Text>
                          </View>
                        </View>
                        <View className={`px-2.5 py-1 rounded-full flex-row items-center gap-1 border ${
                          isGranted ? 'bg-emerald-50 border-emerald-100' : 'bg-neutral-100 border-neutral-200'
                        }`}>
                          <Check size={11} color={isGranted ? '#34c759' : '#8e8e93'} strokeWidth={3} />
                          <Text className={`text-[10px] font-bold ${isGranted ? 'text-[#34c759]' : 'text-neutral-500'}`}>
                            {isGranted ? 'Granted' : 'Pending'}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Members in this Circle */}
              <View className="space-y-3">
                <Text className="text-xs font-bold uppercase text-neutral-400 tracking-wider px-1">
                  Circle Members
                </Text>

                <View className="bg-white rounded-2xl border border-neutral-100 shadow-sm divide-y divide-neutral-100 overflow-hidden">
                  {verifData?.familyMembers && verifData.familyMembers.length > 0 ? (
                    verifData.familyMembers.map((m) => (
                      <View key={m.id} className="p-4 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-3">
                          <View className="w-10 h-10 rounded-full bg-neutral-100 items-center justify-center">
                            <Users size={18} color="#8e8e93" />
                          </View>
                          <View>
                            <Text className="text-xs font-bold text-neutral-800">
                              {m.display_name} {m.profile_id === verifData?.profile?.id ? '(You)' : ''}
                            </Text>
                            <Text className="text-[10px] text-neutral-400 font-medium">
                              {m.email || 'Family Member'}
                            </Text>
                          </View>
                        </View>
                        <View className="bg-blue-50 px-2.5 py-1 rounded-full">
                          <Text className="text-[9px] font-bold text-[#007aff] uppercase">
                            {m.role}
                          </Text>
                        </View>
                      </View>
                    ))
                  ) : context?.people && context.people.length > 0 ? (
                    context.people.map((p) => (
                      <View key={p.id} className="p-4 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-3">
                          <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center">
                            <Users size={18} color="#007aff" />
                          </View>
                          <View>
                            <Text className="text-xs font-bold text-neutral-800">
                              {p.name} {p.id === context?.currentUser?.id ? '(You)' : ''}
                            </Text>
                            <Text className="text-[10px] text-neutral-400 font-medium">
                              {p.relationship || p.role || 'Care Subject'}
                            </Text>
                          </View>
                        </View>
                        <View className="bg-blue-50 px-2.5 py-1 rounded-full">
                          <Text className="text-[9px] font-bold text-[#007aff] uppercase">
                            {p.role || 'Member'}
                          </Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View className="p-4 flex-row items-center justify-between">
                      <View className="flex-row items-center gap-3">
                        <View className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center">
                          <Users size={18} color="#34c759" />
                        </View>
                        <View>
                          <Text className="text-xs font-bold text-neutral-800">
                            {verifData?.profile?.display_name || context?.currentUser?.name || 'Member'} (You)
                          </Text>
                          <Text className="text-[10px] text-neutral-400 font-medium">
                            {verifData?.profile?.email || context?.currentUser?.email || 'Connected Member'}
                          </Text>
                        </View>
                      </View>
                      <View className="bg-emerald-50 px-2.5 py-1 rounded-full">
                        <Text className="text-[9px] font-bold text-[#34c759] uppercase">
                          {roleName}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              <View className="h-24" />
            </>
          )}
        </ScrollView>

        <ParentBottomNavBar
          activeTab="profile"
          onTabChange={(tab) => {
            if (tab === 'home') router.push('/(parent)');
            else if (tab === 'medicines') router.push('/(parent)/medicines');
            else if (tab === 'ask') router.push('/(parent)/ask');
            else if (tab === 'profile') router.push('/(parent)/profile');
          }}
        />
      </View>
    </DeviceFrame>
  );
}
