import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, Sparkles, ShieldAlert, TrendingUp, Calendar } from 'lucide-react-native';
import { HealthObservation } from '../types';

interface TransparencyInsightScreenProps {
  observation: HealthObservation;
  onBack: () => void;
  onAskFollowUp: (query: string) => void;
}

export const TransparencyInsightScreen: React.FC<TransparencyInsightScreenProps> = ({
  observation,
  onBack,
  onAskFollowUp
}) => {
  const isDad =
    observation.id === 'dad' || observation.title?.toLowerCase().includes('dad') || true;

  return (
    <ScrollView className="flex-1 bg-[#fbfaf7]">
      {/* Header Bar */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#e2dfd9] bg-[#fbfaf7]">
        <TouchableOpacity onPress={onBack} className="p-2 bg-slate-100 rounded-full">
          <ArrowLeft size={16} color="#464554" />
        </TouchableOpacity>
        <Text className="text-sm font-black text-[#2a14b4] uppercase tracking-wider">Insights</Text>
        <View className="w-9 h-9" />
      </View>

      <View className="p-5 space-y-6">
        {/* Intro Reasoner transparency splash */}
        <View className="bg-white rounded-3xl p-5 border border-[#e2dfd9] shadow-sm space-y-3">
          <View className="flex-row items-center gap-1.5">
            <Sparkles size={14} color="#2a14b4" fill="#2a14b4" />
            <Text className="text-[10px] font-black uppercase tracking-wider text-[#2a14b4]">
              KinGuardian Clinical Intelligence
            </Text>
          </View>

          <Text className="text-lg font-black text-slate-900 leading-snug">
            {isDad ? "Dad's Health Review" : "Mom's Health Review"}
          </Text>
          <Text className="text-xs text-slate-500 font-semibold leading-relaxed">
            Automatic background correlation between wearable telemetry, weather indexes, and
            medication adherence.
          </Text>
        </View>

        {/* SECTION 1: Guardian moments (Important changes) */}
        <View className="space-y-3">
          <View>
            <Text className="text-sm font-black text-[#121c2a] uppercase tracking-wider">
              Guardian moments
            </Text>
            <Text className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              Important changes in risk profiles
            </Text>
          </View>

          <View className="bg-white border border-[#e2dfd9] rounded-3xl p-5 shadow-sm space-y-4">
            <View className="flex-row items-center gap-2">
              <ShieldAlert size={16} color="#ba1a1a" />
              <Text className="text-xs font-black text-slate-800">
                Elevated Blood Pressure spikes
              </Text>
            </View>
            <Text className="text-xs text-slate-600 font-semibold leading-relaxed">
              Dad's systolic blood pressure rose to an average of 140 mmHg over the last three days
              during midday heat peaks.
            </Text>

            {/* Why am I seeing this? */}
            <View className="bg-[#fbfaf7] border border-slate-100 rounded-2xl p-4.5 space-y-1.5">
              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Why am I seeing this?
              </Text>
              <Text className="text-xs text-slate-700 font-bold leading-relaxed">
                “Based on 17 readings collected over 30 days.”
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION 2: Health observations (Trends) */}
        <View className="space-y-3">
          <View>
            <Text className="text-sm font-black text-[#121c2a] uppercase tracking-wider">
              Health observations
            </Text>
            <Text className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              Ingested device metrics & trends
            </Text>
          </View>

          <View className="bg-white border border-[#e2dfd9] rounded-3xl p-5 shadow-sm space-y-4">
            <View className="flex-row items-center gap-2">
              <TrendingUp size={16} color="#2a14b4" />
              <Text className="text-xs font-black text-slate-800">
                Midday Step Drop & Hydration Correlation
              </Text>
            </View>
            <Text className="text-xs text-slate-600 font-semibold leading-relaxed">
              Ramesh's daily activity index dropped 35% on days when the outdoor temperature index
              in Chennai exceeded 36°C.
            </Text>

            {/* Why am I seeing this? */}
            <View className="bg-[#fbfaf7] border border-slate-100 rounded-2xl p-4.5 space-y-1.5">
              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Why am I seeing this?
              </Text>
              <Text className="text-xs text-slate-700 font-bold leading-relaxed">
                “Based on Apple Watch activity streams matched with Chennai weather feed over 7
                days.”
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION 3: Suggested actions (Possible next steps) */}
        <View className="space-y-3">
          <View>
            <Text className="text-sm font-black text-[#121c2a] uppercase tracking-wider">
              Suggested actions
            </Text>
            <Text className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              Recommended care coordination stubs
            </Text>
          </View>

          <View className="bg-white border border-[#e2dfd9] rounded-3xl p-5 shadow-sm space-y-4">
            <View className="flex-row items-center gap-2">
              <Calendar size={16} color="#059669" />
              <Text className="text-xs font-black text-slate-800">
                Schedule Cardiology Video Consultation
              </Text>
            </View>
            <Text className="text-xs text-slate-600 font-semibold leading-relaxed">
              Log a cardiology review with Dr. Sharma to align on fluid intake guidance and morning
              diuretic timing adjustments.
            </Text>

            {/* Why am I seeing this? */}
            <View className="bg-[#fbfaf7] border border-slate-100 rounded-2xl p-4.5 space-y-1.5">
              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Why am I seeing this?
              </Text>
              <Text className="text-xs text-slate-700 font-bold leading-relaxed">
                “Triggered by 3 readings exceeding 140 mmHg systolic in a 72-hour window.”
              </Text>
            </View>
          </View>
        </View>

        {/* Consulting interactive query chip */}
        <TouchableOpacity
          onPress={() =>
            onAskFollowUp("Explain the correlation between heat peaks and Dad's BP rise.")
          }
          className="w-full bg-[#2a14b4] py-4 rounded-2xl items-center justify-center shadow-md active:scale-98 mb-12"
        >
          <Text className="text-white font-black text-xs uppercase tracking-wider">
            Consult AI Co-Pilot regarding these trends
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};
