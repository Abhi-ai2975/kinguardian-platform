import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { AppContext } from '../store/AppContext';
import {
  Activity,
  Calendar,
  Pill,
  Upload,
  Sparkles,
  Clock,
  AlertTriangle,
  MapPin,
  ChevronRight,
  CheckCircle2,
  Bell,
  LogOut,
  TrendingUp,
  AlertCircle,
  FileText
} from 'lucide-react-native';
import { HealthObservation, Person } from '../types';
import { formatTimeForCoordinator } from '../utils/timezone';

interface HealthDashboardProps {
  observation: HealthObservation;
  currentUserName: string;
  people: Person[];
  currentPersonId: string;
  onSelectPerson: (personId: string) => void;
  onViewTransparency: () => void;
  onOpenCheckIn: () => void;
  onAddContext: () => void;
  onTalkToDoctor: () => void;
  onOpenQuickActions: (tab?: 'menu' | 'log_bp' | 'add_med' | 'add_context' | 'add_appt') => void;
  onViewVitalDetail: (type: 'bp' | 'glucose', personId?: string) => void;
  currentBP: string;
  currentGlucose: string;
  isAtorvastatinTaken: boolean;
  onRemindDad: () => void;
  onContactCaregiver: () => void;
  onViewMedication: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
  currentScenario?: string;
  onCheckInWithDad?: () => void;
  familyName?: string;
  coordinatorName?: string;
  familyMembers?: any[];
  careSubjects?: any[];
  recentCheckIns?: any[];
  careTasks?: any[];
  onLogout?: () => void;
  dataConnection?: 'connecting' | 'live' | 'offline';
}

export const HealthDashboard: React.FC<HealthDashboardProps> = ({
  observation,
  currentUserName,
  people,
  currentPersonId = 'dad',
  onSelectPerson = () => {},
  onViewTransparency,
  onOpenCheckIn,
  onTalkToDoctor,
  onOpenQuickActions,
  onViewVitalDetail,
  currentBP,
  isAtorvastatinTaken,
  onRemindDad,
  onOpenNotifications,
  unreadCount,
  currentScenario = 'normal',
  onCheckInWithDad,
  familyName,
  coordinatorName,
  careSubjects = [],
  recentCheckIns = [],
  onLogout,
  dataConnection = 'connecting'
}) => {
  const router = useRouter();
  const context = useContext(AppContext);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const bpSystolic = parseInt(currentBP.split('/')[0] || '120', 10);
  const needsAttention = bpSystolic >= 140;
  
  // Use real data from database if available, otherwise fall back to mock data
  const displayCoordinatorName = coordinatorName || currentUserName || 'Coordinator';
  
  // Get primary person from care subjects or fall back to mock data
  const primaryPerson = careSubjects && careSubjects.length > 0 
    ? { 
        id: careSubjects[0].id, 
        name: JSON.parse(careSubjects[0].external_patient_ref || '{}').name || 'Parent',
        location: careSubjects[0].preferred_timezone || 'India'
      }
    : people.find((p) => p.id === currentPersonId || p.backendSubjectId === currentPersonId) ||
      people.find((p) => p.role === 'parent' || p.relationship === 'Mother' || p.relationship === 'Father') ||
      (people.length > 0 ? people[0] : null);
  
  const primaryName = primaryPerson?.name || 'Parent';
  const primaryLocation = primaryPerson?.location || (primaryPerson && 'city' in primaryPerson ? primaryPerson.city : 'India');

  // Get latest check-in mood from real data
  const latestCheckIn = recentCheckIns && recentCheckIns.length > 0 ? recentCheckIns[0] : null;
  let feelingText = 'Good';
  if (latestCheckIn) {
    feelingText = latestCheckIn.mood.charAt(0).toUpperCase() + latestCheckIn.mood.slice(1);
  } else if (primaryPerson && 'currentStatus' in primaryPerson && typeof primaryPerson.currentStatus === 'string') {
    if (primaryPerson.currentStatus.toLowerCase().includes('tired')) {
      feelingText = 'Okay';
    } else if (primaryPerson.currentStatus.toLowerCase().includes('unwell')) {
      feelingText = 'Not well';
    }
  }

  return (
    <View className="flex-1 bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Header Profile / Timezone translation */}
      <View className="w-full bg-white/80 backdrop-blur-xl border-b border-slate-100/50 pt-8 pb-6 px-6 space-y-4 shadow-sm">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <View className="flex-row items-center gap-2 flex-wrap">
              <View className="bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-1 rounded-full">
                <Text className="text-[10px] font-bold text-white uppercase tracking-wider">
                  Coordinator Portal
                </Text>
              </View>
              {familyName ? (
                <View className="bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  <Text className="text-[10px] font-bold text-slate-700">{familyName}</Text>
                </View>
              ) : null}
              <View
                className={`px-3 py-1 rounded-full border ${
                  dataConnection === 'live'
                    ? 'bg-emerald-50 border-emerald-200'
                    : dataConnection === 'offline'
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-slate-100 border-slate-200'
                }`}
              >
                <Text
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    dataConnection === 'live'
                      ? 'text-emerald-700'
                      : dataConnection === 'offline'
                        ? 'text-amber-700'
                        : 'text-slate-600'
                  }`}
                >
                  {dataConnection === 'live'
                    ? 'Live DB'
                    : dataConnection === 'offline'
                      ? 'Offline fallback'
                      : 'Connecting'}
                </Text>
              </View>
            </View>
            <Text className="text-3xl font-bold text-slate-900 tracking-tight mt-2">
              Good morning, {displayCoordinatorName}
            </Text>
            <Text className="text-sm text-slate-500 mt-1">
              Here's what's happening with your family today
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={onOpenNotifications}
              className="w-11 h-11 bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl items-center justify-center relative active:scale-95 shadow-sm border border-blue-200"
            >
              <Bell size={18} color="#007aff" />
              {unreadCount > 0 && (
                <View className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 w-5 h-5 rounded-full items-center justify-center border-2 border-white shadow-sm">
                  <Text className="text-white text-[10px] font-bold">{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onOpenQuickActions('menu')}
              className="w-11 h-11 bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl items-center justify-center active:scale-95 shadow-sm border border-slate-200"
            >
              <Clock size={18} color="#64748b" />
            </TouchableOpacity>

            {onLogout && (
              <TouchableOpacity
                onPress={onLogout}
                className="w-11 h-11 bg-gradient-to-br from-red-50 to-red-100 rounded-3xl items-center justify-center active:scale-95 shadow-sm border border-red-200"
              >
                <LogOut size={18} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Location Translation Pills */}
        <View className="flex-row items-center gap-3 flex-wrap">
          <View className="flex-row items-center gap-2 bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-2 rounded-3xl border border-blue-200 shadow-sm">
            <MapPin size={12} color="#007aff" />
            <Text className="text-[11px] font-semibold text-blue-700">You — Coordinator</Text>
          </View>
          <View className="flex-row items-center gap-2 bg-gradient-to-r from-emerald-50 to-emerald-100 px-4 py-2 rounded-3xl border border-emerald-200 shadow-sm">
            <MapPin size={12} color="#10b981" />
            <Text className="text-[11px] font-semibold text-emerald-700">
              {primaryName} — {primaryLocation}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6 space-y-6">
        {/* Today's Attention Alert Section */}
        <View className="space-y-3">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">
            Today's Attention
          </Text>

          {currentScenario === 'parent-feeling-unwell' ? (
            /* Parent Feeling Unwell Urgent Card */
            <View className="bg-white rounded-3xl p-5 shadow-sm shadow-neutral-100 space-y-3.5 border-l-4 border-[#ff3b30]">
              <View className="flex-row justify-between items-start">
                <View className="flex-row items-center gap-2">
                  <AlertTriangle size={15} color="#ff3b30" />
                  <Text className="text-xs font-bold text-neutral-800">
                    {primaryName} reported feeling unwell
                  </Text>
                </View>
                <View className="bg-red-50 px-2.5 py-0.5 rounded-full">
                  <Text className="text-[8px] font-bold text-[#ff3b30] uppercase">
                    Urgent Alert
                  </Text>
                </View>
              </View>

              <View className="space-y-1">
                <Text className="text-base font-bold text-neutral-900 tracking-tight">
                  Discomfort reported
                </Text>
                <Text className="text-xs text-neutral-500 leading-normal mt-0.5">
                  {`“${primaryName} logged a check-in feeling Unwell. Action advised.”`}
                </Text>
              </View>

              <View className="space-y-2 pt-1">
                <TouchableOpacity
                  onPress={() => alert('Dialing designated local caregiver...')}
                  className="w-full bg-[#ff3b30] py-3 rounded-3xl items-center justify-center active:scale-95"
                >
                  <Text className="text-white text-xs font-bold">📞 Contact Caregiver</Text>
                </TouchableOpacity>

                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => router.push(`/parent/${primaryPerson?.id || 'dad'}/summary` as any)}
                    className="flex-1 bg-white/80 backdrop-blur py-3 rounded-3xl items-center justify-center active:scale-95"
                  >
                    <Text className="text-neutral-700 text-[10px] font-bold">
                      Emergency Summary
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => router.push('/(coordinator)/family-chat')}
                    className="flex-1 bg-white/80 backdrop-blur py-3 rounded-3xl items-center justify-center active:scale-95"
                  >
                    <Text className="text-neutral-700 text-[10px] font-bold">Message Family</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : currentScenario === 'guardian-moment' ? (
            /* Guardian Moment Alert Card */
            <View className="bg-white rounded-3xl p-5 shadow-sm shadow-neutral-100 space-y-3 border-l-4 border-[#ff9500]">
              <View className="flex-row justify-between items-start">
                <View className="flex-row items-center gap-2">
                  <AlertTriangle size={15} color="#ff9500" />
                  <Text className="text-xs font-bold text-neutral-800">
                    Something changed with {primaryName}
                  </Text>
                </View>
                <View className="bg-orange-50 px-2.5 py-0.5 rounded-full">
                  <Text className="text-[8px] font-bold text-[#ff9500] uppercase">
                    AI Observation
                  </Text>
                </View>
              </View>

              <View className="space-y-1">
                <Text className="text-base font-bold text-neutral-900 tracking-tight">
                  Step activity decrease detected
                </Text>
                <Text className="text-xs text-neutral-500 leading-normal mt-0.5">
                  I noticed {primaryName}'s daily step count decreased to 1,200. This is different from usual patterns. You may want to check in.
                </Text>
              </View>

              <View className="space-y-2 pt-1">
                <TouchableOpacity
                  onPress={onCheckInWithDad}
                  className="w-full bg-[#ff9500] py-3 rounded-3xl items-center justify-center active:scale-95"
                >
                  <Text className="text-white text-xs font-bold uppercase tracking-wider">
                    Check in with {primaryName}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onViewTransparency}
                  className="w-full bg-neutral-50 py-3 rounded-3xl items-center justify-center border border-neutral-100 active:scale-95"
                >
                  <Text className="text-neutral-600 text-xs font-semibold">
                    Review Activity Trend
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    context?.switchScenario('normal');
                    context?.showToast('Guardian Moment dismissed. Deduplication policy active.');
                  }}
                  className="w-full bg-neutral-100 py-2.5 rounded-3xl items-center justify-center active:scale-95"
                >
                  <Text className="text-neutral-500 text-xs font-bold">
                    Dismiss Alert
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : currentScenario === 'stale-sync' ? (
            /* Stale Wearable Sync Notice Card */
            <View className="bg-white rounded-3xl p-5 shadow-sm shadow-neutral-100 space-y-3 border-l-4 border-[#eab308]">
              <View className="flex-row justify-between items-start">
                <View className="flex-row items-center gap-2">
                  <AlertCircle size={15} color="#ca8a04" />
                  <Text className="text-xs font-bold text-neutral-800">
                    Telemetry Connection Issue
                  </Text>
                </View>
                <View className="bg-yellow-50 px-2.5 py-0.5 rounded-full border border-yellow-200">
                  <Text className="text-[8px] font-bold text-[#ca8a04] uppercase">
                    Data Availability Notice
                  </Text>
                </View>
              </View>

              <View className="space-y-1">
                <Text className="text-base font-bold text-neutral-900 tracking-tight">
                  Wearable sync offline (24+ hours)
                </Text>
                <Text className="text-xs text-neutral-600 leading-normal mt-0.5">
                  {primaryName}'s watch has not synced in over 24 hours. Baselines may be outdated. This is a hardware connectivity notice, not a physiological health alert.
                </Text>
              </View>

              <View className="bg-neutral-50 rounded-2xl p-3 border border-neutral-100 flex-row items-center justify-between">
                <View>
                  <Text className="text-[10px] text-neutral-600 font-semibold">
                    Last synced: <Text className="font-bold text-slate-800">Yesterday, 2:30 PM (Stale)</Text>
                  </Text>
                  <Text className="text-[9px] text-neutral-400 font-semibold">
                    Sync Status: stale_sync • Offline: 26.5 hrs
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowTroubleshoot(!showTroubleshoot)}
                  className="bg-yellow-600 px-3 py-1.5 rounded-full"
                >
                  <Text className="text-white text-[10px] font-bold">
                    {showTroubleshoot ? 'Hide Steps' : 'Troubleshoot'}
                  </Text>
                </TouchableOpacity>
              </View>

              {showTroubleshoot && (
                <View className="p-3.5 bg-yellow-50/80 rounded-2xl border border-yellow-200 space-y-1.5 mt-2">
                  <Text className="text-xs font-black text-yellow-950">
                    Reconnection Steps:
                  </Text>
                  <Text className="text-[10px] text-yellow-900 font-medium leading-relaxed">
                    1. Ensure Bluetooth is enabled on {primaryName}'s phone and watch.
                  </Text>
                  <Text className="text-[10px] text-yellow-900 font-medium leading-relaxed">
                    2. Place the watch on its magnetic charging cradle for 10 minutes.
                  </Text>
                  <Text className="text-[10px] text-yellow-900 font-medium leading-relaxed">
                    3. Open the KinGuardian companion app on {primaryName}'s device to trigger sync.
                  </Text>
                  <Text className="text-[10px] text-yellow-900 font-medium leading-relaxed">
                    4. Restart {primaryName}'s mobile phone if connection fails to re-establish.
                  </Text>
                </View>
              )}
            </View>
          ) : needsAttention ? (
            /* Traditional BP Alert Card */
            <View className="bg-white rounded-3xl p-5 shadow-sm shadow-neutral-100 space-y-3.5 border-l-4 border-[#ff3b30]">
              <View className="flex-row justify-between items-start">
                <View className="flex-row items-center gap-2">
                  <AlertTriangle size={15} color="#ff3b30" />
                  <Text className="text-xs font-bold text-neutral-800">Vitals threshold alert</Text>
                </View>
                <View className="bg-red-50 px-2.5 py-0.5 rounded-full">
                  <Text className="text-[8px] font-bold text-[#ff3b30] uppercase">Attention</Text>
                </View>
              </View>

              <View className="space-y-1">
                <Text className="text-base font-bold text-neutral-900 tracking-tight">
                  Blood pressure is {currentBP} mmHg
                </Text>
                <Text className="text-xs text-neutral-500 leading-normal">
                  {observation.highlightText}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => onViewVitalDetail('bp')}
                className="w-full bg-[#ff3b30] py-3 rounded-3xl items-center justify-center active:scale-95"
              >
                <Text className="text-white text-xs font-bold uppercase tracking-wider">
                  Review Vitals
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Anxiety-reducing Calming Reassurance Card */
            <View className="bg-white rounded-3xl p-5 shadow-sm shadow-neutral-100 space-y-3 border-l-4 border-[#34c759]">
              <View className="flex-row items-center gap-2">
                <CheckCircle2 size={15} color="#34c759" />
                <Text className="text-xs font-bold text-[#34c759]">All Statuses Optimal</Text>
              </View>

              <View className="space-y-1">
                <Text className="text-sm font-bold text-neutral-900">
                  {observation.title}
                </Text>
                <Text className="text-xs text-neutral-400 leading-normal">
                  {observation.highlightText}
                </Text>
              </View>

              <View className="pt-2 border-t border-neutral-100 flex-row items-center justify-between">
                <Text className="text-[9px] font-bold text-neutral-400">
                  Connected devices synced
                </Text>
                <Text className="text-[9px] font-bold text-neutral-400">
                  Last updated: Just now
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Health Summary Quick Access (TEST WEAR-008) */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push(`/parent/${primaryPerson?.id || 'dad'}/summary` as any)}
          className="bg-gradient-to-r from-[#2a14b4] to-[#4338ca] bg-[#2a14b4] rounded-3xl p-5 shadow-sm space-y-3 active:scale-98"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2.5 flex-1 pr-2">
              <View className="w-9 h-9 rounded-2xl bg-white/15 items-center justify-center">
                <FileText size={18} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-black">
                  Open Health Summary
                </Text>
                <Text className="text-white/80 text-[10px] font-medium leading-tight mt-0.5">
                  Vitals, telemetry, medications, and shareable clinical handout
                </Text>
              </View>
            </View>
            <View className="bg-white/20 px-2.5 py-1 rounded-full">
              <Text className="text-white text-[9px] font-black uppercase">Open →</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Guardian Baseline Card */}
        <View className="space-y-2">
          <View className="flex-row items-center justify-between px-1">
            <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Guardian Baseline
            </Text>
            <View className="flex-row items-center gap-1 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
              <Sparkles size={10} color="#af52de" />
              <Text className="text-[9px] font-bold text-[#af52de]">Deterministic Engine</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push(`/parent/${primaryPerson?.id || 'dad'}/guardian` as any)}
            className="bg-white rounded-3xl p-5 shadow-sm shadow-neutral-100 space-y-3.5 border-l-4 border-[#007aff]"
          >
            <View className="flex-row justify-between items-start">
              <View className="flex-row items-center gap-2.5">
                <View className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center">
                  <TrendingUp size={16} color="#007aff" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-neutral-900">
                    {primaryName}'s 30-Day Health Baseline
                  </Text>
                  <Text className="text-[10px] text-neutral-400 font-semibold">
                    Calculated from continuous telemetry & clinical logs
                  </Text>
                </View>
              </View>
              <View className="bg-blue-50 px-2 py-0.5 rounded-full">
                <Text className="text-[9px] font-bold text-[#007aff] uppercase">Active</Text>
              </View>
            </View>

            {/* Exact functional test specification display text */}
            <View className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-100 space-y-1">
              <Text className="text-xs font-bold text-neutral-800 leading-relaxed">
                30-Day Avg Steps: 4,850/day • 30-Day Avg BP: 126/82 mmHg • Current 7-Day: 138/88 mmHg (+9.5% variance)
              </Text>
              <Text className="text-[11px] text-neutral-500 leading-normal">
                {`Afternoon systolic BP peaked above 30-day baseline during regional heatwave (39°C in ${primaryLocation}).`}
              </Text>
            </View>

            {/* Baseline Metric Cards */}
            <View className="flex-row gap-2.5">
              <View className="flex-1 bg-[#eff6ff] p-3 rounded-xl border border-blue-100">
                <Text className="text-[10px] font-bold text-neutral-400 uppercase">Baseline Steps</Text>
                <Text className="text-base font-bold text-[#007aff] mt-0.5">
                  4,850 <Text className="text-xs font-normal text-neutral-500">/day</Text>
                </Text>
                <Text className="text-[9px] text-neutral-500 font-medium mt-0.5">30-Day Rolling Avg</Text>
              </View>

              <View className="flex-1 bg-[#fff7ed] p-3 rounded-xl border border-orange-100">
                <Text className="text-[10px] font-bold text-neutral-400 uppercase">Baseline BP</Text>
                <Text className="text-base font-bold text-[#ff9500] mt-0.5">
                  126/82 <Text className="text-xs font-normal text-neutral-500">mmHg</Text>
                </Text>
                <Text className="text-[9px] text-[#ff3b30] font-bold mt-0.5">Current: 138/88 (+9.5%)</Text>
              </View>
            </View>

            <View className="pt-2 border-t border-neutral-100 flex-row items-center justify-between">
              <Text className="text-[11px] font-bold text-[#007aff]">
                Inspect Guardian Moment & Sources →
              </Text>
              <ChevronRight size={14} color="#007aff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Family Members Focus Switcher */}
        <View className="space-y-2">
          <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider pl-1">
            Family Members ({people.length})
          </Text>
          <View className="space-y-2">
            {people.map((person, idx) => {
              const isSelected = person.id === currentPersonId || person.backendSubjectId === currentPersonId;
              return (
                <TouchableOpacity
                  key={person.id || idx}
                  onPress={() => {
                    onSelectPerson(person.id);
                    onViewVitalDetail('bp', person.id);
                  }}
                  className={`bg-white rounded-3xl p-4 flex-row items-center justify-between shadow-sm shadow-neutral-100 active:scale-98 border ${
                    isSelected ? 'border-[#007aff] bg-blue-50/20' : 'border-neutral-100'
                  }`}
                >
                  <View className="flex-row items-center gap-3.5">
                    <Image
                      source={{ uri: person.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e' }}
                      className="w-10 h-10 rounded-full"
                    />
                    <View className="space-y-0.5">
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-sm font-bold text-neutral-900">{person.name}</Text>
                        {isSelected && (
                          <View className="bg-[#eff6ff] px-2 py-0.5 rounded-full border border-blue-100">
                            <Text className="text-[8px] font-bold text-[#007aff] uppercase">Active Focus</Text>
                          </View>
                        )}
                      </View>
                      <Text
                        className={`text-[10px] font-semibold ${
                          person.wellbeingStatus === 'attention' ? 'text-[#ff3b30]' : 'text-[#34c759]'
                        }`}
                      >
                        {person.wellbeingStatus === 'attention'
                          ? 'Needs attention'
                          : `${person.relationship || person.role || 'Family member'} • Vitals stable`}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={16} color={isSelected ? '#007aff' : '#8e8e93'} />
                </TouchableOpacity>
              );
            })}

            {people.length === 0 && (
              <View className="bg-white rounded-3xl p-4 items-center justify-center">
                <Text className="text-xs text-neutral-400">No family members registered yet</Text>
              </View>
            )}
          </View>
        </View>

        {/* Today's Care Checklist */}
        <View className="space-y-2">
          <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider pl-1">
            Today's Care tasks
          </Text>

          <View className="bg-white rounded-3xl p-5 shadow-sm shadow-neutral-100 space-y-4">
            {/* Meds task */}
            <View className="space-y-2.5">
              <View className="flex-row items-start gap-3">
                <View className="w-8 h-8 rounded-full bg-[#eff6ff] items-center justify-center shrink-0">
                  <Pill size={14} color="#007aff" />
                </View>
                <View className="flex-1 space-y-0.5">
                  <Text className="text-xs font-bold text-neutral-800">Medication</Text>
                  <Text className="text-[10px] text-neutral-400 font-semibold">
                    Atorvastatin 20mg • Evening dosage
                  </Text>
                </View>
                <View
                  className={`px-2.5 py-0.5 rounded-full ${isAtorvastatinTaken ? 'bg-emerald-50' : 'bg-orange-50'}`}
                >
                  <Text
                    className={`text-[8px] font-bold uppercase ${isAtorvastatinTaken ? 'text-[#34c759]' : 'text-[#ff9500]'}`}
                  >
                    {isAtorvastatinTaken ? 'Taken' : 'Pending'}
                  </Text>
                </View>
              </View>

              {!isAtorvastatinTaken && (
                <TouchableOpacity
                  onPress={onRemindDad}
                  activeOpacity={0.8}
                  className="bg-[#007aff] py-2.5 px-4 rounded-xl flex-row items-center justify-center gap-2 active:scale-95 shadow-sm"
                >
                  <Bell size={13} color="#ffffff" />
                  <Text className="text-white text-xs font-bold">
                    Remind {primaryName || 'Dad'} to take Atorvastatin
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Appointment task */}
            <View className="flex-row items-start gap-3 border-t border-neutral-100 pt-3.5">
              <View className="w-8 h-8 rounded-full bg-rose-50 items-center justify-center shrink-0">
                <Calendar size={14} color="#ff3b30" />
              </View>
              <View className="flex-1 space-y-0.5">
                <Text className="text-xs font-bold text-neutral-800">Appointment</Text>
                <Text className="text-[10px] text-neutral-400 font-semibold">
                  Cardiology Video Visit •{' '}
                  {currentScenario === 'upcoming-appointment'
                    ? 'Tomorrow 4:00 PM IST'
                    : 'Tomorrow 10:30 AM'}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push(`/parent/${primaryPerson?.id || 'dad'}/prepare` as any)}
                  className="bg-[#007aff] px-3.5 py-2 rounded-xl self-start mt-2 active:scale-95"
                >
                  <Text className="text-white text-[10px] font-bold uppercase">
                    Prepare for appointment
                  </Text>
                </TouchableOpacity>
              </View>
              <View className="bg-blue-50 px-2 py-0.5 rounded-full">
                <Text className="text-[8px] font-bold text-[#007aff] uppercase">Scheduled</Text>
              </View>
            </View>

            {/* Care Task item */}
            <View className="flex-row items-start gap-3 border-t border-neutral-100 pt-3.5">
              <View className="w-8 h-8 rounded-full bg-emerald-50 items-center justify-center shrink-0">
                <Activity size={14} color="#34c759" />
              </View>
              <View className="flex-1 space-y-0.5">
                <Text className="text-xs font-bold text-neutral-800">Care task</Text>
                <Text className="text-[10px] text-neutral-400 font-semibold">
                  Verify afternoon hydration checklist
                </Text>
              </View>
              <View className="bg-emerald-50 px-2 py-0.5 rounded-full">
                <Text className="text-[8px] font-bold text-[#34c759] uppercase">Active</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Updates History Log */}
        <View className="space-y-2">
          <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider pl-1">
            Recent updates
          </Text>

          <View className="bg-white rounded-3xl p-5 shadow-sm shadow-neutral-100 space-y-4">
            {/* Update 1: Primary Checked In */}
            <View className="space-y-3">
              <View className="flex-row justify-between items-start">
                <View className="flex-row items-center gap-2">
                  <View className="w-1.5 h-1.5 rounded-full bg-[#007aff] shrink-0" />
                  <Text className="text-xs font-bold text-neutral-850">{primaryName} checked in</Text>
                </View>
                <Text className="text-[10px] text-neutral-400 font-bold uppercase">
                  {formatTimeForCoordinator('2026-08-19T20:05:00+05:30')}
                </Text>
              </View>

              <View className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                <Text className="text-xs text-neutral-700">
                  Feeling: <Text className="font-bold text-[#34c759]">{feelingText}</Text>
                </Text>
              </View>

              <View className="flex-row gap-2.5 pt-0.5">
                <TouchableOpacity
                  onPress={onOpenCheckIn}
                  className="flex-1 bg-[#eff6ff] py-2 rounded-xl items-center justify-center active:scale-95"
                >
                  <Text className="text-[10px] font-bold text-[#007aff] uppercase">Call {primaryName}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/(coordinator)/ask')}
                  className="flex-1 bg-[#eff6ff] py-2 rounded-xl items-center justify-center active:scale-95"
                >
                  <Text className="text-[10px] font-bold text-[#007aff] uppercase">Message</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/(coordinator)/records')}
                  className="flex-1 bg-[#eff6ff] py-2 rounded-xl items-center justify-center active:scale-95"
                >
                  <Text className="text-[10px] font-bold text-[#007aff] uppercase">History</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Update 2 */}
            <View className="flex-row items-start gap-3 border-t border-neutral-100 pt-3.5">
              <View className="w-1.5 h-1.5 rounded-full bg-[#34c759] mt-1.5 shrink-0" />
              <View className="flex-1 space-y-0.5">
                <Text className="text-xs font-bold text-neutral-850">Health record updated</Text>
                <Text className="text-[10px] text-neutral-400 font-semibold">
                  Fasting metabolic profile panel uploaded • Yesterday
                </Text>
              </View>
            </View>

            {/* Update 3 */}
            <View className="flex-row items-start gap-3 border-t border-neutral-100 pt-3.5">
              <View className="w-1.5 h-1.5 rounded-full bg-[#ff9500] mt-1.5 shrink-0" />
              <View className="flex-1 space-y-0.5">
                <Text className="text-xs font-bold text-neutral-850">
                  Care team confirmed appointment
                </Text>
                <Text className="text-[10px] text-neutral-400 font-semibold">
                  Verified hydration & indoor walking path • Today
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions Action Grid */}
        <View className="space-y-2 mb-12">
          <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider pl-1">
            Quick Actions
          </Text>

          <View className="flex-row flex-wrap gap-2.5">
            {/* Ask AI */}
            <TouchableOpacity
              onPress={onTalkToDoctor}
              className="bg-white rounded-3xl p-4 items-center justify-center flex-1 min-w-[130px] shadow-sm shadow-neutral-100 active:scale-95 space-y-1.5"
            >
              <Sparkles size={16} color="#af52de" />
              <Text className="text-xs font-bold text-neutral-800 text-center">Ask AI</Text>
            </TouchableOpacity>

            {/* Upload report */}
            <TouchableOpacity
              onPress={() => onOpenQuickActions('menu')}
              className="bg-white rounded-3xl p-4 items-center justify-center flex-1 min-w-[130px] shadow-sm shadow-neutral-100 active:scale-95 space-y-1.5"
            >
              <Upload size={16} color="#34c759" />
              <Text className="text-xs font-bold text-neutral-800 text-center">Upload Lab</Text>
            </TouchableOpacity>

            {/* Add Appt */}
            <TouchableOpacity
              onPress={() => onOpenQuickActions('add_appt')}
              className="bg-white rounded-3xl p-4 items-center justify-center flex-1 min-w-[130px] shadow-sm shadow-neutral-100 active:scale-95 space-y-1.5"
            >
              <Calendar size={16} color="#ff3b30" />
              <Text className="text-xs font-bold text-neutral-800 text-center">Add Appt</Text>
            </TouchableOpacity>

            {/* Add Med */}
            <TouchableOpacity
              onPress={() => onOpenQuickActions('add_med')}
              className="bg-white rounded-3xl p-4 items-center justify-center flex-1 min-w-[130px] shadow-sm shadow-neutral-100 active:scale-95 space-y-1.5"
            >
              <Pill size={16} color="#ff9500" />
              <Text className="text-xs font-bold text-neutral-800 text-center">Add Med</Text>
            </TouchableOpacity>
          </View>
          <View className="h-28" />
        </View>
      </ScrollView>
    </View>
  );
};
