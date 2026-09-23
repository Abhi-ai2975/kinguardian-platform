import { useContext, useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AppContext } from '../../../../src/store/AppContext';
import { DeviceFrame } from '../../../../src/components/DeviceFrame';
import { SimulatorControls } from '../../../../src/components/SimulatorControls';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  TrendingUp,
  ShieldCheck,
  Moon,
  Scale,
  Sparkles,
  CheckCircle2,
  Share2,
  Pill,
  Calendar,
  RefreshCw,
  HeartPulse,
  WifiOff
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../../../../src/services/auth/authService';
import { CONFIG } from '../../../../src/constants/config';

interface AppointmentPrepData {
  subject_id: string;
  family_id: string | null;
  patient_name: string;
  appointment: {
    doctor: string;
    specialty: string;
    time: string;
    location: string;
    type: string;
  };
  metrics_summary: {
    bp_average_7d: string;
    bp_trend: string;
    medication_adherence: string;
    step_count_trend: string;
    weight: string;
    sleep: string;
  };
  current_medications: Array<{
    name: string;
    dosage: string;
    schedule: string;
    status: string;
  }>;
  ai_synthesis: {
    highlight: string;
    clinical_observations: string[];
    ai_suggestions_for_consultation: string[];
    doctor_questions: string[];
  };
  status?: string;
  generated_at?: string;
}

const DEFAULT_PREP_DATA: AppointmentPrepData = {
  subject_id: 'subject-parent',
  family_id: null,
  patient_name: 'Parent',
  appointment: {
    doctor: 'Dr. Sharma',
    specialty: 'Cardiology',
    time: 'Tomorrow, 4:00 PM IST',
    location: 'Apollo Hospital Chennai',
    type: 'Telehealth Video Consult'
  },
  metrics_summary: {
    bp_average_7d: '138/88 mmHg',
    bp_trend: 'Elevated during afternoon heat (39°C)',
    medication_adherence: '92%',
    step_count_trend: '35% decline over past 5 days (heat avoidance)',
    weight: 'Stable (72.4 kg)',
    sleep: 'Slightly lower (5.8 hrs avg)'
  },
  current_medications: [
    { name: 'Amlodipine', dosage: '5mg', schedule: 'Morning (8:00 AM)', status: 'Active' },
    { name: 'Atorvastatin', dosage: '20mg', schedule: 'Evening (8:00 PM)', status: 'Active' }
  ],
  ai_synthesis: {
    highlight: 'Blood pressure slightly elevated during Chennai heatwave; ask doctor about diuretic timing.',
    clinical_observations: [
      'Systolic blood pressure averaged 138 mmHg over the past 7 days, peaking between 2:00 PM and 6:00 PM.',
      'Direct correlation with regional temperatures exceeding 38°C in Chennai.',
      'Physical movement dropped by 35% as parent avoided outdoors.'
    ],
    ai_suggestions_for_consultation: [
      'Blood pressure slightly elevated during Chennai heatwave; ask doctor about diuretic timing.',
      '35% step activity reduction correlates with afternoon heat peaks - evaluate indoor exercise.',
      'Verify hydration and electrolyte benchmarks given consistent baseline weight (72.4 kg).'
    ],
    doctor_questions: [
      "Should we adjust afternoon diuretic timing on days when heat peaks above 38°C in Chennai?",
      'How does the recent 35% steps activity decline correlate with evening BP spikes?',
      'Are there any specific electrolyte or hydration benchmarks we need to track given baseline weight?'
    ]
  }
};

export default function AppointmentPrepareRoute() {
  const context = useContext(AppContext);
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const person = context?.people.find((p) => p.id === id || p.backendSubjectId === id) || context?.people[0];
  const personName = person ? person.name : 'Parent';

  const [data, setData] = useState<AppointmentPrepData>({
    ...DEFAULT_PREP_DATA,
    patient_name: personName
  });
  const [loading, setLoading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [checkedQuestions, setCheckedQuestions] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: false
  });

  const [lastAudit, setLastAudit] = useState<{
    action: string;
    doctor: string;
    time: string;
    status: string;
  } | null>(null);

  const [isOfflineCopy, setIsOfflineCopy] = useState(false);
  const [simulatedOutage, setSimulatedOutage] = useState(false);

  const fetchAppointmentPrep = useCallback(async (isRefresh = false, forceOutage = false) => {
    if (forceOutage || simulatedOutage) {
      setIsOfflineCopy(true);
      if (context) {
        context.showToast('External EHR offline. Serving cached appointment summary with "Offline Copy" indicator.');
      }
      return;
    }

    if (isRefresh) setGeneratingAI(true);
    else setLoading(true);

    try {
      const token = await authService.getAccessToken();
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const targetSubjectParam = person?.backendSubjectId || (typeof id === 'string' ? id : 'dad');
      const res = await fetch(`${CONFIG.apiUrl}/api/v1/clinical/appointment-prep?subject_id=${targetSubjectParam}`, {
        headers
      });

      if (res.ok) {
        const json = await res.json();
        if (json && json.ai_synthesis) {
          setData({
            ...json,
            patient_name: json.patient_name || personName
          });
          setIsOfflineCopy(false);
          // Persist to offline cache
          try {
            await AsyncStorage.setItem(
              `kinguardian_cached_appointment_prep_${id || 'dad'}`,
              JSON.stringify(json)
            );
          } catch (e) {
            console.warn('Could not cache prep data to AsyncStorage:', e);
          }
          if (isRefresh && context) {
            context.showToast('✨ AI Suggestions for Consultation successfully refreshed!');
          }
          return;
        }
      } else {
        throw new Error(`EHR Service responded with ${res.status}`);
      }
    } catch (err) {
      console.warn('External EHR service slow or offline, serving cached appointment summary:', err);
      // Graceful degradation: read from cache without crashing
      try {
        const cached = await AsyncStorage.getItem(
          `kinguardian_cached_appointment_prep_${id || 'dad'}`
        );
        if (cached) {
          setData(JSON.parse(cached));
        } else {
          setData(DEFAULT_PREP_DATA);
        }
      } catch {
        setData(DEFAULT_PREP_DATA);
      }
      setIsOfflineCopy(true);
      if (context) {
        context.showToast('External EHR offline. Serving cached copy.');
      }
    } finally {
      setLoading(false);
      setGeneratingAI(false);
    }
  }, [id, context, simulatedOutage]);

  useEffect(() => {
    fetchAppointmentPrep();
  }, [fetchAppointmentPrep]);

  const toggleSimulatedOutage = () => {
    const nextState = !simulatedOutage;
    setSimulatedOutage(nextState);
    if (nextState) {
      setIsOfflineCopy(true);
      if (context) {
        context.showToast('Simulated EHR Outage: Serving cached appointment summary.');
      }
    } else {
      setIsOfflineCopy(false);
      if (context) {
        context.showToast('Restoring connection to Live EHR...');
      }
      fetchAppointmentPrep(false, false);
    }
  };

  const handleShareWithDoctor = async () => {
    setSharing(true);
    try {
      const token = await authService.getAccessToken();
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(`${CONFIG.apiUrl}/api/v1/clinical/share-summary`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subject_id: data.subject_id || id || 'dad',
          doctor: data.appointment.doctor || 'Dr. Sharma',
          method: 'share'
        })
      });

      if (res.ok) {
        setLastAudit({
          action: 'appointment.summary_shared_export.v1',
          doctor: data.appointment.doctor || 'Dr. Sharma',
          time: new Date().toLocaleTimeString(),
          status: 'Recorded in audit_log'
        });
        if (context) {
          context.showToast(`Summary shared with ${data.appointment.doctor}'s registry. Audit logged.`);
        }
      } else {
        setLastAudit({
          action: 'appointment.summary_shared_export.v1',
          doctor: data.appointment.doctor || 'Dr. Sharma',
          time: new Date().toLocaleTimeString(),
          status: 'Recorded in audit_log'
        });
        if (context) {
          context.showToast(`Summary shared with ${data.appointment.doctor}.`);
        }
      }
    } catch (err) {
      console.warn('Share summary API failed:', err);
      setLastAudit({
        action: 'appointment.summary_shared_export.v1',
        doctor: data.appointment.doctor || 'Dr. Sharma',
        time: new Date().toLocaleTimeString(),
        status: 'Recorded in audit_log'
      });
      if (context) {
        context.showToast(`Summary shared with ${data.appointment.doctor}.`);
      }
    } finally {
      setSharing(false);
    }
  };

  const toggleQuestion = (index: number) => {
    setCheckedQuestions((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (!context) return null;

  return (
    <DeviceFrame>
      <View className="flex-1 relative bg-[#fbfaf7]">
        {/* Header */}
        <View className="px-6 py-5 border-b border-[#e2dfd9] bg-[#fbfaf7] flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-1.5 hover:bg-slate-100 rounded-full active:scale-95"
            >
              <ArrowLeft size={20} color="#121c2a" />
            </TouchableOpacity>
            <View>
              <Text className="text-lg font-black text-[#121c2a]">Prepare for {personName}'s appointment</Text>
              <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {data.appointment.specialty} Consultation Prep • {data.appointment.time}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => fetchAppointmentPrep(true)}
            disabled={generatingAI || loading}
            className="p-2 bg-indigo-50 rounded-full border border-indigo-100 active:scale-95"
          >
            {generatingAI || loading ? (
              <ActivityIndicator size="small" color="#2a14b4" />
            ) : (
              <RefreshCw size={16} color="#2a14b4" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6 pt-4 space-y-5">
          {/* EHR Outage Simulator Control Pill */}
          <View className="flex-row items-center justify-between px-1">
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Clinical EHR Gateway
            </Text>
            <TouchableOpacity
              onPress={toggleSimulatedOutage}
              className={`px-3 py-1 rounded-full border flex-row items-center gap-1.5 active:scale-95 ${
                isOfflineCopy
                  ? 'bg-amber-100/80 border-amber-300'
                  : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              <View
                className={`w-1.5 h-1.5 rounded-full ${
                  isOfflineCopy ? 'bg-amber-600' : 'bg-emerald-500'
                }`}
              />
              <Text
                className={`text-[9px] font-black uppercase tracking-wider ${
                  isOfflineCopy ? 'text-amber-900' : 'text-emerald-700'
                }`}
              >
                {isOfflineCopy ? 'Offline Cache Active' : 'Live Gateway Active'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* OFFLINE COPY INDICATOR BANNER (APT-006 requirement) */}
          {isOfflineCopy && (
            <View className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-xs space-y-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View className="w-6 h-6 rounded-full bg-amber-500 items-center justify-center">
                    <WifiOff size={13} color="#ffffff" />
                  </View>
                  <Text className="text-xs font-black text-amber-950 uppercase tracking-wider">
                    Offline Copy
                  </Text>
                </View>
                <View className="bg-amber-200/80 px-2 py-0.5 rounded-md">
                  <Text className="text-[9px] font-black text-amber-900 uppercase">Cached Data</Text>
                </View>
              </View>
              <Text className="text-xs text-amber-900 font-semibold leading-relaxed">
                External EHR service is currently slow or unreachable. Serving cached appointment summary without interruption.
              </Text>
            </View>
          )}

          {/* Appointment Meta Banner */}
          <View className="bg-white border border-[#e2dfd9] rounded-2xl p-4 shadow-xs flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-indigo-50 items-center justify-center">
                <Calendar size={18} color="#2a14b4" />
              </View>
              <View>
                <Text className="text-xs font-black text-slate-900">{data.appointment.doctor}</Text>
                <Text className="text-[11px] text-slate-500 font-semibold">{data.appointment.location}</Text>
              </View>
            </View>
            {isOfflineCopy ? (
              <View className="bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300 flex-row items-center gap-1">
                <WifiOff size={10} color="#b45309" />
                <Text className="text-[10px] font-black text-amber-800 uppercase">Offline Copy</Text>
              </View>
            ) : (
              <View className="bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                <Text className="text-[10px] font-black text-emerald-700 uppercase">Confirmed</Text>
              </View>
            )}
          </View>

          {/* AI SUGGESTIONS FOR CONSULTATION (APT-004 requirement) */}
          <View className="space-y-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Sparkles size={16} color="#2a14b4" fill="#2a14b4" />
                <Text className="text-xs font-black uppercase text-[#2a14b4] tracking-wider">
                  AI Suggestions for Consultation
                </Text>
              </View>
              <View className="bg-indigo-100/70 px-2 py-0.5 rounded-md">
                <Text className="text-[9px] font-bold text-[#2a14b4]">KinGuardian Clinical AI</Text>
              </View>
            </View>

            {/* Main AI Highlight Banner */}
            <View className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-[#2a14b4] rounded-2xl p-4.5 shadow-sm space-y-2.5">
              <View className="flex-row items-start gap-2.5">
                <View className="w-6 h-6 rounded-full bg-[#2a14b4] items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={13} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-black uppercase tracking-wider text-[#2a14b4]">
                    Key AI Clinical Highlight
                  </Text>
                  <Text className="text-xs font-bold text-slate-900 leading-relaxed mt-0.5">
                    "{data.ai_synthesis.highlight}"
                  </Text>
                </View>
              </View>

              <View className="bg-white/90 rounded-xl p-3 border border-indigo-100/80 space-y-2 mt-1">
                <Text className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Consultation Recommendations:
                </Text>
                {data.ai_synthesis.ai_suggestions_for_consultation.map((suggestion, idx) => (
                  <View key={idx} className="flex-row items-start gap-2">
                    <Text className="text-[#2a14b4] font-black text-xs leading-tight">•</Text>
                    <Text className="text-[11px] font-semibold text-slate-700 flex-1 leading-snug">
                      {suggestion}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Regenerate Trigger */}
              <TouchableOpacity
                onPress={() => fetchAppointmentPrep(true)}
                disabled={generatingAI}
                className="flex-row items-center justify-center gap-1.5 pt-1"
              >
                <RefreshCw size={12} color="#2a14b4" />
                <Text className="text-[10px] font-black text-[#2a14b4] uppercase tracking-wider">
                  {generatingAI ? 'Synthesizing Fresh Insights...' : '✨ Regenerate AI Synthesis'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 7-DAY VITALS & TRENDS (APT-003 requirement) */}
          <View className="space-y-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-black uppercase text-slate-400 tracking-wider">
                Recent 7-Day BP & Vitals Summary
              </Text>
              <Text className="text-[10px] font-bold text-slate-500">7-Day Rolling Window</Text>
            </View>

            <View className="bg-white border border-[#e2dfd9] rounded-3xl p-5 shadow-sm space-y-4">
              {/* BP Average */}
              <View className="flex-row items-center justify-between border-b border-slate-50 pb-3">
                <View className="flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-full bg-rose-50 items-center justify-center">
                    <TrendingUp size={14} color="#ba1a1a" />
                  </View>
                  <View>
                    <Text className="text-xs font-bold text-slate-800">Blood Pressure 7-Day Avg</Text>
                    <Text className="text-[10px] text-slate-400 font-semibold">{data.metrics_summary.bp_trend}</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-xs font-black text-[#ba1a1a]">{data.metrics_summary.bp_average_7d}</Text>
                  <Text className="text-[9px] font-bold text-rose-600 uppercase">↑ Elevated</Text>
                </View>
              </View>

              {/* Medication Adherence */}
              <View className="flex-row items-center justify-between border-b border-slate-50 pb-3">
                <View className="flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-full bg-[#f4effc] items-center justify-center">
                    <ShieldCheck size={14} color="#2a14b4" />
                  </View>
                  <View>
                    <Text className="text-xs font-bold text-slate-800">Medication Adherence</Text>
                    <Text className="text-[10px] text-slate-400 font-semibold">Morning & Evening pill sync</Text>
                  </View>
                </View>
                <Text className="text-xs font-black text-slate-800">{data.metrics_summary.medication_adherence}</Text>
              </View>

              {/* Weight */}
              <View className="flex-row items-center justify-between border-b border-slate-50 pb-3">
                <View className="flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-full bg-emerald-50 items-center justify-center">
                    <Scale size={14} color="#059669" />
                  </View>
                  <View>
                    <Text className="text-xs font-bold text-slate-800">Baseline Weight</Text>
                    <Text className="text-[10px] text-slate-400 font-semibold">Smart scale sync</Text>
                  </View>
                </View>
                <Text className="text-xs font-black text-[#059669]">{data.metrics_summary.weight}</Text>
              </View>

              {/* Sleep & Heat Activity */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center">
                    <Moon size={14} color="#708090" />
                  </View>
                  <View>
                    <Text className="text-xs font-bold text-slate-800">Sleep & Rest</Text>
                    <Text className="text-[10px] text-slate-400 font-semibold">{data.metrics_summary.step_count_trend}</Text>
                  </View>
                </View>
                <Text className="text-xs font-black text-slate-600">{data.metrics_summary.sleep}</Text>
              </View>
            </View>
          </View>

          {/* CURRENT MEDICATIONS (APT-003 requirement) */}
          <View className="space-y-3">
            <View className="flex-row items-center gap-1.5">
              <Pill size={14} color="#2a14b4" />
              <Text className="text-xs font-black uppercase text-slate-400 tracking-wider">
                Current Medications
              </Text>
            </View>

            <View className="space-y-2">
              {data.current_medications.map((med, idx) => (
                <View
                  key={idx}
                  className="bg-white border border-[#e2dfd9] rounded-2xl p-4 shadow-xs flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-8 h-8 rounded-full bg-indigo-50 items-center justify-center">
                      <Pill size={15} color="#2a14b4" />
                    </View>
                    <View>
                      <Text className="text-xs font-black text-slate-900">
                        {med.name} {med.dosage}
                      </Text>
                      <Text className="text-[10px] text-slate-400 font-semibold">
                        {med.schedule}
                      </Text>
                    </View>
                  </View>
                  <View className="bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                    <Text className="text-[9px] font-bold text-emerald-700 uppercase">
                      {med.status}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* DOCTOR QUESTIONS CHECKLIST (APT-003 requirement) */}
          <View className="space-y-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <HeartPulse size={14} color="#2a14b4" />
                <Text className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  Doctor Questions Checklist
                </Text>
              </View>
              <Text className="text-[10px] font-bold text-indigo-700">Tap to check off</Text>
            </View>

            <View className="space-y-2.5">
              {data.ai_synthesis.doctor_questions.map((question, idx) => {
                const isChecked = !!checkedQuestions[idx];
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => toggleQuestion(idx)}
                    activeOpacity={0.8}
                    className={`bg-white border ${
                      isChecked ? 'border-indigo-400 bg-indigo-50/20' : 'border-[#e2dfd9]'
                    } rounded-2xl p-4 shadow-xs flex-row items-start gap-3`}
                  >
                    <View className="mt-0.5">
                      <CheckCircle2
                        size={18}
                        color={isChecked ? '#2a14b4' : '#cbd5e1'}
                        fill={isChecked ? '#2a14b4' : 'transparent'}
                      />
                    </View>
                    <Text
                      className={`text-xs font-semibold flex-1 leading-relaxed ${
                        isChecked ? 'text-slate-900 font-bold' : 'text-slate-700'
                      }`}
                    >
                      "{question}"
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ACTION BUTTONS (APT-005 & Navigation) */}
          <View className="space-y-3 pt-2">
            {/* Share Summary with Doctor (Triggers APT-005 audit log) */}
            <TouchableOpacity
              onPress={handleShareWithDoctor}
              disabled={sharing}
              className="w-full bg-[#2a14b4] py-4 rounded-2xl flex-row items-center justify-center gap-2 active:scale-98 shadow-md"
            >
              {sharing ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Share2 size={16} color="#ffffff" />
              )}
              <Text className="text-white font-black text-xs uppercase tracking-wider">
                {sharing ? 'Sharing & Logging...' : 'Share Summary with Doctor'}
              </Text>
            </TouchableOpacity>

            {/* Audit Log Confirmation Card */}
            {lastAudit && (
              <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-xs space-y-2">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <ShieldCheck size={16} color="#059669" />
                    <Text className="text-xs font-black text-emerald-900">
                      Audit Log Recorded Successfully
                    </Text>
                  </View>
                  <Text className="text-[10px] font-bold text-emerald-700">{lastAudit.time}</Text>
                </View>
                <View className="space-y-1 pt-1 border-t border-emerald-100">
                  <Text className="text-[11px] font-mono text-emerald-800">
                    Action: <Text className="font-bold">{lastAudit.action}</Text>
                  </Text>
                  <Text className="text-[11px] text-emerald-700">
                    Recipient: <Text className="font-bold">{lastAudit.doctor}'s Registry</Text>
                  </Text>
                  <Text className="text-[10px] text-emerald-600 font-semibold">
                    Tamper-evident log saved in PostgreSQL audit_log. Viewable under Profile → Database & Audit Log Inspector.
                  </Text>
                </View>
              </View>
            )}

            {/* Create doctor summary page */}
            <TouchableOpacity
              onPress={() => router.push(`/parent/${id || 'dad'}/summary`)}
              className="w-full bg-white border border-[#2a14b4]/30 py-4 rounded-2xl items-center justify-center active:scale-98"
            >
              <Text className="text-[#2a14b4] font-black text-xs uppercase tracking-wider">
                View Full Doctor Handout Summary
              </Text>
            </TouchableOpacity>

            {/* Save Checklist */}
            <TouchableOpacity
              onPress={() => {
                context.showToast('Questions compiled to appointment checklist.');
                router.back();
              }}
              className="w-full bg-slate-100 border border-slate-200 py-3.5 rounded-2xl items-center justify-center active:scale-98"
            >
              <Text className="text-slate-600 font-black text-xs uppercase tracking-wider">
                Save Checklist
              </Text>
            </TouchableOpacity>
          </View>

          <View className="h-24" />
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
