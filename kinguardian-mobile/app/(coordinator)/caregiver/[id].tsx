import { useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { AppContext } from '../../../src/store/AppContext';
import { DeviceFrame } from '../../../src/components/DeviceFrame';
import { SimulatorControls } from '../../../src/components/SimulatorControls';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Phone, MessageSquare, PlusCircle, CheckCircle } from 'lucide-react-native';

export default function CaregiverProfileRoute() {
  const context = useContext(AppContext);
  const router = useRouter();
  const { id } = useLocalSearchParams();

  if (!context) return null;

  const memberId = typeof id === 'string' ? id : 'priya';
  const member = context.familyMembers.find((m) => m.id === memberId) || {
    id: 'priya',
    name: 'Priya',
    relationship: 'Family Caregiver',
    avatarUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=256',
    city: 'Bengaluru',
    country: 'India'
  };

  const responsibilities = [
    'Doctor visits coordination & transport accompaniment',
    'Medication pickup & refill adherence confirmation',
    'Clinical reports scanning & digital vaults uploads',
    'Routine home safety checks & daily wellbeing logs'
  ];

  return (
    <DeviceFrame>
      <View className="flex-1 relative bg-[#fbfaf7]">
        {/* Header */}
        <View className="px-6 py-5 border-b border-[#e2dfd9] bg-[#fbfaf7] flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-1 hover:bg-slate-100 rounded-full"
          >
            <ArrowLeft size={20} color="#121c2a" />
          </TouchableOpacity>
          <View>
            <Text className="text-lg font-black text-[#121c2a]">Caregiver Profile</Text>
            <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Care Circle Network
            </Text>
          </View>
        </View>

        <ScrollView className="flex-1 px-6 pt-6 space-y-6">
          {/* Caregiver Identity Card */}
          <View className="bg-white border border-[#e2dfd9] rounded-[32px] p-6 shadow-sm items-center space-y-4">
            <Image
              source={{ uri: member.avatarUrl }}
              className="w-24 h-24 rounded-full border-4 border-[#dee9fc] shadow-xs"
            />
            <View className="items-center space-y-1">
              <Text className="text-2xl font-black text-slate-900">{member.name}</Text>
              <View className="bg-[#eff4ff] px-3.5 py-0.5 rounded-full">
                <Text className="text-[10px] font-black text-[#2a14b4] uppercase">
                  {member.relationship}
                </Text>
              </View>
              <Text className="text-xs text-slate-400 font-bold mt-0.5">
                📍 {member.city}, {member.country || 'India'}
              </Text>
            </View>
          </View>

          {/* Responsibilities Checklist */}
          <View className="space-y-3">
            <Text className="text-xs font-black uppercase text-slate-400 tracking-wider">
              Core Responsibilities
            </Text>
            <View className="bg-white border border-[#e2dfd9] rounded-3xl p-5 shadow-sm space-y-4.5">
              {responsibilities.map((resp, index) => (
                <View key={index} className="flex-row items-start gap-3">
                  <View className="pt-0.5">
                    <CheckCircle size={14} color="#059669" />
                  </View>
                  <Text className="text-xs text-slate-600 font-bold leading-relaxed flex-1">
                    {resp}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Action CTAs */}
          <View className="space-y-3 pt-2">
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => context.showToast(`Dialing Priya (+91 98765 43210)...`)}
                className="flex-1 bg-[#2a14b4] py-4 rounded-2xl flex-row items-center justify-center gap-2 active:scale-98 shadow-md"
              >
                <Phone size={16} color="#ffffff" />
                <Text className="text-white font-black text-xs uppercase tracking-wider">Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  context.setAskAIQuery(`Ask Priya about Dad's medicines`);
                  context.setAskAIOpen(true);
                  router.push('/(coordinator)/ask');
                }}
                className="flex-1 bg-white border border-[#dee9fc] py-4 rounded-2xl flex-row items-center justify-center gap-2 active:scale-98"
              >
                <MessageSquare size={16} color="#2a14b4" />
                <Text className="text-[#2a14b4] font-black text-xs uppercase tracking-wider">
                  Message
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => context.showToast('Opening task planner assignment suite...')}
              className="w-full bg-slate-100 border border-slate-200 py-4.5 rounded-2xl flex-row items-center justify-center gap-2 active:scale-98"
            >
              <PlusCircle size={16} color="#708090" />
              <Text className="text-slate-600 font-black text-xs uppercase tracking-wider">
                Assign task
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
