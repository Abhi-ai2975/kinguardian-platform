import { useContext, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  User,
  Activity,
  Stethoscope,
  Pill,
  FileText,
  Watch,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Phone,
  MessageSquare,
  Flame,
  Heart,
  Moon
} from 'lucide-react-native';
import { AppContext } from '../../../../src/store/AppContext';
import { DeviceFrame } from '../../../../src/components/DeviceFrame';
import { SimulatorControls } from '../../../../src/components/SimulatorControls';
import { googleFitService } from '../../../../src/services/health/GoogleFitService';

export default function ParentClinicalOverviewRoute() {
  const context = useContext(AppContext);
  const router = useRouter();
  const { id } = useLocalSearchParams();

  if (!context) return null;

  const personId = typeof id === 'string' ? id : 'dad';
  const person =
    context.people.find((p) => p.id === personId || p.backendSubjectId === personId) ||
    context.familyMembers.find((p) => p.id === personId || p.backendSubjectId === personId) ||
    context.people[0] ||
    {
      id: 'dad',
      name: 'Parent',
      relation: 'Father',
      relationship: 'Father',
      age: 68,
      city: 'Chennai',
      country: 'India',
      location: 'Chennai, India',
      wellbeingStatus: 'doing-well' as const
    };

  const isDad =
    person.relation?.toLowerCase().includes('father') ||
    person.relationship?.toLowerCase().includes('father');

  const primaryName = person.name || 'Parent';
  const bpSystolic = parseInt(context.currentBP.split('/')[0] || '120', 10);
  const isNeedsAttention = isDad && bpSystolic >= 140;

  const [telemetry, setTelemetry] = useState({
    steps: 5420,
    heartRate: 68,
    sleepMinutes: 475,
    isStreaming: true,
    provenance: 'Google Fit App (Live Stream)'
  });

  useEffect(() => {
    const targetSubjectId = person.backendSubjectId || person.id;
    googleFitService.startRealTimeStreaming(targetSubjectId, 3500);
    const unsubscribe = googleFitService.subscribe((data) => {
      setTelemetry({
        steps: data.steps,
        heartRate: data.heartRate,
        sleepMinutes: data.sleepMinutes,
        isStreaming: data.isStreaming,
        provenance: data.provenance
      });
    });
    return () => {
      unsubscribe();
      googleFitService.stopRealTimeStreaming();
    };
  }, [person.backendSubjectId, person.id, isDad]);

  // Resolve caregiver identity from the family data.
  const caregiverMember =
    context.familyMembers.find(
      (m) => m.role === 'caregiver' || m.relationship?.toLowerCase().includes('caregiver') || m.relation?.toLowerCase().includes('caregiver')
    );

  return (
    <DeviceFrame>
      <View className="flex-1 relative bg-[#f8f9fc]">
        {/* Header */}
        <View className="px-5 py-4 border-b border-slate-200/80 bg-white flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => router.push('/(coordinator)')}
              className="p-2 bg-slate-100 rounded-full active:bg-slate-200"
            >
              <ArrowLeft size={18} color="#1e293b" />
            </TouchableOpacity>
            <View>
              <Text className="text-base font-black text-slate-900 leading-tight">
                {primaryName}
              </Text>
              <Text className="text-[10px] text-slate-500 font-semibold">
                FHIR Patient: <Text className="font-mono text-blue-700">Patient/{person.backendSubjectId || person.id}</Text>
              </Text>
            </View>
          </View>

          <View
            className={`px-2.5 py-1 rounded-full flex-row items-center gap-1 border ${
              isNeedsAttention
                ? 'bg-red-50 border-red-200'
                : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <View
              className={`w-1.5 h-1.5 rounded-full ${
                isNeedsAttention ? 'bg-red-500' : 'bg-emerald-500'
              }`}
            />
            <Text
              className={`text-[9px] font-black uppercase ${
                isNeedsAttention ? 'text-red-700' : 'text-emerald-700'
              }`}
            >
              {isNeedsAttention ? 'Attention' : 'Doing Well'}
            </Text>
          </View>
        </View>

        <ScrollView className="flex-1 px-5 pt-4 space-y-4" showsVerticalScrollIndicator={false}>
          {/* Parent Summary Card */}
          <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            <View className="flex-row items-center gap-3.5">
              <Image
                source={{
                  uri:
                    person.avatarUrl ||
                    (isDad
                      ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e'
                      : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2')
                }}
                className="w-14 h-14 rounded-full border-2 border-blue-100"
              />
              <View className="flex-1">
                <Text className="text-lg font-black text-slate-900">{primaryName}</Text>
                <Text className="text-xs text-slate-500 font-medium">
                  {person.age || 68} yrs • {person.relationship || 'Father'} • {person.city || 'Chennai'}, India
                </Text>
                <Text className="text-[10px] text-blue-600 font-bold mt-0.5">
                  Medical record number unavailable • Apollo Cardiology
                </Text>
              </View>
            </View>

            {/* Quick Vitals Row */}
            <View className="flex-row gap-2 pt-2 border-t border-slate-100">
              <View className="flex-1 bg-slate-50 p-2.5 rounded-2xl items-center border border-slate-100">
                <Text className="text-[9px] font-bold text-slate-400 uppercase">Blood Pressure</Text>
                <Text className="text-sm font-black text-slate-900 mt-0.5">{context.currentBP}</Text>
                <Text className="text-[8px] text-emerald-600 font-bold">Latest Sync</Text>
              </View>
              <View className="flex-1 bg-slate-50 p-2.5 rounded-2xl items-center border border-slate-100">
                <Text className="text-[9px] font-bold text-slate-400 uppercase">Glucose</Text>
                <Text className="text-sm font-black text-slate-900 mt-0.5">{context.currentGlucose} mg/dL</Text>
                <Text className="text-[8px] text-blue-600 font-bold">Fasting</Text>
              </View>
              <View className="flex-1 bg-slate-50 p-2.5 rounded-2xl items-center border border-slate-100">
                <Text className="text-[9px] font-bold text-slate-400 uppercase">Resting HR</Text>
                <Text className="text-sm font-black text-slate-900 mt-0.5">{telemetry.heartRate} bpm</Text>
                <Text className="text-[8px] text-emerald-600 font-bold">Google Fit Live</Text>
              </View>
            </View>
          </View>

          {/* Google Fit Live Telemetry Card */}
          <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3.5">
            <View className="flex-row items-center justify-between pb-2.5 border-b border-slate-100">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-xl bg-emerald-50 items-center justify-center">
                  <Activity size={16} color="#059669" />
                </View>
                <View>
                  <Text className="text-xs font-black text-slate-900">Google Fit Live Stream</Text>
                  <Text className="text-[10px] text-slate-400 font-medium">
                    Provenance: <Text className="font-bold text-slate-700">{telemetry.provenance}</Text>
                  </Text>
                </View>
              </View>
              <View className="bg-emerald-50 border border-emerald-300 rounded-full px-2.5 py-0.5 flex-row items-center gap-1.5 shadow-xs">
                <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <Text className="text-[9px] font-bold text-emerald-700 uppercase">LIVE STREAMING</Text>
              </View>
            </View>

            {/* 3 Live Wearable Metrics */}
            <View className="flex-row gap-2.5">
              <View className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-2.5 items-center">
                <View className="flex-row items-center gap-1 mb-0.5">
                  <Flame size={12} color="#f97316" />
                  <Text className="text-[9px] font-bold text-slate-500 uppercase">Steps</Text>
                </View>
                <Text className="text-base font-black text-slate-900">
                  {telemetry.steps.toLocaleString()}
                </Text>
                <Text className="text-[9px] text-emerald-600 font-bold mt-0.5">Live Moving</Text>
              </View>

              <View className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-2.5 items-center">
                <View className="flex-row items-center gap-1 mb-0.5">
                  <Heart size={12} color="#e11d48" />
                  <Text className="text-[9px] font-bold text-slate-500 uppercase">Resting HR</Text>
                </View>
                <Text className="text-base font-black text-slate-900">
                  {telemetry.heartRate} bpm
                </Text>
                <Text className="text-[9px] text-slate-500 font-medium mt-0.5">Real-time</Text>
              </View>

              <View className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-2.5 items-center">
                <View className="flex-row items-center gap-1 mb-0.5">
                  <Moon size={12} color="#6366f1" />
                  <Text className="text-[9px] font-bold text-slate-500 uppercase">Rest Sleep</Text>
                </View>
                <Text className="text-base font-black text-slate-900">
                  {Math.floor(telemetry.sleepMinutes / 60)}h {telemetry.sleepMinutes % 60}m
                </Text>
                <Text className="text-[9px] text-indigo-600 font-bold mt-0.5">
                  {telemetry.sleepMinutes} mins
                </Text>
              </View>
            </View>

            {/* Quick Actions: Open App & Manage */}
            <View className="flex-row gap-2 pt-1">
              <TouchableOpacity
                onPress={() => googleFitService.openGoogleFitApp()}
                className="flex-1 bg-emerald-50 border border-emerald-200/80 active:bg-emerald-100 py-2 rounded-xl flex-row items-center justify-center gap-1.5"
              >
                <Activity size={12} color="#059669" />
                <Text className="text-[11px] font-bold text-emerald-800">Open Google Fit App ↗</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push(`/(coordinator)/parent/${personId}/wearables` as any)}
                className="flex-1 bg-slate-100 active:bg-slate-200 py-2 rounded-xl flex-row items-center justify-center gap-1.5"
              >
                <Watch size={12} color="#007aff" />
                <Text className="text-[11px] font-bold text-[#007aff]">Wearables & Sync →</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 5 FHIR Clinical Modules */}
          <View className="space-y-2.5">
            <View className="flex-row items-center justify-between px-1">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                FHIR Clinical Modules
              </Text>
              <View className="flex-row items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                <ShieldCheck size={11} color="#007aff" />
                <Text className="text-[9px] font-bold text-blue-700">HL7 FHIR R4</Text>
              </View>
            </View>

            {/* 1. Profile & Identity */}
            <TouchableOpacity
              onPress={() => router.push(`/(coordinator)/parent/${personId}/profile` as any)}
              className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex-row items-center justify-between active:bg-slate-50"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-blue-100 items-center justify-center">
                  <User size={18} color="#007aff" />
                </View>
                <View>
                  <Text className="text-xs font-black text-slate-900">FHIR Profile & Identity</Text>
                  <Text className="text-[10px] text-slate-500 font-medium">
                    MRN-2024-88492, Demographics & Care Grants
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>

            {/* 2. Vitals */}
            <TouchableOpacity
              onPress={() => router.push(`/(coordinator)/parent/${personId}/vitals` as any)}
              className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex-row items-center justify-between active:bg-slate-50"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-rose-100 items-center justify-center">
                  <Activity size={18} color="#e11d48" />
                </View>
                <View>
                  <Text className="text-xs font-black text-slate-900">Vitals & Observations</Text>
                  <Text className="text-[10px] text-slate-500 font-medium">
                    BP {context.currentBP}, Glucose & Trend Charts
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>

            {/* 3. Conditions */}
            <TouchableOpacity
              onPress={() => router.push(`/(coordinator)/parent/${personId}/conditions` as any)}
              className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex-row items-center justify-between active:bg-slate-50"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-indigo-100 items-center justify-center">
                  <Stethoscope size={18} color="#4f46e5" />
                </View>
                <View>
                  <Text className="text-xs font-black text-slate-900">Health Profile & Conditions</Text>
                  <Text className="text-[10px] text-slate-500 font-medium">
                    Hypertension (I10), Type 2 Diabetes, Stent (2022)
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>

            {/* 4. Medications */}
            <TouchableOpacity
              onPress={() => router.push(`/(coordinator)/parent/${personId}/medications` as any)}
              className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex-row items-center justify-between active:bg-slate-50"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-amber-100 items-center justify-center">
                  <Pill size={18} color="#d97706" />
                </View>
                <View>
                  <Text className="text-xs font-black text-slate-900">Medications & Adherence</Text>
                  <Text className="text-[10px] text-slate-500 font-medium">
                    Amlodipine, Atorvastatin • 94% adherence
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>

            {/* 5. Labs */}
            <TouchableOpacity
              onPress={() => router.push(`/(coordinator)/parent/${personId}/labs` as any)}
              className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex-row items-center justify-between active:bg-slate-50"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-emerald-100 items-center justify-center">
                  <FileText size={18} color="#059669" />
                </View>
                <View>
                  <Text className="text-xs font-black text-slate-900">Laboratory & Diagnostic Reports</Text>
                  <Text className="text-[10px] text-slate-500 font-medium">
                    Metabolic panel, HbA1c 6.8%, Lipid profile
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Quick Actions Grid */}
          <View className="space-y-2.5">
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Clinical & Care Actions
            </Text>
            <View className="flex-row flex-wrap gap-2.5">
              <TouchableOpacity
                onPress={() => router.push(`/(coordinator)/parent/${personId}/wearables` as any)}
                className="bg-white rounded-2xl p-3.5 flex-1 min-w-[140px] border border-slate-200/80 shadow-xs active:scale-95 space-y-1.5"
              >
                <Watch size={16} color="#007aff" />
                <Text className="text-xs font-black text-slate-900">Wearables & Sync</Text>
                <Text className="text-[9px] text-slate-400 font-medium">Google Fit Live Stream</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push(`/(coordinator)/parent/${personId}/guardian` as any)}
                className="bg-white rounded-2xl p-3.5 flex-1 min-w-[140px] border border-slate-200/80 shadow-xs active:scale-95 space-y-1.5"
              >
                <Sparkles size={16} color="#7c3aed" />
                <Text className="text-xs font-black text-slate-900">Guardian Baseline</Text>
                <Text className="text-[9px] text-slate-400 font-medium">30-Day Physiological Model</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push(`/(coordinator)/parent/${personId}/insights` as any)}
                className="bg-white rounded-2xl p-3.5 flex-1 min-w-[140px] border border-slate-200/80 shadow-xs active:scale-95 space-y-1.5"
              >
                <Activity size={16} color="#e11d48" />
                <Text className="text-xs font-black text-slate-900">AI Transparency</Text>
                <Text className="text-[9px] text-slate-400 font-medium">Telemetry Reasoning</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push(`/(coordinator)/parent/${personId}/prepare` as any)}
                className="bg-white rounded-2xl p-3.5 flex-1 min-w-[140px] border border-slate-200/80 shadow-xs active:scale-95 space-y-1.5"
              >
                <Calendar size={16} color="#d97706" />
                <Text className="text-xs font-black text-slate-900">Doctor Prep</Text>
                <Text className="text-[9px] text-slate-400 font-medium">Questions & Sharing</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push(`/(coordinator)/parent/${personId}/summary` as any)}
                className="bg-rose-50 rounded-2xl p-3.5 w-full border border-rose-200 shadow-xs active:scale-95 flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-2.5">
                  <AlertTriangle size={18} color="#e11d48" />
                  <View>
                    <Text className="text-xs font-black text-rose-900">Emergency Clinical Summary</Text>
                    <Text className="text-[9px] text-rose-600 font-medium">
                      One-tap clinical sheet for paramedics & ER doctors
                    </Text>
                  </View>
                </View>
                <ChevronRight size={16} color="#e11d48" />
              </TouchableOpacity>
            </View>
          </View>

          {caregiverMember && (
            <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3 mb-10">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Assigned Local Caregiver
                </Text>
                <TouchableOpacity
                  onPress={() => router.push(`/(coordinator)/caregiver/${caregiverMember.id}` as any)}
                  className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200"
                >
                  <Text className="text-[9px] font-bold text-blue-700">View Profile</Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row items-center justify-between pt-1">
                <View className="flex-row items-center gap-3">
                  <Image
                    source={{ uri: caregiverMember.avatarUrl }}
                    className="w-11 h-11 rounded-full border border-blue-200"
                  />
                  <View>
                    <Text className="text-sm font-bold text-slate-900">{caregiverMember.name}</Text>
                    <Text className="text-[10px] text-slate-500 font-medium">
                      {caregiverMember.relationship || caregiverMember.role}
                      {caregiverMember.city ? ` • ${caregiverMember.city}` : ''}
                    </Text>
                  </View>
                </View>

                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => context.showToast(`Dialing caregiver ${caregiverMember.name}...`)}
                    className="w-9 h-9 rounded-full bg-[#007aff] items-center justify-center active:scale-95 shadow-xs"
                  >
                    <Phone size={15} color="#ffffff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      context.setAskAIQuery(`Ask ${caregiverMember.name} about ${person.name}'s status`);
                      context.setAskAIOpen(true);
                      router.push('/(coordinator)/ask');
                    }}
                    className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:scale-95"
                  >
                    <MessageSquare size={15} color="#007aff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
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
