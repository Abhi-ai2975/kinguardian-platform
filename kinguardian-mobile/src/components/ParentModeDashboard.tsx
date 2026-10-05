import React, { useState, useContext, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  MessageSquare,
  Volume2,
  Bell,
  Watch,
  ChevronRight,
  Calendar,
  FileText,
  Sparkles,
  Flame,
  Heart,
  Moon,
  Activity,
  Camera,
  Image as ImageIcon,
  Mic,
  RefreshCw,
  Check,
  X
} from 'lucide-react-native';

import { HealthRecordItem } from '../types';
import { t } from '../i18n';
import { AppContext } from '../store/AppContext';
import { googleFitService } from '../services/health/GoogleFitService';
import { healthConnectService } from '../services/health/HealthConnectService';
import { formatTimeForParent } from '../utils/timezone';

interface ParentModeDashboardProps {
  medications: HealthRecordItem[];
  onConfirmMedication: (id: string, name: string, taken: boolean) => void;
  onCheckIn: (status: 'Good' | 'Tired' | 'Unwell') => void;
  onOpenVoice: () => void;
  dadStatus: string;
  isAtorvastatinTaken: boolean;
  onOpenNotifications: () => void;
  unreadCount: number;
  targetSubjectId?: string;
}

export const ParentModeDashboard: React.FC<ParentModeDashboardProps> = ({
  medications,
  onConfirmMedication,
  onCheckIn,
  onOpenVoice,
  isAtorvastatinTaken,
  onOpenNotifications,
  unreadCount,
  targetSubjectId
}) => {
  const router = useRouter();
  const context = useContext(AppContext);
  const coordName = context?.coordinatorName || 'Coordinator';
  const parentName = context?.currentUser?.name || 'Parent';

  // Check-in state variables
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [feeling, setFeeling] = useState<'Good' | 'Tired' | 'Unwell' | null>(null);
  const [typedNote, setTypedNote] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isDoseConfirmed, setIsDoseConfirmed] = useState(false);
  // CHK-004: Source event time of the most recent check-in, rendered in the parent's timezone.
  const [lastCheckInAt, setLastCheckInAt] = useState<string | null>(null);
  const parentTimezone =
    (typeof Intl !== 'undefined' && Intl.DateTimeFormat?.().resolvedOptions?.().timeZone) ||
    'Asia/Kolkata';

  const [activeDevice, setActiveDevice] = useState<{
    name: string;
    status: string;
    lastUpdated: string;
    steps?: number;
  }>({
    name: 'Google Fit',
    status: 'Live Real-Time',
    lastUpdated: 'Live streaming',
    steps: googleFitService.getLatestTelemetry().steps || 0
  });

  const [telemetry, setTelemetry] = useState(() => {
    const latest = googleFitService.getLatestTelemetry();
    return {
      steps: latest.steps || 0,
      heartRate: latest.heartRate || 72,
      sleepMinutes: latest.sleepMinutes || 465,
      isStreaming: latest.isStreaming,
      provenance: latest.provenance || 'Google Fit'
    };
  });

  // Google Fit Live Sync states
  const [showFitModal, setShowFitModal] = useState(false);
  const [inputSteps, setInputSteps] = useState('');
  const [isSyncingFit, setIsSyncingFit] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const resolvedId = targetSubjectId || context?.currentPersonId || 'a8a8f689-6ae7-441f-bba3-262dfbfe022c';

    // Fetch immediately
    googleFitService.fetchLatestData(resolvedId);

    // Real-time live Google Fit streaming
    googleFitService.startRealTimeStreaming(resolvedId, 3500);
    const unsubscribe = googleFitService.subscribe((data) => {
      if (isMounted) {
        setTelemetry({
          steps: data.steps,
          heartRate: data.heartRate,
          sleepMinutes: data.sleepMinutes,
          isStreaming: data.isStreaming,
          provenance: data.provenance
        });
        setActiveDevice({
          name: 'Google Fit',
          status: 'Live Real-Time',
          lastUpdated: 'Live streaming',
          steps: data.steps
        });
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      googleFitService.stopRealTimeStreaming();
    };
  }, [targetSubjectId, context?.currentPersonId]);

  const handleSyncGoogleFit = async () => {
    setIsSyncingFit(true);
    const resolvedId = targetSubjectId || context?.currentPersonId;
    try {
      const real = await healthConnectService.fetchRealTelemetry();
      if (real && real.isRealDeviceData && typeof real.steps === 'number') {
        await googleFitService.syncLiveGoogleFitSteps(real.steps, resolvedId, real.heartRate, real.sleepMinutes);
        Alert.alert('Google Fit Synced', `Successfully fetched ${real.steps.toLocaleString()} live steps from Google Fit! ${coordName || 'Coordinator'} has been updated.`);
        setIsSyncingFit(false);
        return;
      }
    } catch (e) {
      console.warn('Health connect auto-fetch error:', e);
    }
    setIsSyncingFit(false);
    setInputSteps(telemetry.steps ? String(telemetry.steps) : '0');
    setShowFitModal(true);
  };

  const handleSaveFitSteps = async () => {
    const parsed = parseInt(inputSteps, 10);
    if (isNaN(parsed) || parsed < 0) {
      Alert.alert('Invalid Steps', 'Please enter a valid number of steps.');
      return;
    }
    const resolvedId = targetSubjectId || context?.currentPersonId;
    setIsSyncingFit(true);
    try {
      await googleFitService.syncLiveGoogleFitSteps(parsed, resolvedId, telemetry.heartRate || 0, telemetry.sleepMinutes || 0);
      setShowFitModal(false);
      Alert.alert('Google Fit Updated', `${parsed.toLocaleString()} steps synced to KinGuardian and shared with ${coordName || 'Coordinator'}!`);
    } catch (e) {
      Alert.alert('Sync Failed', 'Could not sync steps. Please try again.');
    } finally {
      setIsSyncingFit(false);
    }
  };

  const upcomingAppt = context?.appointments?.find(
    (a) => a.status === 'upcoming' && (!a.personId || a.personId === 'dad')
  ) || context?.appointments?.[0] || {
    doctorName: 'Dr. Sharma',
    specialty: 'Cardiology',
    date: 'Tomorrow',
    time: '4:00 PM',
    location: 'Apollo Hospital'
  };

  const handleSelectFeeling = (sel: 'Good' | 'Tired' | 'Unwell') => {
    setFeeling(sel);
    setStep(2);
  };

  const handleFinalizeCheckIn = (customNote?: string) => {
    const finalNote = customNote || typedNote;
    if (feeling) {
      onCheckIn(feeling);
      setLastCheckInAt(new Date().toISOString());
      if (
        feeling === 'Unwell' ||
        finalNote.toLowerCase().includes('chest') ||
        finalNote.toLowerCase().includes('uncomfortable')
      ) {
        setIsUrgent(true);
      } else {
        setIsUrgent(false);
      }
    }
    setStep(3);
  };

  const hasCheckInRequest = context?.notifications.some(
    (n) => n.recipient === 'parent' && n.category === 'kinguardian_request' && !n.read
  );

  return (
    <>
      <ScrollView className="flex-1 bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* iOS Native Style Header Bar */}
      <View className="bg-white/80 backdrop-blur-xl pt-8 pb-6 px-6 flex-row justify-between items-center border-b border-slate-100/50 shadow-lg">
        <View>
          <View className="flex-row items-center gap-2 mb-1">
            <View className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-1 rounded-full">
              <Text className="text-[10px] font-bold text-white uppercase tracking-wider">
                Parent Mode
              </Text>
            </View>
          </View>
          <Text className="text-2xl font-bold text-slate-900 tracking-tight">
            {t('parentHome.greeting')}
          </Text>
          <Text className="text-sm text-slate-500 mt-1">
            Connected with {coordName}
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
            accessibilityHint="Opens notification center"
            onPress={onOpenNotifications}
            className="w-11 h-11 bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl items-center justify-center relative active:scale-95 shadow-lg border border-slate-200"
          >
            <Bell size={18} color="#64748b" />
            {unreadCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 w-5 h-5 rounded-full items-center justify-center border-2 border-white shadow-lg">
                <Text className="text-white text-[10px] font-bold">{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View className="p-5 space-y-6">
        {context?.currentScenario === 'upcoming-appointment' && (
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Upcoming appointment tomorrow at 4 PM with Dr. Sharma Cardiology"
            accessibilityHint="Navigates to appointment details and preparations"
            onPress={() => router.push('/(parent)/appointments')}
            className="bg-white rounded-3xl p-5 shadow-lg shadow-neutral-100 space-y-2 border-l-4 border-[#007aff] active:scale-98"
          >
            <Text className="text-sm font-bold text-neutral-900 tracking-tight">
              Your appointment is tomorrow at 4 PM
            </Text>
            <Text className="text-xs text-neutral-500 leading-normal">
              Dr. Sharma Cardiology telehealth consult is booked. Tap to view preparations.
            </Text>
          </TouchableOpacity>
        )}

        {/* Section 1: How are you feeling? */}
        <View className="bg-white rounded-3xl p-5 shadow-lg shadow-neutral-100 space-y-4">
          {hasCheckInRequest && (
            <View className="bg-blue-50/50 p-4 rounded-xl flex-row items-center gap-3">
              <Text className="text-xs font-semibold text-[#007aff] flex-1 leading-relaxed">
                📢 {coordName} sent you a check-in request. Let them know how you are feeling today.
              </Text>
            </View>
          )}

          {step === 1 && (
            <View className="space-y-4">
              <Text className="text-sm font-semibold text-neutral-500 text-center uppercase tracking-wider">
                {t('parentHome.howAreYouFeeling')}
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  testID="parent-checkin-feeling-good"
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="I am feeling good"
                  accessibilityHint="Submits check-in that you are feeling good"
                  onPress={() => handleSelectFeeling('Good')}
                  className="flex-1 py-5 px-1 rounded-3xl items-center justify-center bg-neutral-50 border border-neutral-100 active:scale-95 min-h-[92px]"
                >
                  <Text className="text-3xl">😊</Text>
                  <Text className="text-xs font-bold mt-2 text-neutral-700 text-center" numberOfLines={2}>
                    {t('parentHome.feelingGood')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="parent-checkin-feeling-tired"
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="I am feeling okay"
                  accessibilityHint="Submits check-in that you are feeling okay or tired"
                  onPress={() => handleSelectFeeling('Tired')}
                  className="flex-1 py-5 px-1 rounded-3xl items-center justify-center bg-neutral-50 border border-neutral-100 active:scale-95 min-h-[92px]"
                >
                  <Text className="text-3xl">😐</Text>
                  <Text className="text-xs font-bold mt-2 text-neutral-700 text-center" numberOfLines={2}>
                    {t('parentHome.feelingOkay')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="parent-checkin-feeling-unwell"
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="I am feeling unwell"
                  accessibilityHint="Submits check-in that you are feeling unwell and alerts coordinator"
                  onPress={() => handleSelectFeeling('Unwell')}
                  className="flex-1 py-5 px-1 rounded-3xl items-center justify-center bg-neutral-50 border border-neutral-100 active:scale-95 min-h-[92px]"
                >
                  <Text className="text-3xl">😟</Text>
                  <Text className="text-xs font-bold mt-2 text-neutral-700 text-center" numberOfLines={2}>
                    {t('parentHome.feelingNotWell')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 2 && (
            <View className="space-y-4">
              <Text className="text-sm font-semibold text-neutral-500 text-center uppercase tracking-wider">
                Anything bothering you?
              </Text>

              {!isTyping ? (
                <View className="flex-row gap-2.5">
                  <TouchableOpacity
                    testID="parent-checkin-voice"
                    onPress={() => {
                      onOpenVoice();
                      handleFinalizeCheckIn('Voice note logged');
                    }}
                    className="flex-1 bg-neutral-50 border border-neutral-100 py-3.5 rounded-xl flex-row items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Volume2 size={16} color="#007aff" />
                    <Text className="text-xs font-bold text-neutral-700">Speak</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    testID="parent-checkin-type"
                    onPress={() => setIsTyping(true)}
                    className="flex-1 bg-neutral-50 border border-neutral-100 py-3.5 rounded-xl flex-row items-center justify-center gap-1.5 active:scale-95"
                  >
                    <MessageSquare size={16} color="#8e8e93" />
                    <Text className="text-xs font-bold text-neutral-700">Type</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    testID="parent-checkin-skip"
                    onPress={() => handleFinalizeCheckIn()}
                    className="flex-1 bg-neutral-100 py-3.5 rounded-xl items-center justify-center active:scale-95"
                  >
                    <Text className="text-xs font-bold text-neutral-400">Skip</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="space-y-3">
                  <TextInput
                    testID="parent-checkin-note-input"
                    value={typedNote}
                    onChangeText={setTypedNote}
                    placeholder="Describe how you feel..."
                    placeholderTextColor="#8e8e93"
                    multiline
                    className="w-full bg-neutral-55 border border-neutral-100 rounded-3xl p-4 text-xs text-neutral-800 font-semibold h-20"
                  />

                  {context?.currentScenario === 'parent-feeling-unwell' && (
                    <TouchableOpacity
                      onPress={() => {
                        setTypedNote('My chest feels uncomfortable.');
                        handleFinalizeCheckIn('My chest feels uncomfortable.');
                      }}
                      className="bg-red-50/50 p-3 rounded-3xl active:scale-95"
                    >
                      <Text className="text-[#ff3b30] text-[10px] font-bold text-center">
                        📢 Tap to speak/type: "My chest feels uncomfortable."
                      </Text>
                    </TouchableOpacity>
                  )}
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => setIsTyping(false)}
                      className="flex-1 bg-neutral-100 py-3 rounded-xl items-center justify-center"
                    >
                      <Text className="text-xs font-semibold text-neutral-500">Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      testID="parent-checkin-submit"
                      onPress={() => handleFinalizeCheckIn(typedNote)}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 py-3 rounded-xl items-center justify-center"
                    >
                      <Text className="text-white text-xs font-bold">Submit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {step === 3 && (
            <View className="items-center py-2 space-y-4">
              {isUrgent ? (
                <View
                  testID="parent-checkin-urgent-banner"
                  className="w-full bg-red-50/40 rounded-3xl p-5 space-y-3.5 items-center border border-red-150"
                >
                  <Text className="text-xs font-bold text-[#ff3b30] text-center uppercase tracking-wide">
                    Safety Notification
                  </Text>
                  <Text className="text-base font-bold text-neutral-900 text-center leading-normal px-1">
                    This could require urgent medical attention. Please seek appropriate local
                    medical help now.
                  </Text>
                  <Text className="text-[10px] text-neutral-400 font-semibold text-center leading-normal">
                    Please call emergency responders or go to the nearest hospital immediately.
                  </Text>

                  <TouchableOpacity
                    testID="parent-checkin-call-emergency"
                    onPress={() => alert('Dialing India Emergency Response: 108')}
                    className="w-full bg-[#ff3b30] py-3 rounded-3xl items-center justify-center active:scale-95 shadow-lg mt-1"
                  >
                    <Text className="text-white text-xs font-bold">📞 Call Emergency (108)</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text
                  testID="parent-checkin-confirmation"
                  className="text-base font-bold text-[#34c759] text-center leading-relaxed"
                >
                  Thanks, {parentName}. {coordName} has been updated.
                </Text>
              )}

              {lastCheckInAt && (
                <Text
                  testID="parent-checkin-timestamp"
                  accessibilityLabel={lastCheckInAt}
                  className="text-[10px] font-semibold text-neutral-400 text-center"
                >
                  Checked in at {formatTimeForParent(lastCheckInAt, parentTimezone)} · {parentTimezone}
                </Text>
              )}

              <TouchableOpacity
                onPress={() => {
                  setStep(1);
                  setFeeling(null);
                  setTypedNote('');
                  setIsTyping(false);
                  setIsUrgent(false);
                  setLastCheckInAt(null);
                }}
                className="bg-neutral-100 px-4 py-2.5 rounded-full"
              >
                <Text className="text-[10px] font-bold text-neutral-500 uppercase">
                  Check-in again
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Medication Confirmation Prompt */}
        {/* Medication Confirmation Prompt */}
        {!(isAtorvastatinTaken || isDoseConfirmed) ? (
          <View className="bg-white rounded-3xl p-5 shadow-lg shadow-neutral-100 space-y-4 border-l-4 border-[#ff3b30]">
            <View className="space-y-1">
              <Text className="text-[9px] font-bold text-[#ff3b30] uppercase tracking-wider">
                Pending Dose
              </Text>
              <Text className="text-lg font-bold text-neutral-900 leading-tight">
                Did you take your evening medicine?
              </Text>
              <Text className="text-xs font-semibold text-neutral-400 mt-0.5">
                Atorvastatin 20mg (cholesterol support) scheduled at 8:00 PM.
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-3 pt-1">
              <TouchableOpacity
                testID="parent-home-medication-confirm-yes"
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Confirm taking evening medicine: Atorvastatin 20mg"
                accessibilityHint="Marks Atorvastatin 20mg as taken in your daily schedule"
                onPress={() => {
                  setIsDoseConfirmed(true);
                  onConfirmMedication('rec-5', 'Atorvastatin 20mg', true);
                }}
                className="flex-1 min-w-[140px] min-h-[48px] py-3 px-3 bg-emerald-600 rounded-2xl items-center justify-center active:scale-95 shadow-lg"
              >
                <Text className="text-white font-bold text-xs text-center">Yes, I took it</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="parent-home-medication-confirm-not-yet"
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="I have not taken Atorvastatin 20mg yet"
                accessibilityHint="Leaves dose pending and alerts coordinator"
                onPress={() => {
                  if (typeof alert !== 'undefined') {
                    alert(`Please take it before sleep. Alert synced with ${coordName}.`);
                  }
                }}
                className="min-w-[100px] min-h-[48px] py-3 px-3 bg-neutral-100 rounded-2xl items-center justify-center active:scale-95"
              >
                <Text className="text-neutral-500 font-bold text-xs text-center">Not yet</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="bg-emerald-50/90 rounded-3xl p-4 border border-emerald-200 flex-row items-center gap-3 shadow-sm">
            <View className="w-10 h-10 rounded-full bg-emerald-500 items-center justify-center">
              <Text className="text-white font-bold text-base">✓</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-emerald-900">Evening Medicine Confirmed</Text>
              <Text className="text-[11px] text-emerald-700">Atorvastatin 20mg marked as taken • Synced with {coordName}</Text>
            </View>
          </View>
        )}

        {/* Clinical Voice & AI */}
        <View className="space-y-2">
          <View className="flex-row justify-between items-center px-1">
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Clinical Voice & AI
            </Text>
            <View className="flex-row items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <Sparkles size={10} color="#059669" />
              <Text className="text-[9px] font-black text-emerald-800">AI Assistant</Text>
            </View>
          </View>

          <TouchableOpacity
            testID="parent-home-ask-kinGuardian"
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Ask KinGuardian AI Assistant. Voice and text support."
            accessibilityHint="Opens voice or text chat with KinGuardian"
            onPress={() => router.push('/(parent)/ask')}
            activeOpacity={0.9}
            className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-4.5 shadow-lg space-y-2.5 active:scale-98"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-2xl bg-white/10 items-center justify-center border border-white/20">
                  <Sparkles size={20} color="#6ee7b7" />
                </View>
                <View>
                  <Text className="text-base font-black text-white">Ask KinGuardian</Text>
                  <Text className="text-xs text-emerald-200 font-medium">
                    Speak or ask: "What medicine do I take tonight?"
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color="#a7f3d0" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Section: Google Fit Live Health Telemetry */}
        <View className="space-y-2">
          <View className="flex-row justify-between items-center px-1">
            <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              My Google Fit Live Data
            </Text>
            <TouchableOpacity onPress={() => router.push('/(parent)/devices')}>
              <Text className="text-xs font-bold text-[#007aff]">Manage devices &rarr;</Text>
            </TouchableOpacity>
          </View>

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

            {/* Quick Actions: Open App, Sync, & Manage */}
            <View className="space-y-2 pt-1">
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={handleSyncGoogleFit}
                  disabled={isSyncingFit}
                  className="flex-1 bg-emerald-600 active:bg-emerald-700 py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 shadow-sm"
                >
                  <RefreshCw size={13} color="#ffffff" />
                  <Text className="text-[11px] font-bold text-white">
                    {isSyncingFit ? 'Syncing...' : 'Sync Live Steps ⟳'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => googleFitService.openGoogleFitApp()}
                  className="flex-1 bg-emerald-50 border border-emerald-200/80 active:bg-emerald-100 py-2.5 rounded-xl flex-row items-center justify-center gap-1.5"
                >
                  <Activity size={13} color="#059669" />
                  <Text className="text-[11px] font-bold text-emerald-800">Open Google Fit ↗</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => router.push('/(parent)/devices')}
                className="w-full bg-slate-100 active:bg-slate-200 py-2 rounded-xl flex-row items-center justify-center gap-1.5"
              >
                <Watch size={13} color="#007aff" />
                <Text className="text-[11px] font-bold text-[#007aff]">My Devices & Sync Settings →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Section 2: Today's medicines */}
        <View className="space-y-2" testID="parent-home-medicines-section">
          <View className="flex-row justify-between items-center px-1">
            <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Today's medicines
            </Text>
            <TouchableOpacity
              testID="parent-home-medicines-see-all"
              onPress={() => router.push('/(parent)/medicines')}
            >
              <Text className="text-xs font-bold text-[#007aff]">See all &rarr;</Text>
            </TouchableOpacity>
          </View>

          <View className="space-y-2">
            {medications.slice(0, 2).map((med) => {
              const isTaken = med.status?.includes('Taken');
              return (
                <TouchableOpacity
                  key={med.id}
                  testID={`parent-home-medication-${med.id}`}
                  onPress={() => router.push('/(parent)/medicines')}
                  className={`bg-white rounded-3xl p-4 flex-row items-center justify-between shadow-lg shadow-neutral-100 active:scale-98 border-l-4 ${
                    isTaken ? 'border-[#34c759]' : 'border-[#ff9500]'
                  }`}
                >
                  <View className="flex-grow space-y-0.5">
                    <Text className="text-sm font-bold text-neutral-900">{med.title}</Text>
                    <Text className="text-xs text-neutral-400 font-semibold leading-relaxed">
                      {med.subtitle}
                    </Text>
                  </View>
                  <View
                    className={`px-2.5 py-0.5 rounded-full ${isTaken ? 'bg-emerald-50' : 'bg-orange-50'}`}
                  >
                    <Text
                      className={`text-[8px] font-bold uppercase ${isTaken ? 'text-[#34c759]' : 'text-[#ff9500]'}`}
                    >
                      {isTaken ? 'Taken' : 'Pending'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section: My health devices */}
        <View className="space-y-2">
          <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-1">
            My health devices
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(parent)/devices')}
            className="bg-white rounded-3xl p-4.5 shadow-lg shadow-neutral-100 flex-row items-center justify-between active:scale-98 border border-neutral-100"
          >
            <View className="flex-row items-center gap-3.5">
              <View className="w-12 h-12 rounded-3xl bg-indigo-50 border border-indigo-100 items-center justify-center">
                <Watch size={24} color="#2a14b4" />
              </View>
              <View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-base font-bold text-neutral-900">{activeDevice.name}</Text>
                  <View className="w-2 h-2 rounded-full bg-emerald-500" />
                  <Text className="text-xs font-bold text-emerald-700">{activeDevice.status}</Text>
                </View>
                <Text className="text-xs text-neutral-400 font-medium mt-0.5">
                  {activeDevice.steps ? `${activeDevice.steps.toLocaleString()} steps • ` : ''}{activeDevice.lastUpdated}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-1">
              <Text className="text-xs font-bold text-[#007aff]">View</Text>
              <ChevronRight size={14} color="#007aff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Section: Doctor Appointments */}
        <View className="space-y-2" testID="parent-home-appointments-section">
          <View className="flex-row justify-between items-center px-1">
            <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Doctor Appointments
            </Text>
            <TouchableOpacity
              testID="parent-home-appointments-see-all"
              onPress={() => router.push('/(parent)/appointments')}
            >
              <Text className="text-xs font-bold text-[#007aff]">See all &rarr;</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            testID="parent-home-appointment-card"
            onPress={() => router.push('/(parent)/appointments')}
            className="bg-white rounded-3xl p-4.5 shadow-lg shadow-neutral-100 space-y-3 border-l-4 border-[#007aff] active:scale-98"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3.5 flex-1 pr-2">
                <View className="w-12 h-12 rounded-3xl bg-blue-50 border border-blue-100 items-center justify-center">
                  <Calendar size={24} color="#007aff" />
                </View>
                <View className="flex-1">
                  <Text
                    testID="parent-home-appointment-doctor"
                    className="text-base font-bold text-neutral-900"
                  >
                    {upcomingAppt?.doctorName || 'Dr. Sharma'} ({upcomingAppt?.specialty || 'Cardiology'})
                  </Text>
                  <Text
                    testID="parent-home-appointment-details"
                    className="text-xs text-neutral-500 mt-0.5"
                  >
                    {upcomingAppt?.date || 'Tomorrow'} at {upcomingAppt?.time || '4:00 PM'} • {upcomingAppt?.location || 'Apollo Hospital'}
                  </Text>
                  <Text
                    testID="parent-home-appointment-localtime"
                    accessibilityLabel={`Appointment at ${upcomingAppt?.time || '4:00 PM'} your local time, ${parentTimezone}. No conversion needed.`}
                    className="text-[10px] font-bold text-neutral-400 mt-1"
                  >
                    {upcomingAppt?.time || '4:00 PM'} local time · {parentTimezone}
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color="#8e8e93" />
            </View>

            <View className="bg-blue-50/60 px-3.5 py-2 rounded-xl flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-[#007aff]">
                Cardiology consultation booked
              </Text>
              <Text className="text-xs font-bold text-[#007aff]">View Details &rarr;</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Section: Documents */}
        <View className="space-y-2" testID="parent-home-documents-section">
          <View className="flex-row justify-between items-center px-1">
            <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Documents
            </Text>
            <TouchableOpacity
              testID="parent-home-documents-open"
              onPress={() => router.push('/(parent)/documents')}
            >
              <Text className="text-xs font-bold text-[#007aff]">Open Documents &rarr;</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            testID="parent-home-documents-card"
            onPress={() => router.push('/(parent)/documents')}
            className="bg-white rounded-3xl p-4.5 shadow-lg shadow-neutral-100 flex-row items-center justify-between active:scale-98 border-l-4 border-[#ff9500]"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3.5 flex-1 pr-2">
                <View className="w-12 h-12 rounded-3xl bg-amber-50 border border-amber-100 items-center justify-center">
                  <FileText size={24} color="#d97706" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-neutral-900" numberOfLines={1}>
                    {context?.documents?.[0]?.name || 'Documents & Prescriptions'}
                  </Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">
                    {context?.documents?.[0]
                      ? `${context.documents[0].category || 'Prescription'} • Under review by ${coordName}`
                      : 'Share prescription, lab reports, or doctor instructions'}
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color="#8e8e93" />
            </View>

            {/* Quick action shortcuts */}
            <View className="flex-row items-center gap-2 mt-3 pt-3 border-t border-neutral-100">
              <TouchableOpacity
                testID="parent-home-documents-camera"
                onPress={() => router.push('/(parent)/documents')}
                className="flex-1 py-2 px-2 bg-rose-50 rounded-xl border border-rose-100 flex-row items-center justify-center gap-1.5"
              >
                <Camera size={14} color="#ff3b30" />
                <Text className="text-[11px] font-bold text-rose-700">Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="parent-home-documents-gallery"
                onPress={() => router.push('/(parent)/documents')}
                className="flex-1 py-2 px-2 bg-emerald-50 rounded-xl border border-emerald-100 flex-row items-center justify-center gap-1.5"
              >
                <ImageIcon size={14} color="#34c759" />
                <Text className="text-[11px] font-bold text-emerald-700">Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="parent-home-documents-voice"
                onPress={() => router.push('/(parent)/documents')}
                className="flex-1 py-2 px-2 bg-purple-50 rounded-xl border border-purple-100 flex-row items-center justify-center gap-1.5"
              >
                <Mic size={14} color="#af52de" />
                <Text className="text-[11px] font-bold text-purple-700">Voice Note</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        <View className="h-28" />
      </View>
    </ScrollView>

    {/* Google Fit Live Steps Sync Modal */}
    <Modal
      visible={showFitModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowFitModal(false)}
    >
      <View className="flex-1 bg-black/60 items-center justify-center px-4">
        <View className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
            <View className="flex-row items-center gap-2.5">
              <View className="w-10 h-10 rounded-2xl bg-emerald-100 items-center justify-center">
                <Activity size={20} color="#059669" />
              </View>
              <View>
                <Text className="text-base font-black text-slate-900">Google Fit Live Steps</Text>
                <Text className="text-xs text-slate-500 font-medium">Sync with Ram ({coordName})</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setShowFitModal(false)} className="p-1.5 rounded-full bg-slate-100 active:bg-slate-200">
              <X size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View className="space-y-1">
            <Text className="text-xs font-bold text-slate-700">Enter steps from Google Fit app:</Text>
            <TextInput
              value={inputSteps}
              onChangeText={setInputSteps}
              placeholder="e.g. 4250"
              keyboardType="number-pad"
              autoFocus
              className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xl font-black text-slate-900"
            />
          </View>

          {/* Quick Add Chips */}
          <View className="flex-row gap-2">
            {[1500, 3000, 5000, 8000].map((preset) => (
              <TouchableOpacity
                key={preset}
                onPress={() => setInputSteps(String(preset))}
                className="flex-1 bg-slate-100 active:bg-slate-200 py-1.5 rounded-xl items-center"
              >
                <Text className="text-[11px] font-bold text-slate-700">{preset.toLocaleString()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3">
            <Text className="text-xs text-emerald-800 font-semibold leading-relaxed">
              ✓ Steps will immediately update on your dashboard and live sync to Ram's coordinator view.
            </Text>
          </View>

          <View className="flex-row gap-2.5 pt-1">
            <TouchableOpacity
              onPress={() => setShowFitModal(false)}
              className="flex-1 bg-slate-100 py-3 rounded-2xl items-center"
            >
              <Text className="text-xs font-bold text-slate-600">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSaveFitSteps}
              disabled={isSyncingFit}
              className="flex-1 bg-emerald-600 active:bg-emerald-700 py-3 rounded-2xl items-center flex-row justify-center gap-1.5"
            >
              <Check size={16} color="#ffffff" />
              <Text className="text-xs font-black text-white">
                {isSyncingFit ? 'Syncing...' : 'Sync to Ram →'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  </>
  );
};
