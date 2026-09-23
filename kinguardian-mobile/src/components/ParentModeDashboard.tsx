import React, { useState, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { MessageSquare, Volume2, Bell, Watch, ChevronRight, Calendar, FileText, Sparkles } from 'lucide-react-native';

import { HealthRecordItem } from '../types';
import { t } from '../i18n';
import { AppContext } from '../store/AppContext';

interface ParentModeDashboardProps {
  medications: HealthRecordItem[];
  onConfirmMedication: (id: string, name: string, taken: boolean) => void;
  onCheckIn: (status: 'Good' | 'Tired' | 'Unwell') => void;
  onOpenVoice: () => void;
  dadStatus: string;
  isAtorvastatinTaken: boolean;
  onOpenNotifications: () => void;
  unreadCount: number;
}

export const ParentModeDashboard: React.FC<ParentModeDashboardProps> = ({
  medications,
  onConfirmMedication,
  onCheckIn,
  onOpenVoice,
  isAtorvastatinTaken,
  onOpenNotifications,
  unreadCount
}) => {
  const router = useRouter();
  const context = useContext(AppContext);
  const coordName = context?.coordinatorName || 'Anjali';
  const parentName = context?.currentUser?.name || 'Dad';

  // Check-in state variables
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [feeling, setFeeling] = useState<'Good' | 'Tired' | 'Unwell' | null>(null);
  const [typedNote, setTypedNote] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);

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
                  onPress={() => handleSelectFeeling('Good')}
                  className="flex-1 py-6 rounded-3xl items-center justify-center bg-neutral-50 border border-neutral-100 active:scale-95"
                >
                  <Text className="text-3xl">😊</Text>
                  <Text className="text-xs font-bold mt-2 text-neutral-700">
                    {t('parentHome.feelingGood')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSelectFeeling('Tired')}
                  className="flex-1 py-6 rounded-3xl items-center justify-center bg-neutral-50 border border-neutral-100 active:scale-95"
                >
                  <Text className="text-3xl">😐</Text>
                  <Text className="text-xs font-bold mt-2 text-neutral-700">
                    {t('parentHome.feelingOkay')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSelectFeeling('Unwell')}
                  className="flex-1 py-6 rounded-3xl items-center justify-center bg-neutral-50 border border-neutral-100 active:scale-95"
                >
                  <Text className="text-3xl">😟</Text>
                  <Text className="text-xs font-bold mt-2 text-neutral-700">
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
                    onPress={() => setIsTyping(true)}
                    className="flex-1 bg-neutral-50 border border-neutral-100 py-3.5 rounded-xl flex-row items-center justify-center gap-1.5 active:scale-95"
                  >
                    <MessageSquare size={16} color="#8e8e93" />
                    <Text className="text-xs font-bold text-neutral-700">Type</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleFinalizeCheckIn()}
                    className="flex-1 bg-neutral-100 py-3.5 rounded-xl items-center justify-center active:scale-95"
                  >
                    <Text className="text-xs font-bold text-neutral-400">Skip</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="space-y-3">
                  <TextInput
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
                <View className="w-full bg-red-50/40 rounded-3xl p-5 space-y-3.5 items-center border border-red-150">
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
                    onPress={() => alert('Dialing India Emergency Response: 108')}
                    className="w-full bg-[#ff3b30] py-3 rounded-3xl items-center justify-center active:scale-95 shadow-lg mt-1"
                  >
                    <Text className="text-white text-xs font-bold">📞 Call Emergency (108)</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text className="text-base font-bold text-[#34c759] text-center leading-relaxed">
                  Thanks, {parentName}. {coordName} has been updated.
                </Text>
              )}

              <TouchableOpacity
                onPress={() => {
                  setStep(1);
                  setFeeling(null);
                  setTypedNote('');
                  setIsTyping(false);
                  setIsUrgent(false);
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
        {!isAtorvastatinTaken && (
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
            <View className="flex-row gap-3 pt-1">
              <TouchableOpacity
                onPress={() => onConfirmMedication('rec-5', 'Atorvastatin 20mg', true)}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-3xl items-center justify-center active:scale-95 shadow-lg"
              >
                <Text className="text-white font-bold text-xs">Yes, I took it</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => alert(`Please take it before sleep. Alert synced with ${coordName}.`)}
                className="w-1/3 py-3 bg-neutral-100 rounded-3xl items-center justify-center active:scale-95"
              >
                <Text className="text-neutral-500 font-bold text-xs">Not yet</Text>
              </TouchableOpacity>
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

        {/* Section 2: Today's medicines */}
        <View className="space-y-2">
          <View className="flex-row justify-between items-center px-1">
            <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Today's medicines
            </Text>
            <TouchableOpacity onPress={() => router.push('/(parent)/medicines')}>
              <Text className="text-xs font-bold text-[#007aff]">See all &rarr;</Text>
            </TouchableOpacity>
          </View>

          <View className="space-y-2">
            {medications.slice(0, 2).map((med) => {
              const isTaken = med.status?.includes('Taken');
              return (
                <TouchableOpacity
                  key={med.id}
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
                  <Text className="text-base font-bold text-neutral-900">Apple Watch</Text>
                  <View className="w-2 h-2 rounded-full bg-emerald-500" />
                  <Text className="text-xs font-bold text-emerald-700">Connected</Text>
                </View>
                <Text className="text-xs text-neutral-400 font-medium mt-0.5">
                  Last updated 8 minutes ago
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
        <View className="space-y-2">
          <View className="flex-row justify-between items-center px-1">
            <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Doctor Appointments
            </Text>
            <TouchableOpacity onPress={() => router.push('/(parent)/appointments')}>
              <Text className="text-xs font-bold text-[#007aff]">See all &rarr;</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(parent)/appointments')}
            className="bg-white rounded-3xl p-4.5 shadow-lg shadow-neutral-100 space-y-3 border-l-4 border-[#007aff] active:scale-98"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3.5 flex-1 pr-2">
                <View className="w-12 h-12 rounded-3xl bg-blue-50 border border-blue-100 items-center justify-center">
                  <Calendar size={24} color="#007aff" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-neutral-900">
                    {upcomingAppt?.doctorName || 'Dr. Sharma'} ({upcomingAppt?.specialty || 'Cardiology'})
                  </Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">
                    {upcomingAppt?.date || 'Tomorrow'} at {upcomingAppt?.time || '4:00 PM'} • {upcomingAppt?.location || 'Apollo Hospital'}
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
        <View className="space-y-2">
          <View className="flex-row justify-between items-center px-1">
            <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Documents
            </Text>
            <TouchableOpacity onPress={() => router.push('/(parent)/documents')}>
              <Text className="text-xs font-bold text-[#007aff]">Open Documents &rarr;</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(parent)/documents')}
            className="bg-white rounded-3xl p-4.5 shadow-lg shadow-neutral-100 flex-row items-center justify-between active:scale-98 border-l-4 border-[#ff9500]"
          >
            <View className="flex-row items-center gap-3.5 flex-1 pr-2">
              <View className="w-12 h-12 rounded-3xl bg-amber-50 border border-amber-100 items-center justify-center">
                <FileText size={24} color="#d97706" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-neutral-900" numberOfLines={1}>
                  {context?.documents?.[0]?.name || 'Documents'}
                </Text>
                <Text className="text-xs text-neutral-500 mt-0.5">
                  {context?.documents?.[0]
                    ? `${context.documents[0].category || 'Prescription'} • Under review by ${coordName}`
                    : '📷 Take Photo of Prescription, lab reports, or receipts'}
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color="#8e8e93" />
          </TouchableOpacity>
        </View>

        <View className="h-28" />
      </View>
    </ScrollView>

  );
};
